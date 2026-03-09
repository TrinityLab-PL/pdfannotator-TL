#!/usr/bin/env python3
"""Fullscreen: otwórz edytor textbox przy mousedown (jedno kliknięcie)."""
import os

# Uruchamiany z katalogu głównego Moodle (edit-with-maintenance.sh --cmd)
MOODLE_ROOT = os.getcwd()
JS = os.path.join(MOODLE_ROOT, 'mod', 'pdfannotator', 'js_new', 'pdfannotator_new.v00054.js')

with open(JS, 'r', encoding='utf-8') as f:
    content = f.read()

# mousedown: w fullscreen od razu otwórz edytor i ustaw flagę
old_mousedown = """            if (tool === 'textbox') {
                draftStart = pointer;
                return;
            }"""

new_mousedown = """            if (tool === 'textbox') {
                if (document.body.classList.contains('tl-pdf-fullscreen')) {
                    state.justOpenedTextboxEditor = true;
                    showNewTextboxEditor(pageNumber, pointer.x, pointer.y);
                    return;
                }
                draftStart = pointer;
                return;
            }"""

# mouseup: pomiń drugie otwarcie gdy otwarto już przy mousedown
old_mouseup = """            if (tool === 'textbox' && pointer && !draftRect) {
                if (state.ignoreNextTextboxClick) {
                    state.ignoreNextTextboxClick = false;
                    return;
                }
                showNewTextboxEditor(pageNumber, pointer.x, pointer.y);
                return;
            }"""

new_mouseup = """            if (tool === 'textbox' && pointer && !draftRect) {
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

if old_mousedown not in content or old_mouseup not in content:
    raise SystemExit('Fragment do zamiany nie znaleziony')
content = content.replace(old_mousedown, new_mousedown, 1).replace(old_mouseup, new_mouseup, 1)

with open(JS, 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched fullscreen textbox click (mousedown open + mouseup skip)')
