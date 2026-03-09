#!/usr/bin/env python3
import os, sys

ROOT = '/var/www/html/moodle'
JS_PATH = os.path.join(ROOT, 'mod', 'pdfannotator', 'js_new', 'pdfannotator_new.v00054.js')
CSS_PATH = os.path.join(ROOT, 'mod', 'pdfannotator', 'styles.css')

def main():
    # JS
    with open(JS_PATH, 'r', encoding='utf-8') as f:
        js = f.read()

    old_pos = """        editor.style.left = pointerX + 'px';\n        editor.style.top = pointerY + 'px';\n        editor.style.width = '140px';\n        editor.style.height = '44px';\n        editor.style.fontSize = editorFontSize + 'px';\n        editor.style.fontFamily = editorFontFamily + ', sans-serif';\n        editor.style.color = state.textColor || '#111827';\n"""

    new_pos = """        var paddingTop = 10;\n        var paddingLeft = 12;\n        editor.style.left = (pointerX - paddingLeft) + 'px';\n        editor.style.top = (pointerY - paddingTop) + 'px';\n        editor.style.width = '140px';\n        editor.style.height = '44px';\n        editor.style.fontSize = editorFontSize + 'px';\n        editor.style.fontFamily = editorFontFamily + ', sans-serif';\n        editor.style.color = state.textColor || '#111827';\n"""

    old_commit = """            var centerX = (pointerX || 0) / state.scale;\n            var centerY = (pointerY || 0) / state.scale;\n\n            var annotation = {\n                type: 'textbox',\n                x: centerX - 20,\n                y: centerY - 15,\n                width: 40,\n                height: 30,\n                size: editorFontSize,\n                font: editorFontFamily,\n                color: state.textColor || '#111827',\n                content: content\n            };\n\n            fitTextboxAroundContent(annotation);\n"""

    new_commit = """            var unscaledBoxX = (pointerX - paddingLeft) / state.scale;\n            var unscaledBoxY = (pointerY - paddingTop) / state.scale;\n\n            var measure = {\n                type: 'textbox',\n                x: 0,\n                y: 0,\n                width: 1,\n                height: 1,\n                size: editorFontSize,\n                font: editorFontFamily,\n                color: state.textColor || '#111827',\n                content: content\n            };\n\n            fitTextboxAroundContent(measure);\n\n            var annotation = {\n                type: 'textbox',\n                x: unscaledBoxX,\n                y: unscaledBoxY,\n                width: measure.width,\n                height: measure.height,\n                size: editorFontSize,\n                font: editorFontFamily,\n                color: state.textColor || '#111827',\n                content: content\n            };\n"""

    old_draw = """        } else if (annotation.type === 'textbox') {\n            var boxX = Math.round(annotation.x * scale);\n            var boxY = Math.round(annotation.y * scale);\n            var boxWidth = Math.max(12, Math.round(annotation.width * scale));\n            var boxHeight = Math.max(12, Math.round(annotation.height * scale));\n            group.add(new Konva.Rect({\n                x: boxX,\n                y: boxY,\n                width: boxWidth,\n                height: boxHeight,\n                cornerRadius: 7,\n                fill: 'rgba(235, 242, 252, 0.55)'\n            }));\n            var textFontSize = Math.max(10, Math.round((annotation.size || state.textSize || 14) * scale));\n            group.add(new Konva.Text({\n                x: boxX + 8,\n                y: boxY + 8,\n                width: Math.max(10, boxWidth - 16),\n                text: annotation.content || '',\n                fill: annotation.color || '#1f2937',\n                fontSize: textFontSize,\n"""

    new_draw = """        } else if (annotation.type === 'textbox') {\n            var boxX = Math.round(annotation.x * scale);\n            var boxY = Math.round(annotation.y * scale);\n            var boxWidth = Math.max(12, Math.round(annotation.width * scale));\n            var boxHeight = Math.max(12, Math.round(annotation.height * scale));\n            group.add(new Konva.Rect({\n                x: boxX,\n                y: boxY,\n                width: boxWidth,\n                height: boxHeight,\n                cornerRadius: 7,\n                fill: 'rgba(235, 242, 252, 0.35)',\n                stroke: 'rgba(148, 163, 184, 0.65)',\n                strokeWidth: 1\n            }));\n            var textFontSize = Math.max(10, Math.round((annotation.size || state.textSize || 14) * scale));\n            var textPaddingX = 12;\n            var textPaddingY = 10;\n            group.add(new Konva.Text({\n                x: boxX + textPaddingX,\n                y: boxY + textPaddingY,\n                width: Math.max(10, boxWidth - textPaddingX * 2),\n                text: annotation.content || '',\n                fill: annotation.color || '#1f2937',\n                fontSize: textFontSize,\n"""

    for old, new in [(old_pos, new_pos), (old_commit, new_commit), (old_draw, new_draw)]:
        if old in js:
            js = js.replace(old, new, 1)
        else:
            print('WARN: JS fragment not found', file=sys.stderr)

    with open(JS_PATH, 'w', encoding='utf-8') as f:
        f.write(js)

    # CSS
    with open(CSS_PATH, 'r', encoding='utf-8') as f:
        css = f.read()

    css_old = """.tl-inline-text-editor {\n    position: absolute;\n    z-index: 30;\n    border: 0;\n    box-shadow: 0 2px 10px rgba(15, 23, 42, 0.14);\n    border-radius: 7px;\n    padding: 10px 12px;\n    resize: both;\n    background: rgba(240, 246, 253, 0.65);\n    color: #111827;\n    font-size: 14px;\n}\n"""

    css_new = """.tl-inline-text-editor {\n    position: absolute;\n    z-index: 30;\n    border: 1px solid rgba(148, 163, 184, 0.55);\n    box-shadow: 0 1px 6px rgba(15, 23, 42, 0.1);\n    border-radius: 7px;\n    padding: 10px 12px;\n    resize: both;\n    background: rgba(240, 246, 253, 0.6);\n    color: #111827;\n    font-size: 14px;\n}\n"""

    if css_old in css:
        css = css.replace(css_old, css_new, 1)
    else:
        print('WARN: CSS block not found', file=sys.stderr)

    with open(CSS_PATH, 'w', encoding='utf-8') as f:
        f.write(css)

if __name__ == '__main__':
    main()
