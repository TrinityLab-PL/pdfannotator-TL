#!/usr/bin/env python3
"""
Łamanie tekstu: etykieta ma padding 6px, edytor 0.4em – przy różnych zoomach szerokość treści się rozjeżdża.
Ustawiamy padding etykiety na 0.4em (w px: 0.4*textFontSizePx), żeby content width = boxWidth - 2*0.4*fontSize.
Uruchomić z katalogu Moodle.
"""
import os

root = os.getcwd()
JS = os.path.join(root, 'mod', 'pdfannotator', 'js_new', 'pdfannotator_new.v00054.js')

with open(JS, 'r', encoding='utf-8') as f:
    js = f.read()

old_block = """            var textPaddingX = 6;
            var textPaddingY = 5;
            var textFontSizePx = Math.max(10, Math.round((annotation.size || state.textSize || 14) * scale));
            var labelEl = document.createElement('div');
            labelEl.className = 'tl-textbox-label';
            labelEl.setAttribute('data-annotation-id', String(annotation.uuid || ''));
            labelEl.style.position = 'absolute';
            labelEl.style.left = (boxX + textPaddingX) + 'px';
            labelEl.style.top = (boxY + textPaddingY) + 'px';
            labelEl.style.width = Math.max(0, boxWidth - textPaddingX * 2) + 'px';
            labelEl.style.height = Math.max(0, boxHeight - textPaddingY * 2) + 'px';"""

new_block = """            var textFontSizePx = Math.max(10, Math.round((annotation.size || state.textSize || 14) * scale));
            var textPaddingX = Math.round(0.4 * textFontSizePx);
            var textPaddingY = Math.round(0.4 * textFontSizePx);
            var labelEl = document.createElement('div');
            labelEl.className = 'tl-textbox-label';
            labelEl.setAttribute('data-annotation-id', String(annotation.uuid || ''));
            labelEl.style.position = 'absolute';
            labelEl.style.left = (boxX + textPaddingX) + 'px';
            labelEl.style.top = (boxY + textPaddingY) + 'px';
            labelEl.style.width = Math.max(0, boxWidth - textPaddingX * 2) + 'px';
            labelEl.style.height = Math.max(0, boxHeight - textPaddingY * 2) + 'px';"""

if old_block not in js:
    raise SystemExit('label padding block not found')
js = js.replace(old_block, new_block, 1)

with open(JS, 'w', encoding='utf-8') as f:
    f.write(js)

print('fix_label_padding_match_editor: OK')
