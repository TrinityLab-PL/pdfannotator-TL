#!/usr/bin/env python3
"""Fix workflow: set ignoreNextTextboxClick only when saving via blur (click outside).
   Then: one click always opens; blur-save does not create empty textbox."""
JS = 'mod/pdfannotator/js_new/pdfannotator_new.v00054.js'

def main():
    with open(JS, 'r', encoding='utf-8') as f:
        s = f.read()

    # 1) mouseup: re-add the flag check (block only when flag is true = after blur-save)
    old_mup = """            if (tool === 'textbox' && pointer && !draftRect) {
                showNewTextboxEditor(pageNumber, pointer.x, pointer.y);
                return;
            }"""
    new_mup = """            if (tool === 'textbox' && pointer && !draftRect) {
                if (state.ignoreNextTextboxClick) {
                    state.ignoreNextTextboxClick = false;
                    return;
                }
                showNewTextboxEditor(pageNumber, pointer.x, pointer.y);
                return;
            }"""
    if old_mup not in s:
        raise SystemExit('mouseup block not found')
    s = s.replace(old_mup, new_mup, 1)

    # 2) showTextboxEditor: commit(fromBlur) - set flag only when fromBlur
    old_commit_edit = """        var committed = false;
        function commit() {
            if (committed) {
                return;
            }
            committed = true;
            state.ignoreNextTextboxClick = true;
            if (saveBtn && saveBtn.parentNode) {
                saveBtn.parentNode.removeChild(saveBtn);
            }
            if (measureEl && measureEl.parentNode) {
                measureEl.parentNode.removeChild(measureEl);
            }
            annotationData.content = editor.value || '';"""
    new_commit_edit = """        var committed = false;
        function commit(fromBlur) {
            if (committed) {
                return;
            }
            committed = true;
            if (fromBlur) {
                state.ignoreNextTextboxClick = true;
            }
            if (saveBtn && saveBtn.parentNode) {
                saveBtn.parentNode.removeChild(saveBtn);
            }
            if (measureEl && measureEl.parentNode) {
                measureEl.parentNode.removeChild(measureEl);
            }
            annotationData.content = editor.value || '';"""
    if old_commit_edit not in s:
        raise SystemExit('showTextboxEditor commit block not found')
    s = s.replace(old_commit_edit, new_commit_edit, 1)

    # 3) showTextboxEditor: blur -> commit(true), save button and Ctrl+Enter -> commit()
    old_blur_edit = """        editor.addEventListener('blur', commit);"""
    new_blur_edit = """        editor.addEventListener('blur', function () { commit(true); });"""
    if old_blur_edit not in s:
        raise SystemExit('blur commit not found')
    s = s.replace(old_blur_edit, new_blur_edit, 1)

    # save button already calls commit() - no args = fromBlur false. Ctrl+Enter calls commit() - good.

    # 4) showNewTextboxEditor: commit(fromBlur)
    old_commit_new = """        function commit() {
            if (committed) {
                return;
            }
            committed = true;
            state.ignoreNextTextboxClick = true;

            var content = String(editor.value || '').trim();"""
    new_commit_new = """        function commit(fromBlur) {
            if (committed) {
                return;
            }
            committed = true;
            if (fromBlur) {
                state.ignoreNextTextboxClick = true;
            }

            var content = String(editor.value || '').trim();"""
    if old_commit_new not in s:
        raise SystemExit('showNewTextboxEditor commit block not found')
    s = s.replace(old_commit_new, new_commit_new, 1)

    # 5) showNewTextboxEditor: blur -> commit(true)
    old_blur_new = """        editor.addEventListener('blur', commit);"""
    new_blur_new = """        editor.addEventListener('blur', function () { commit(true); });"""
    # There might be two such lines - one we already replaced. So replace the remaining one.
    if new_blur_new in s:
        pass  # already done
    else:
        s = s.replace(old_blur_new, new_blur_new, 1)

    with open(JS, 'w', encoding='utf-8') as f:
        f.write(s)
    print('Patched:', JS)

if __name__ == '__main__':
    main()
