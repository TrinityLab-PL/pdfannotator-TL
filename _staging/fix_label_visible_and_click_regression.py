#!/usr/bin/env python3
"""
Fix H1: Po redrawOneAnnotation w showTextboxEditor ukryć nową etykietę (ramka bez duplikatu tekstu).
Fix H2: ignoreNextTextboxClick tylko gdy klik w textbox (nie gdy klik w pustym miejscu - tworzenie nowego).
+ minimalna instrumentacja (logi) dla weryfikacji.
Edycja: js_new/pdfannotator_new.v00054.js. Uruchomić z katalogu Moodle.
"""
import os

root = os.getcwd()
JS = os.path.join(root, 'mod', 'pdfannotator', 'js_new', 'pdfannotator_new.v00054.js')

with open(JS, 'r', encoding='utf-8') as f:
    js = f.read()

# --- Fix H1: po redraw ukryj nową etykietę (żeby nie było tekstu w tle pod edytorem)
old_redraw = """        annotationData.width = editor.offsetWidth / (state.scale || 1);
        annotationData.height = editor.offsetHeight / (state.scale || 1);
        redrawOneAnnotation(pageNumber, annotationData.uuid, annotationData);
        editor.addEventListener('mousedown', function (event) { event.stopPropagation(); });"""
new_redraw = """        annotationData.width = editor.offsetWidth / (state.scale || 1);
        annotationData.height = editor.offsetHeight / (state.scale || 1);
        var _repl = redrawOneAnnotation(pageNumber, annotationData.uuid, annotationData);
        if (_repl) {
            var _lbl = _repl.getAttr('textboxLabelEl');
            if (_lbl) { _lbl.style.visibility = 'hidden'; }
        }
        editor.addEventListener('mousedown', function (event) { event.stopPropagation(); });"""
if old_redraw not in js:
    raise SystemExit('H1: redraw block not found')
js = js.replace(old_redraw, new_redraw, 1)

# --- Fix H2: tylko gdy klik w textbox zjadaj klik (ignoreNext); przy kliku w pustym miejscu pozwól showNewTextboxEditor
old_textbox_block = """            if (tool === 'textbox' && pointer && !draftRect) {
                if (state.ignoreNextTextboxClick) {
                    state.ignoreNextTextboxClick = false;
                    return;
                }
                var domTarget = event && event.evt && event.evt.target;
                if (domTarget && domTarget.closest && (domTarget.closest('.tl-inline-text-editor') || domTarget.closest('.tl-textbox-label') || domTarget.closest('.tl-save-textbox'))) {
                    return;
                }
                var pageState = getPageState(pageNumber);
                var hit = (pageState && pageState.annotationLayer)
                    ? pageState.annotationLayer.getIntersection(pointer)
                    : stage.getIntersection(pointer);
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
                if (!hitGroup && pageState && pageState.annotationLayer) {
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
                    if (data && data.type === 'textbox') {
                        selectAnnotation(pageNumber, hitGroup);
                        return;
                    }
                    if (data && data.type !== 'textbox') {
                        selectAnnotation(pageNumber, hitGroup);
                        setTool('cursor');
                        return;
                    }
                }
                showNewTextboxEditor(pageNumber, pointer.x, pointer.y);
                return;
            }"""
new_textbox_block = """            if (tool === 'textbox' && pointer && !draftRect) {
                var domTarget = event && event.evt && event.evt.target;
                if (domTarget && domTarget.closest && (domTarget.closest('.tl-inline-text-editor') || domTarget.closest('.tl-textbox-label') || domTarget.closest('.tl-save-textbox'))) {
                    return;
                }
                var pageState = getPageState(pageNumber);
                var hit = (pageState && pageState.annotationLayer)
                    ? pageState.annotationLayer.getIntersection(pointer)
                    : stage.getIntersection(pointer);
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
                if (!hitGroup && pageState && pageState.annotationLayer) {
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
                if (state.ignoreNextTextboxClick) {
                    state.ignoreNextTextboxClick = false;
                    if (hitGroup) {
                        var ignData = hitGroup.getAttr('annotationData');
                        if (ignData && ignData.type === 'textbox') { return; }
                    }
                }
                if (hitGroup) {
                    var data = hitGroup.getAttr('annotationData');
                    if (data && data.type === 'textbox') {
                        selectAnnotation(pageNumber, hitGroup);
                        return;
                    }
                    if (data && data.type !== 'textbox') {
                        selectAnnotation(pageNumber, hitGroup);
                        setTool('cursor');
                        return;
                    }
                }
                showNewTextboxEditor(pageNumber, pointer.x, pointer.y);
                return;
            }"""
if old_textbox_block not in js:
    raise SystemExit('H2: textbox mouseup block not found')
js = js.replace(old_textbox_block, new_textbox_block, 1)

with open(JS, 'w', encoding='utf-8') as f:
    f.write(js)

print('fix_label_visible_and_click_regression: OK')
