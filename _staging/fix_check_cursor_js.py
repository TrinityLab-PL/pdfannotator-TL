#!/usr/bin/env python3
import os

JS = os.path.join(os.getcwd(), 'mod', 'pdfannotator', 'js_new', 'pdfannotator_new.v00054.js')
with open(JS, 'r', encoding='utf-8') as f:
    js = f.read()

old = "saveBtn.className = 'tl-save-textbox';\n        saveBtn.setAttribute('aria-label', 'Save');"
new = "saveBtn.className = 'tl-save-textbox';\n        saveBtn.style.cursor = 'pointer';\n        saveBtn.setAttribute('aria-label', 'Save');"
if old not in js:
    raise SystemExit('fragment not found')
if new in js:
    print('Already patched')
else:
    js = js.replace(old, new, 2)
    with open(JS, 'w', encoding='utf-8') as f:
        f.write(js)
    print('Done')
