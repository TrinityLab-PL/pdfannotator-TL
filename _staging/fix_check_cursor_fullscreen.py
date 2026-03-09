#!/usr/bin/env python3
import os

CSS = os.path.join(os.getcwd(), 'mod', 'pdfannotator', 'styles.css')
with open(CSS, 'r', encoding='utf-8') as f:
    css = f.read()

anchor = """body.tl-pdf-fullscreen .tl-delete-annotation {
    z-index: 1000000001 !important;
}

#toolbarContent"""

insert = """body.tl-pdf-fullscreen .tl-delete-annotation {
    z-index: 1000000001 !important;
}

body.tl-pdf-fullscreen .tl-save-textbox {
    cursor: pointer !important;
}

#toolbarContent"""

if 'body.tl-pdf-fullscreen .tl-save-textbox' in css and 'cursor: pointer !important' in css:
    print('Already present')
elif anchor not in css:
    raise SystemExit('anchor not found')
else:
    css = css.replace(anchor, insert, 1)
    with open(CSS, 'w', encoding='utf-8') as f:
        f.write(css)
    print('Done')
