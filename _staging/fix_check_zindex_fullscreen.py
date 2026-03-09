#!/usr/bin/env python3
import os

CSS = os.path.join(os.getcwd(), 'mod', 'pdfannotator', 'styles.css')
with open(CSS, 'r', encoding='utf-8') as f:
    css = f.read()

old = """body.tl-pdf-fullscreen #viewer .tl-save-textbox,
body.tl-pdf-fullscreen .path-mod-pdfannotator .tl-save-textbox {
    cursor: pointer !important;
}"""

new = """body.tl-pdf-fullscreen #viewer .tl-save-textbox,
body.tl-pdf-fullscreen .path-mod-pdfannotator .tl-save-textbox {
    z-index: 1000000001 !important;
    cursor: pointer !important;
}"""

if new in css:
    print('Already applied')
elif old not in css:
    raise SystemExit('block not found')
else:
    css = css.replace(old, new, 1)
    with open(CSS, 'w', encoding='utf-8') as f:
        f.write(css)
    print('Done')
