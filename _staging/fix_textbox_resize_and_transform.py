#!/usr/bin/env python3
"""Fix: 1) textbox editor expands with text when editing; 2) transformer resize saves and updates label; 3) commit uses editor size so last word visible."""
import re

JS = 'mod/pdfannotator/js_new/pdfannotator_new.v00054.js'

def main():
    with open(JS, 'r', encoding='utf-8') as f:
        s = f.read()

    # 1) showTextboxEditor: after pageElement.appendChild(editor) add measureEl + resize on input/keyup
    old1 = """        pageElement.appendChild(editor);
        editor.addEventListener('mousedown', function (event) { event.stopPropagation(); });
        editor.addEventListener('click', function (event) { event.stopPropagation(); });
        editor.addEventListener('dblclick', function (event) { event.stopPropagation(); });
        editor.focus();
        editor.select();

        var committed = false;
        function commit() {
            if (committed) {
                return;
            }
            committed = true;
            annotationData.content = editor.value || '';"""

    new1 = """        pageElement.appendChild(editor);
        var measureEl = document.createElement('div');
        measureEl.setAttribute('aria-hidden', 'true');
        measureEl.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre-wrap;word-wrap:break-word;pointer-events:none;margin:0;border:none;padding:0;';
        measureEl.style.fontSize = displayFontSize + 'px';
        measureEl.style.fontFamily = editorFontFamily + ', sans-serif';
        measureEl.style.lineHeight = '1.2';
        pageElement.appendChild(measureEl);
        function resizeEditorToContent() {
            var val = editor.value || ' ';
            measureEl.textContent = val;
            var contentW = measureEl.offsetWidth;
            var contentH = measureEl.offsetHeight;
            var padX = 12;
            var padY = 10;
            var w = Math.max(80, Math.ceil(contentW) + padX * 2 + 4);
            var h = Math.max(36, Math.ceil(contentH) + padY * 2 + 4);
            editor.style.width = w + 'px';
            editor.style.height = h + 'px';
        }
        editor.addEventListener('input', resizeEditorToContent);
        editor.addEventListener('keyup', resizeEditorToContent);
        resizeEditorToContent();
        editor.addEventListener('mousedown', function (event) { event.stopPropagation(); });
        editor.addEventListener('click', function (event) { event.stopPropagation(); });
        editor.addEventListener('dblclick', function (event) { event.stopPropagation(); });
        editor.focus();
        editor.select();

        var committed = false;
        function commit() {
            if (committed) {
                return;
            }
            committed = true;
            if (measureEl && measureEl.parentNode) {
                measureEl.parentNode.removeChild(measureEl);
            }
            annotationData.content = editor.value || '';"""

    if old1 not in s:
        raise SystemExit('showTextboxEditor block not found')
    s = s.replace(old1, new1, 1)

    # Escape handler: remove measureEl when cancelling
    old_escape = """            if (event.key === 'Escape') {
                committed = true;
                if (labelEl) {
                    labelEl.style.visibility = 'visible';
                }
                editor.remove();
                return;
            }"""
    new_escape = """            if (event.key === 'Escape') {
                committed = true;
                if (measureEl && measureEl.parentNode) {
                    measureEl.parentNode.removeChild(measureEl);
                }
                if (labelEl) {
                    labelEl.style.visibility = 'visible';
                }
                editor.remove();
                return;
            }"""
    if old_escape not in s:
        raise SystemExit('Escape block not found')
    s = s.replace(old_escape, new_escape, 1)

    # 2) transformer.on('transformend', ...) after dblclick handler
    old2 = """            if (data && data.uuid) {
                showTextboxEditor(pageNumber, data);
            }
        });
        stage.add(annotationLayer);"""

    new2 = """            if (data && data.uuid) {
                showTextboxEditor(pageNumber, data);
            }
        });
        transformer.on('transformend', function () {
            if (!state.activeAnnotation || state.activeAnnotation.pageNumber !== pageNumber) {
                return;
            }
            var activeGroup = state.activeAnnotation.group;
            var annotation = activeGroup ? activeGroup.getAttr('annotationData') : null;
            if (!annotation || (annotation.type !== 'area' && annotation.type !== 'textbox')) {
                return;
            }
            var rect = activeGroup.findOne('Rect');
            if (!rect) {
                return;
            }
            var scale = state.scale || 1;
            var gx = activeGroup.x();
            var gy = activeGroup.y();
            var newW = rect.width() * activeGroup.scaleX();
            var newH = rect.height() * activeGroup.scaleY();
            var newX = gx + rect.x() * activeGroup.scaleX();
            var newY = gy + rect.y() * activeGroup.scaleY();
            annotation.x = newX / scale;
            annotation.y = newY / scale;
            annotation.width = newW / scale;
            annotation.height = newH / scale;
            rect.width(newW);
            rect.height(newH);
            rect.x(annotation.x * scale);
            rect.y(annotation.y * scale);
            activeGroup.position({ x: 0, y: 0 });
            activeGroup.scaleX(1);
            activeGroup.scaleY(1);
            if (annotation.type === 'textbox') {
                var labelEl = activeGroup.getAttr('textboxLabelEl');
                if (labelEl) {
                    var padX = 12;
                    var padY = 10;
                    labelEl.style.left = (annotation.x * scale + padX) + 'px';
                    labelEl.style.top = (annotation.y * scale + padY) + 'px';
                    labelEl.style.width = Math.max(0, annotation.width * scale - padX * 2) + 'px';
                    labelEl.style.height = Math.max(0, annotation.height * scale - padY * 2) + 'px';
                }
            }
            activeGroup.setAttr('annotationData', annotation);
            persistAnnotation(annotation);
        });
        stage.add(annotationLayer);"""

    if old2 not in s:
        raise SystemExit('transformer dblclick block not found')
    s = s.replace(old2, new2, 1)

    with open(JS, 'w', encoding='utf-8') as f:
        f.write(s)
    print('Patched:', JS)

if __name__ == '__main__':
    main()
