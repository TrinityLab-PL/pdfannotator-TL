#!/usr/bin/env python3
"""Revert: 1) Transformer and delete button fullscreen. 2) Textbox back to single-click then edit."""
JS = 'mod/pdfannotator/js_new/pdfannotator_new.v00054.js'
CSS = 'mod/pdfannotator/styles.css'

def main():
    with open(JS, 'r', encoding='utf-8') as f:
        s = f.read()

    # 1) Transformer: back to original
    new_tr = """        var transformer = new Konva.Transformer({
            anchorSize: 8,
            borderStroke: '#0f766e',
            borderStrokeWidth: 2,
            anchorStroke: '#0f766e',
            anchorFill: '#f0fdfa',
            visible: false,
            rotateEnabled: false,
            shouldOverdrawWholeArea: true,
            enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right']
        });"""
    old_tr = """        var transformer = new Konva.Transformer({
            anchorSize: 7,
            borderStroke: '#1f2937',
            visible: false,
            rotateEnabled: false,
            shouldOverdrawWholeArea: true,
            enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right']
        });"""
    if new_tr not in s:
        raise SystemExit('Current transformer block not found')
    s = s.replace(new_tr, old_tr, 1)

    # 2) mousedown: restore textbox early return
    new_mdown = """            draftStart = pointer;"""
    old_mdown = """            if (tool === 'textbox') {
                draftStart = pointer;
                return;
            }

            draftStart = pointer;"""
    if new_mdown not in s:
        raise SystemExit('mousedown block not found')
    s = s.replace(new_mdown, old_mdown, 1)

    # 3) mouseup: restore textbox single-click block
    new_mup = """            if (draftRect && draftStart) {"""
    old_mup = """            if (tool === 'textbox' && pointer && !draftRect) {
                if (state.ignoreNextTextboxClick) {
                    state.ignoreNextTextboxClick = false;
                    return;
                }
                showNewTextboxEditor(pageNumber, pointer.x, pointer.y);
                return;
            }

            if (draftRect && draftStart) {"""
    if new_mup not in s:
        raise SystemExit('mouseup block not found')
    s = s.replace(new_mup, old_mup, 1)

    with open(JS, 'w', encoding='utf-8') as f:
        f.write(s)
    print('Reverted JS:', JS)

    # 4) CSS: remove fullscreen delete button rule
    with open(CSS, 'r', encoding='utf-8') as f:
        css = f.read()
    fs_rule = """
body.tl-pdf-fullscreen .tl-delete-annotation {
    z-index: 1000000001 !important;
}
#toolbarContent"""
    if fs_rule in css:
        css = css.replace(fs_rule, "\n#toolbarContent", 1)
    else:
        css = css.replace("body.tl-pdf-fullscreen .tl-delete-annotation {\n    z-index: 1000000001 !important;\n}\n", "", 1)
    with open(CSS, 'w', encoding='utf-8') as f:
        f.write(css)
    print('Reverted CSS:', CSS)

if __name__ == '__main__':
    main()
