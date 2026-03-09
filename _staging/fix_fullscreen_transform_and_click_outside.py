#!/usr/bin/env python3
"""1) Fullscreen: konva host z-index so transformer visible. 2) Click outside: ignore next textbox creation when commit from blur."""
import os
JS = 'mod/pdfannotator/js_new/pdfannotator_new.v00054.js'

def main():
    with open(JS, 'r', encoding='utf-8') as f:
        s = f.read()

    # 1) Stage mouseup: before showNewTextboxEditor, skip if we just committed (blur)
    old_mouseup = """            if (tool === 'textbox' && pointer && !draftRect) {
                showNewTextboxEditor(pageNumber, pointer.x, pointer.y);
                return;
            }"""
    new_mouseup = """            if (tool === 'textbox' && pointer && !draftRect) {
                if (state.ignoreNextTextboxClick) {
                    state.ignoreNextTextboxClick = false;
                    return;
                }
                showNewTextboxEditor(pageNumber, pointer.x, pointer.y);
                return;
            }"""
    if old_mouseup not in s:
        raise SystemExit('mouseup textbox block not found')
    s = s.replace(old_mouseup, new_mouseup, 1)

    # 2) showTextboxEditor commit: set flag at start
    old_commit_edit = """        function commit() {
            if (committed) {
                return;
            }
            committed = true;
            if (measureEl && measureEl.parentNode) {
                measureEl.parentNode.removeChild(measureEl);
            }
            annotationData.content = editor.value || '';"""
    new_commit_edit = """        function commit() {
            if (committed) {
                return;
            }
            committed = true;
            state.ignoreNextTextboxClick = true;
            if (measureEl && measureEl.parentNode) {
                measureEl.parentNode.removeChild(measureEl);
            }
            annotationData.content = editor.value || '';"""
    if old_commit_edit not in s:
        raise SystemExit('showTextboxEditor commit block not found')
    s = s.replace(old_commit_edit, new_commit_edit, 1)

    # 3) showNewTextboxEditor commit: set flag and use editor size for new annotation
    old_commit_new = """        function commit() {
            if (committed) {
                return;
            }
            committed = true;

            var content = String(editor.value || '').trim();
            if (!content) {
                cleanup();
                return;
            }
"""
    new_commit_new = """        function commit() {
            if (committed) {
                return;
            }
            committed = true;
            state.ignoreNextTextboxClick = true;

            var content = String(editor.value || '').trim();
            if (!content) {
                cleanup();
                return;
            }
"""
    if old_commit_new not in s:
        raise SystemExit('showNewTextboxEditor commit block not found')
    s = s.replace(old_commit_new, new_commit_new, 1)

    # 4) showNewTextboxEditor: use editor size for annotation so box fits content
    old_annot = """            var annotation = {
                type: 'textbox',
                x: unscaledBoxX,
                y: unscaledBoxY,
                width: measure.width,
                height: measure.height,
                size: editorFontSize,
                font: editorFontFamily,
                color: state.textColor || '#111827',
                content: content
            };

            ajax('create',"""
    new_annot = """            var scale = state.scale || 1;
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
            };

            ajax('create',"""
    if old_annot not in s:
        raise SystemExit('annotation create block not found')
    s = s.replace(old_annot, new_annot, 1)

    with open(JS, 'w', encoding='utf-8') as f:
        f.write(s)
    print('Patched:', JS)

    # 5) CSS: fullscreen - konva host above PDF canvas so transformer visible
    CSS = 'mod/pdfannotator/styles.css'
    with open(CSS, 'r', encoding='utf-8') as f:
        css = f.read()
    old_css = """#viewer .tl-konva-host {
    position: absolute;
    left: 0;
    top: 0;
    z-index: 4;
}

#toolbarContent"""
    new_css = """#viewer .tl-konva-host {
    position: absolute;
    left: 0;
    top: 0;
    z-index: 4;
}

body.tl-pdf-fullscreen #viewer .tl-konva-host {
    z-index: 1000000000 !important;
}

#toolbarContent"""
    if old_css not in css:
        raise SystemExit('CSS tl-konva-host block not found')
    with open(CSS, 'w', encoding='utf-8') as f:
        f.write(css.replace(old_css, new_css, 1))
    print('Patched:', CSS)

if __name__ == '__main__':
    main()
