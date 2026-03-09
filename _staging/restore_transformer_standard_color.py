#!/usr/bin/env python3
"""Restore standard transformer (selection frame) color. Check stays #6eae19 in CSS."""
JS = 'mod/pdfannotator/js_new/pdfannotator_new.v00054.js'

def main():
    with open(JS, 'r', encoding='utf-8') as f:
        s = f.read()

    old_tr = """        var transformer = new Konva.Transformer({
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
    new_tr = """        var transformer = new Konva.Transformer({
            anchorSize: 7,
            borderStroke: '#1f2937',
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
    print('Patched: transformer restored to standard color. Check remains #6eae19 in CSS.')

if __name__ == '__main__':
    main()
