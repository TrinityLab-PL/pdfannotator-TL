#!/usr/bin/env python3
"""1) Save button color #6eae19. 2) Fullscreen: visible transformer, delete button above."""
JS = 'mod/pdfannotator/js_new/pdfannotator_new.v00054.js'
CSS = 'mod/pdfannotator/styles.css'

def main():
    with open(JS, 'r', encoding='utf-8') as f:
        s = f.read()

    # 1) Transformer: visible border and anchors (normal + fullscreen)
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
            borderStroke: '#6eae19',
            borderStrokeWidth: 2,
            anchorStroke: '#6eae19',
            anchorFill: '#e8f5e9',
            visible: false,
            rotateEnabled: false,
            shouldOverdrawWholeArea: true,
            enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right']
        });"""
    if old_tr not in s:
        raise SystemExit('Transformer block not found')
    s = s.replace(old_tr, new_tr, 1)

    with open(JS, 'w', encoding='utf-8') as f:
        f.write(s)
    print('Patched JS:', JS)

    with open(CSS, 'r', encoding='utf-8') as f:
        css = f.read()

    # 2) Save button color
    css = css.replace('.tl-save-textbox {\n    position: absolute;\n    z-index: 41;\n    width: 26px;\n    height: 26px;\n    border-radius: 50%;\n    border: 0;\n    background: #059669;',
                      '.tl-save-textbox {\n    position: absolute;\n    z-index: 41;\n    width: 26px;\n    height: 26px;\n    border-radius: 50%;\n    border: 0;\n    background: #6eae19;', 1)
    if 'background: #6eae19' not in css or 'tl-save-textbox' not in css:
        raise SystemExit('Save button color replace failed')
    print('Patched CSS: save button #6eae19')

    # 3) Fullscreen: delete button above Konva so clickable
    old_fs = """body.tl-pdf-fullscreen #viewer .tl-konva-host {
    z-index: 1000000000 !important;
}


#toolbarContent"""
    new_fs = """body.tl-pdf-fullscreen #viewer .tl-konva-host {
    z-index: 1000000000 !important;
}

body.tl-pdf-fullscreen .tl-delete-annotation {
    z-index: 1000000001 !important;
}

#toolbarContent"""
    if old_fs not in css:
        raise SystemExit('Fullscreen konva block not found')
    if 'body.tl-pdf-fullscreen .tl-delete-annotation' not in css:
        css = css.replace(old_fs, new_fs, 1)
        print('Patched CSS: fullscreen delete button z-index')
    else:
        print('CSS: fullscreen delete already present')

    with open(CSS, 'w', encoding='utf-8') as f:
        f.write(css)
    print('Patched:', CSS)

if __name__ == '__main__':
    main()
