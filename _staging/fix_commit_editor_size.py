#!/usr/bin/env python3
"""Commit: use editor size so last word visible after Ctrl+Enter."""
JS = 'mod/pdfannotator/js_new/pdfannotator_new.v00054.js'
with open(JS, 'r', encoding='utf-8') as f:
    s = f.read()
old = """            fitTextboxAroundContent(annotationData);
            redrawOneAnnotation(pageNumber, annotationData.uuid, annotationData);"""
new = """            fitTextboxAroundContent(annotationData);
            var scale = state.scale || 1;
            annotationData.width = Math.max(annotationData.width, editor.offsetWidth / scale);
            annotationData.height = Math.max(annotationData.height, editor.offsetHeight / scale);
            redrawOneAnnotation(pageNumber, annotationData.uuid, annotationData);"""
if old not in s:
    raise SystemExit('block not found')
with open(JS, 'w', encoding='utf-8') as f:
    f.write(s.replace(old, new, 1))
print('Patched:', JS)
