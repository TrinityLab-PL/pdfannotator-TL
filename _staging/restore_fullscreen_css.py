#!/usr/bin/env python3
"""Przywróć CSS fullscreen do stanu sprzed ostatnich zmian (tylko z-index Konva i delete)."""
import os

CSS = os.path.join(os.getcwd(), 'mod', 'pdfannotator', 'styles.css')

with open(CSS, 'r', encoding='utf-8') as f:
    css = f.read()

# Cofnij rozszerzony blok .tl-konva-host do prostego (tylko z-index)
konva_extended = """body.tl-pdf-fullscreen #viewer .tl-konva-host {
    position: relative !important;
    z-index: 1000000000 !important;
    pointer-events: auto !important;
}"""
konva_original = """body.tl-pdf-fullscreen #viewer .tl-konva-host {
    z-index: 1000000000 !important;
}"""

# Usuń blok edytora i przycisku zapisu w fullscreen
editor_block = """
/* Fullscreen: edytor textbox i przycisk zapisu nad warstwą Konva */
body.tl-pdf-fullscreen .tl-inline-text-editor,
body.tl-pdf-fullscreen .tl-save-textbox {
    position: relative !important;
    z-index: 1000000001 !important;
}

"""

if konva_extended in css:
    css = css.replace(konva_extended, konva_original, 1)
    print('Restored .tl-konva-host fullscreen to z-index only')
else:
    print('Note: .tl-konva-host block not found or already reverted')

if editor_block in css:
    css = css.replace(editor_block, '\n', 1)
    print('Removed fullscreen editor/save-button z-index block')
else:
    print('Note: editor block not found or already removed')

with open(CSS, 'w', encoding='utf-8') as f:
    f.write(css)
print('Done.')
