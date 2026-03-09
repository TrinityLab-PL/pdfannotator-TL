#!/usr/bin/env python3
"""Cofnij fullscreen textbox (JS). W fullscreen: z-index edytora i przycisku zapisu nad Konva."""
import os

MOODLE_ROOT = os.getcwd()
JS = os.path.join(MOODLE_ROOT, 'mod', 'pdfannotator', 'js_new', 'pdfannotator_new.v00054.js')
CSS = os.path.join(MOODLE_ROOT, 'mod', 'pdfannotator', 'styles.css')

# --- 1) Revert JS: usuń fullscreen mousedown open i justOpenedTextboxEditor w mouseup ---
with open(JS, 'r', encoding='utf-8') as f:
    js = f.read()

mousedown_fullscreen = """            if (tool === 'textbox') {
                if (document.body.classList.contains('tl-pdf-fullscreen')) {
                    state.justOpenedTextboxEditor = true;
                    showNewTextboxEditor(pageNumber, pointer.x, pointer.y);
                    return;
                }
                draftStart = pointer;
                return;
            }"""

mousedown_plain = """            if (tool === 'textbox') {
                draftStart = pointer;
                return;
            }"""

mouseup_with_skip = """            if (tool === 'textbox' && pointer && !draftRect) {
                if (state.justOpenedTextboxEditor) {
                    state.justOpenedTextboxEditor = false;
                    return;
                }
                if (state.ignoreNextTextboxClick) {
                    state.ignoreNextTextboxClick = false;
                    return;
                }
                showNewTextboxEditor(pageNumber, pointer.x, pointer.y);
                return;
            }"""

mouseup_plain = """            if (tool === 'textbox' && pointer && !draftRect) {
                if (state.ignoreNextTextboxClick) {
                    state.ignoreNextTextboxClick = false;
                    return;
                }
                showNewTextboxEditor(pageNumber, pointer.x, pointer.y);
                return;
            }"""

if mousedown_fullscreen not in js or mouseup_with_skip not in js:
    raise SystemExit('JS: fragment do cofnięcia nie znaleziony')
js = js.replace(mousedown_fullscreen, mousedown_plain, 1).replace(mouseup_with_skip, mouseup_plain, 1)

with open(JS, 'w', encoding='utf-8') as f:
    f.write(js)
print('Reverted fullscreen textbox (mouseup only again)')

# --- 2) CSS: fullscreen – Konva host (ramka), edytor i przycisk zapisu ---
with open(CSS, 'r', encoding='utf-8') as f:
    css = f.read()

# Rozszerz blok .tl-konva-host w fullscreen (position + pointer-events)
konva_old = """body.tl-pdf-fullscreen #viewer .tl-konva-host {
    z-index: 1000000000 !important;
}"""
konva_new = """body.tl-pdf-fullscreen #viewer .tl-konva-host {
    position: relative !important;
    z-index: 1000000000 !important;
    pointer-events: auto !important;
}"""
if konva_old in css:
    css = css.replace(konva_old, konva_new, 1)
    print('Updated fullscreen .tl-konva-host (position, pointer-events)')
else:
    print('CSS: .tl-konva-host fullscreen block not found or already patched')

# Wstaw po .tl-delete-annotation reguły dla edytora i przycisku zapisu
delete_block = """body.tl-pdf-fullscreen .tl-delete-annotation {
    z-index: 1000000001 !important;
}

#toolbarContent"""
editor_insert = """body.tl-pdf-fullscreen .tl-delete-annotation {
    z-index: 1000000001 !important;
}

/* Fullscreen: edytor textbox i przycisk zapisu nad warstwą Konva */
body.tl-pdf-fullscreen .tl-inline-text-editor,
body.tl-pdf-fullscreen .tl-save-textbox {
    position: relative !important;
    z-index: 1000000001 !important;
}

#toolbarContent"""
if 'body.tl-pdf-fullscreen .tl-inline-text-editor' in css:
    print('CSS: reguły fullscreen edytora już są')
elif delete_block in css:
    css = css.replace(delete_block, editor_insert, 1)
    print('Added fullscreen z-index for .tl-inline-text-editor and .tl-save-textbox')
else:
    raise SystemExit('CSS: block .tl-delete-annotation + #toolbarContent nie znaleziony')

with open(CSS, 'w', encoding='utf-8') as f:
    f.write(css)
