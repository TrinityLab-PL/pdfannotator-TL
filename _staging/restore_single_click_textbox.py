#!/usr/bin/env python3
"""Restore: one click on PDF with textbox tool -> editor opens, no blocking check."""
JS = 'mod/pdfannotator/js_new/pdfannotator_new.v00054.js'

def main():
    with open(JS, 'r', encoding='utf-8') as f:
        s = f.read()

    old_block = """            if (tool === 'textbox' && pointer && !draftRect) {
                var v = viewerEl();
                if (v && v.querySelector('.tl-inline-text-editor')) {
                    return;
                }
                showNewTextboxEditor(pageNumber, pointer.x, pointer.y);
                return;
            }"""
    new_block = """            if (tool === 'textbox' && pointer && !draftRect) {
                showNewTextboxEditor(pageNumber, pointer.x, pointer.y);
                return;
            }"""
    if old_block not in s:
        raise SystemExit('block not found')
    s = s.replace(old_block, new_block, 1)

    with open(JS, 'w', encoding='utf-8') as f:
        f.write(s)
    print('Patched:', JS)

if __name__ == '__main__':
    main()
