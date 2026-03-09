#!/usr/bin/env python3
import os

CSS = os.path.join(os.getcwd(), 'mod', 'pdfannotator', 'styles.css')
with open(CSS, 'r', encoding='utf-8') as f:
    css = f.read()

old_rule = """body.tl-pdf-fullscreen .tl-save-textbox {
    cursor: pointer !important;
}"""

new_rule = """body.tl-pdf-fullscreen #viewer .tl-save-textbox,
body.tl-pdf-fullscreen .path-mod-pdfannotator .tl-save-textbox {
    cursor: pointer !important;
}"""

if old_rule not in css:
    raise SystemExit('old rule not found')
css = css.replace(old_rule, new_rule, 1)
with open(CSS, 'w', encoding='utf-8') as f:
    f.write(css)
print('Done')
