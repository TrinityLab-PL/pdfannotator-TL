#!/usr/bin/env python3
"""1) Fullscreen: visible transformer border, delete button above. 2) Textbox: restore draw-rect then edit (one drag)."""
JS = 'mod/pdfannotator/js_new/pdfannotator_new.v00054.js'
CSS = 'mod/pdfannotator/styles.css'

def main():
    with open(JS, 'r', encoding='utf-8') as f:
        s = f.read()

    # 1) Transformer: more visible border (fullscreen and normal)
    old_tr = """        var transformer = new Konva.Transformer({
            anchorSize: 7,
            borderStroke: '#1f2937',
            visible: false,
            rotateEnabled: false,
            shouldOverdrawWholeArea: true,
            enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right']
        });"""
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
    if old_tr not in s:
        raise SystemExit('Transformer block not found')
    s = s.replace(old_tr, new_tr, 1)

    # 2) Textbox: remove single-click path - use draftRect (draw box then edit)
    # mousedown: remove early return for textbox so it creates draftRect like area
    old_mdown = """            if (tool === 'textbox') {
                draftStart = pointer;
                return;
            }

            draftStart = pointer;"""
    new_mdown = """            draftStart = pointer;"""
    if old_mdown not in s:
        raise SystemExit('textbox mousedown block not found')
    s = s.replace(old_mdown, new_mdown, 1)

    # 3) mouseup: remove the "textbox && !draftRect" block that called showNewTextboxEditor
    old_mup = """            if (tool === 'textbox' && pointer && !draftRect) {
                if (state.ignoreNextTextboxClick) {
                    state.ignoreNextTextboxClick = false;
                    return;
                }
                showNewTextboxEditor(pageNumber, pointer.x, pointer.y);
                return;
            }

            if (draftRect && draftStart) {"""
    new_mup = """            if (draftRect && draftStart) {"""
    if old_mup not in s:
        raise SystemExit('textbox mouseup block not found')
    s = s.replace(old_mup, new_mup, 1)

    with open(JS, 'w', encoding='utf-8') as f:
        f.write(s)
    print('Patched:', JS)

    # 4) CSS: delete button above transformer in fullscreen
    with open(CSS, 'r', encoding='utf-8') as f:
        css = f.read()
    old_css = """.tl-delete-annotation {
    position: absolute;
    z-index: 40;
    width: 26px;"""
    new_css = """.tl-delete-annotation {
    position: absolute;
    z-index: 40;
    width: 26px;"""
    if old_css not in css:
        raise SystemExit('tl-delete-annotation block not found')
    # Insert fullscreen override after body.tl-pdf-fullscreen #viewer .tl-konva-host block
    fs_rule = """
body.tl-pdf-fullscreen .tl-delete-annotation {
    z-index: 1000000001 !important;
}
"""
    insert_after = """#toolbarContent [data-tooltype].tl-tool-active {
    outline: 2px solid #0f766e;
    outline-offset: 1px;
}
"""
    if insert_after not in css:
        raise SystemExit('toolbarContent block not found')
    if 'body.tl-pdf-fullscreen .tl-delete-annotation' in css:
        pass  # already added
    else:
        css = css.replace(insert_after, fs_rule + insert_after, 1)
    with open(CSS, 'w', encoding='utf-8') as f:
        f.write(css)
    print('Patched:', CSS)

if __name__ == '__main__':
    main()
