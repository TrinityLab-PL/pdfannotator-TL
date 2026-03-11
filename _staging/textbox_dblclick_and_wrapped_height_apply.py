#!/usr/bin/env python3
"""
Plan: dwuklik w mouseup (state._lastTextboxClick), Bug 3 pomiar wysokości zawijania.
Uruchomić z katalogu Moodle. Modyfikuje: js_new/pdfannotator_new.v00054.js
"""
import os

root = os.getcwd()
JS = os.path.join(root, 'mod', 'pdfannotator', 'js_new', 'pdfannotator_new.v00054.js')

with open(JS, 'r', encoding='utf-8') as f:
    js = f.read()

# --- 1. Bug 4: double-click detection at start of mouseup (after drawing block)
old_after_drawing = """                setTool('cursor');
                return;
            }

            if (tool === 'textbox' && pointer && !draftRect) {"""

new_after_drawing = """                setTool('cursor');
                return;
            }

            if (pointer) {
                var domTarget = event && event.evt && event.evt.target;
                if (!(domTarget && domTarget.closest && (domTarget.closest('.tl-inline-text-editor') || domTarget.closest('.tl-save-textbox')))) {
                    var pageState = getPageState(pageNumber);
                    if (pageState && pageState.annotationLayer) {
                        var hit = pageState.annotationLayer.getIntersection(pointer);
                        var hitGroup = null;
                        if (hit) {
                            var n = hit;
                            while (n) {
                                if (n.getAttr && n.getAttr('annotationData')) {
                                    hitGroup = n;
                                    break;
                                }
                                n = n.getParent && n.getParent();
                            }
                        }
                        if (!hitGroup) {
                            var children = pageState.annotationLayer.getChildren();
                            for (var i = children.length - 1; i >= 0; i--) {
                                var gr = children[i];
                                var ad = gr.getAttr && gr.getAttr('annotationData');
                                if (!ad || ad.type !== 'textbox') { continue; }
                                var rect = gr.getClientRect && gr.getClientRect();
                                if (rect && pointer.x >= rect.x && pointer.x <= rect.x + rect.width && pointer.y >= rect.y && pointer.y <= rect.y + rect.height) {
                                    hitGroup = gr;
                                    break;
                                }
                            }
                        }
                        if (hitGroup) {
                            var data = hitGroup.getAttr('annotationData');
                            if (data && data.type === 'textbox' && data.uuid) {
                                var last = state._lastTextboxClick;
                                if (last && last.uuid === data.uuid && (Date.now() - last.time) < 400) {
                                    state._lastTextboxClick = null;
                                    showTextboxEditor(pageNumber, data);
                                    return;
                                }
                                state._lastTextboxClick = { time: Date.now(), pageNumber: pageNumber, uuid: data.uuid };
                            } else {
                                state._lastTextboxClick = null;
                            }
                        } else {
                            state._lastTextboxClick = null;
                        }
                    } else {
                        state._lastTextboxClick = null;
                    }
                }
            } else {
                state._lastTextboxClick = null;
            }

            if (tool === 'textbox' && pointer && !draftRect) {"""

if old_after_drawing not in js:
    raise SystemExit('1. mouseup double-click block not found')
js = js.replace(old_after_drawing, new_after_drawing, 1)

# --- 2. Bug 3: showNewTextboxEditor commit - wrapped height
old_cnew = """            fitTextboxAroundContent(measure);

            var scale = state.scale || 1;
            var annotation = {
                type: 'textbox',
                x: unscaledBoxX,
                y: unscaledBoxY,
                width: Math.max(measure.width, editor.offsetWidth / scale),
                height: Math.max(measure.height, editor.offsetHeight / scale),
                size: editorFontSize,
                font: editorFontFamily,
                color: state.textColor || '#111827',
                content: content
            };"""
new_cnew = """            fitTextboxAroundContent(measure);

            var scale = state.scale || 1;
            var wrappedHeightUnscaled = measure.height;
            (function () {
                var wrapEl = document.createElement('div');
                wrapEl.setAttribute('aria-hidden', 'true');
                wrapEl.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre-wrap;word-wrap:break-word;margin:0;border:none;pointer-events:none;padding:6px;box-sizing:border-box;';
                wrapEl.style.width = editor.offsetWidth + 'px';
                wrapEl.style.fontSize = displayFontSize + 'px';
                wrapEl.style.fontFamily = editorFontFamily + ', sans-serif';
                wrapEl.style.lineHeight = '1.25';
                wrapEl.textContent = content;
                pageElement.appendChild(wrapEl);
                wrappedHeightUnscaled = wrapEl.offsetHeight / scale;
                if (wrapEl.parentNode) { wrapEl.parentNode.removeChild(wrapEl); }
            })();
            var annotation = {
                type: 'textbox',
                x: unscaledBoxX,
                y: unscaledBoxY,
                width: Math.max(measure.width, editor.offsetWidth / scale),
                height: Math.max(measure.height, editor.offsetHeight / scale, wrappedHeightUnscaled),
                size: editorFontSize,
                font: editorFontFamily,
                color: state.textColor || '#111827',
                content: content
            };"""
if old_cnew not in js:
    raise SystemExit('2. showNewTextboxEditor commit block not found')
js = js.replace(old_cnew, new_cnew, 1)

# --- 3. Bug 3: showTextboxEditor commit - wrapped height
old_cshow = """            annotationData.content = editor.value || '';
            annotationData.size = editorFontSize;
            annotationData.font = editorFontFamily;
            fitTextboxAroundContent(annotationData);
            var scale = state.scale || 1;
            annotationData.width = Math.max(annotationData.width, editor.offsetWidth / scale);
            annotationData.height = Math.max(annotationData.height, editor.offsetHeight / scale);
            redrawOneAnnotation(pageNumber, annotationData.uuid, annotationData);"""
new_cshow = """            annotationData.content = editor.value || '';
            annotationData.size = editorFontSize;
            annotationData.font = editorFontFamily;
            fitTextboxAroundContent(annotationData);
            var scale = state.scale || 1;
            var wrappedH = annotationData.height;
            (function () {
                var wrapEl = document.createElement('div');
                wrapEl.setAttribute('aria-hidden', 'true');
                wrapEl.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre-wrap;word-wrap:break-word;margin:0;border:none;pointer-events:none;padding:6px;box-sizing:border-box;';
                wrapEl.style.width = editor.offsetWidth + 'px';
                wrapEl.style.fontSize = displayFontSize + 'px';
                wrapEl.style.fontFamily = editorFontFamily + ', sans-serif';
                wrapEl.style.lineHeight = '1.25';
                wrapEl.textContent = annotationData.content || '';
                pageElement.appendChild(wrapEl);
                wrappedH = wrapEl.offsetHeight / scale;
                if (wrapEl.parentNode) { wrapEl.parentNode.removeChild(wrapEl); }
            })();
            annotationData.width = Math.max(annotationData.width, editor.offsetWidth / scale);
            annotationData.height = Math.max(annotationData.height, editor.offsetHeight / scale, wrappedH);
            redrawOneAnnotation(pageNumber, annotationData.uuid, annotationData);"""
if old_cshow not in js:
    raise SystemExit('3. showTextboxEditor commit block not found')
js = js.replace(old_cshow, new_cshow, 1)

with open(JS, 'w', encoding='utf-8') as f:
    f.write(js)
print('textbox_dblclick_and_wrapped_height_apply: OK')