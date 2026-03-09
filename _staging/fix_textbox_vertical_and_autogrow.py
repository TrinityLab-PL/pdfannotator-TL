#!/usr/bin/env python3
"""Fix: 1) vertical caret position 2) single frame, no resize, auto-grow to content."""
import os
import sys

ROOT = '/var/www/html/moodle'
JS_PATH = os.path.join(ROOT, 'mod', 'pdfannotator', 'js_new', 'pdfannotator_new.v00054.js')
CSS_PATH = os.path.join(ROOT, 'mod', 'pdfannotator', 'styles.css')

def main():
    with open(JS_PATH, 'r', encoding='utf-8') as f:
        js = f.read()

    # 1) Vertical: add caretOffset so caret aligns with click; use it for top and for unscaledBoxY
    old_pos = """        var paddingTop = 10;
        var paddingLeft = 12;
        editor.style.left = (pointerX - paddingLeft) + 'px';
        editor.style.top = (pointerY - paddingTop) + 'px';
        editor.style.width = '140px';
        editor.style.height = '44px';
        editor.style.fontSize = editorFontSize + 'px';
        editor.style.fontFamily = editorFontFamily + ', sans-serif';
        editor.style.color = state.textColor || '#111827';

        pageElement.appendChild(editor);

        editor.addEventListener('mousedown', function (event) { event.stopPropagation(); });
        editor.addEventListener('click', function (event) { event.stopPropagation(); });
        editor.addEventListener('dblclick', function (event) { event.stopPropagation(); });

        editor.focus();
        editor.select();"""

    new_pos = """        var paddingTop = 10;
        var paddingLeft = 12;
        var caretOffset = editorFontSize * 0.82;
        editor.style.left = (pointerX - paddingLeft) + 'px';
        editor.style.top = (pointerY - paddingTop - caretOffset) + 'px';
        editor.style.minWidth = '60px';
        editor.style.minHeight = '36px';
        editor.style.width = '60px';
        editor.style.height = '36px';
        editor.style.fontSize = editorFontSize + 'px';
        editor.style.fontFamily = editorFontFamily + ', sans-serif';
        editor.style.color = state.textColor || '#111827';
        editor.style.lineHeight = '1.2';

        pageElement.appendChild(editor);

        var measureEl = document.createElement('div');
        measureEl.setAttribute('aria-hidden', 'true');
        measureEl.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre-wrap;word-wrap:break-word;pointer-events:none;margin:0;border:none;padding:0;';
        measureEl.style.fontSize = editorFontSize + 'px';
        measureEl.style.fontFamily = editorFontFamily + ', sans-serif';
        measureEl.style.lineHeight = '1.2';
        pageElement.appendChild(measureEl);

        function resizeEditorToContent() {
            var val = editor.value || ' ';
            measureEl.textContent = val;
            var contentW = measureEl.offsetWidth;
            var contentH = measureEl.offsetHeight;
            var w = Math.max(60, Math.ceil(contentW) + paddingLeft * 2 + 4);
            var h = Math.max(36, Math.ceil(contentH) + paddingTop * 2 + 4);
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
        editor.select();"""

    js = js.replace(old_pos, new_pos, 1)

    # 2) commit(): use caretOffset for unscaledBoxY so saved box top matches visible box
    old_commit = """            var unscaledBoxX = (pointerX - paddingLeft) / state.scale;
            var unscaledBoxY = (pointerY - paddingTop) / state.scale;"""

    new_commit = """            var unscaledBoxX = (pointerX - paddingLeft) / state.scale;
            var unscaledBoxY = (pointerY - paddingTop - caretOffset) / state.scale;"""

    js = js.replace(old_commit, new_commit, 1)

    # 3) cleanup(): remove measureEl
    old_cleanup = """        function cleanup() {
            try {
                editor.remove();
            } catch (e) {}
            setTool('cursor');
        }"""

    new_cleanup = """        function cleanup() {
            try {
                if (measureEl && measureEl.parentNode) {
                    measureEl.parentNode.removeChild(measureEl);
                }
                editor.remove();
            } catch (e) {}
            setTool('cursor');
        }"""

    js = js.replace(old_cleanup, new_cleanup, 1)

    with open(JS_PATH, 'w', encoding='utf-8') as f:
        f.write(js)

    # CSS: disable resize
    with open(CSS_PATH, 'r', encoding='utf-8') as f:
        css = f.read()

    old_css = """    padding: 10px 12px;
    resize: both;
    background: rgba(240, 246, 253, 0.6);"""

    new_css = """    padding: 10px 12px;
    resize: none;
    overflow: hidden;
    background: rgba(240, 246, 253, 0.6);"""

    if old_css in css:
        css = css.replace(old_css, new_css, 1)
    else:
        print('WARN: CSS fragment not found', file=sys.stderr)

    with open(CSS_PATH, 'w', encoding='utf-8') as f:
        f.write(css)

    print('Applied: vertical caret offset, auto-grow, resize:none')

if __name__ == '__main__':
    main()
