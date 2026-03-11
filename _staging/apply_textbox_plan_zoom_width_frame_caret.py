#!/usr/bin/env python3
"""
Plan: textbox_pozostale_bugi_zoom_szerokosc_ramka_caret
- Szerokość zapisu = editor.offsetWidth/scale (w obu commit).
- Po resizeEditorToContent w showTextboxEditor: sync annotationData i redrawOneAnnotation.
- drawAnnotation textbox: Math.ceil dla boxWidth/boxHeight.
- CSS .tl-inline-text-editor: padding w em.
Uruchomić z katalogu Moodle.
"""
import os

root = os.getcwd()
JS = os.path.join(root, 'mod', 'pdfannotator', 'js_new', 'pdfannotator_new.v00054.js')
CSS = os.path.join(root, 'mod', 'pdfannotator', 'styles.css')

with open(JS, 'r', encoding='utf-8') as f:
    js = f.read()

# --- 1. showTextboxEditor commit: wymuszenie szerokości z edytora
js = js.replace(
    "annotationData.width = Math.max(annotationData.width, editor.offsetWidth / scale);",
    "annotationData.width = editor.offsetWidth / scale;",
    1
)

# --- 2. showNewTextboxEditor: wymuszenie szerokości z edytora
js = js.replace(
    "width: Math.max(measure.width, editor.offsetWidth / scale),",
    "width: editor.offsetWidth / scale,",
    1
)

# --- 3. showTextboxEditor: po resizeEditorToContent zsynchronizować ramkę z edytorem
old_sync = """        updateSaveBtnPos();
        editor.addEventListener('mousedown', function (event) { event.stopPropagation(); });"""
new_sync = """        updateSaveBtnPos();
        annotationData.width = editor.offsetWidth / (state.scale || 1);
        annotationData.height = editor.offsetHeight / (state.scale || 1);
        redrawOneAnnotation(pageNumber, annotationData.uuid, annotationData);
        editor.addEventListener('mousedown', function (event) { event.stopPropagation(); });"""
if old_sync not in js:
    raise SystemExit('showTextboxEditor sync block not found')
js = js.replace(old_sync, new_sync, 1)

# --- 4. drawAnnotation textbox: Math.ceil żeby nie tracić pikseli
js = js.replace(
    "var boxWidth = Math.max(12, Math.round(annotation.width * scale));",
    "var boxWidth = Math.max(12, Math.ceil(annotation.width * scale));",
    1
)
js = js.replace(
    "var boxHeight = Math.max(12, Math.round(annotation.height * scale));",
    "var boxHeight = Math.max(12, Math.ceil(annotation.height * scale));",
    1
)

with open(JS, 'w', encoding='utf-8') as f:
    f.write(js)

# --- 5. CSS: padding w em dla .tl-inline-text-editor
with open(CSS, 'r', encoding='utf-8') as f:
    css = f.read()
old_css = """    padding: 6px;
    resize: none !important;"""
new_css = """    padding: 0.4em;
    resize: none !important;"""
if old_css not in css:
    raise SystemExit('CSS .tl-inline-text-editor padding block not found')
css = css.replace(old_css, new_css, 1)
with open(CSS, 'w', encoding='utf-8') as f:
    f.write(css)

print('apply_textbox_plan_zoom_width_frame_caret: OK')
