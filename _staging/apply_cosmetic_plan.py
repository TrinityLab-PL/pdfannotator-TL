#!/usr/bin/env python3
"""Apply cosmetic plan: comments font, tool persistence, strikeout colors, highlight icon."""
import os

root = os.environ.get('MOODLE_ROOT', os.getcwd())
css_path = os.path.join(root, 'mod', 'pdfannotator', 'styles.css')
js_path = os.path.join(root, 'mod', 'pdfannotator', 'js_new', 'pdfannotator_new.v00054.js')

# --- 1. styles.css ---
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

# .chat-message-text: add font-size 14px
old1 = """.path-mod-pdfannotator .chat-message-text {
    display: inline-block;
    width: 100%;
}"""
new1 = """.path-mod-pdfannotator .chat-message-text {
    display: inline-block;
    width: 100%;
    font-size: 14px;
}"""
if old1 not in css:
    raise SystemExit('CSS: .chat-message-text block not found')
css = css.replace(old1, new1, 1)

# #comment-wrapper .editor_atto_content (and sibling selectors): add font-size 14px
old2 = """.path-mod-pdfannotator #myarea,
.path-mod-pdfannotator .chat-message textarea,
.path-mod-pdfannotator #comment-wrapper .editor_atto_content {
    width: 100%;
    min-height: 10em !important;
}"""
new2 = """.path-mod-pdfannotator #myarea,
.path-mod-pdfannotator .chat-message textarea,
.path-mod-pdfannotator #comment-wrapper .editor_atto_content {
    width: 100%;
    min-height: 10em !important;
    font-size: 14px;
}"""
if old2 not in css:
    raise SystemExit('CSS: editor_atto_content block not found')
css = css.replace(old2, new2, 1)

# .tl-icon-highlight-marker: height 18px -> 20px
old3 = """.tl-icon-highlight-marker {
    width: 18px;
    height: 18px;
    display: block;
    fill: currentColor;
}"""
new3 = """.tl-icon-highlight-marker {
    width: 18px;
    height: 20px;
    display: block;
    fill: currentColor;
}"""
if old3 not in css:
    raise SystemExit('CSS: .tl-icon-highlight-marker block not found')
css = css.replace(old3, new3, 1)

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css)

# --- 2. pdfannotator_new.v00054.js ---
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Remove setTool('cursor') after point
old_pt = """                });
                setTool('cursor');
        bindVisibilityRecovery();"""
new_pt = """                });
        bindVisibilityRecovery();"""
if old_pt not in js:
    raise SystemExit('JS: point setTool block not found')
js = js.replace(old_pt, new_pt, 1)

# Remove setTool('cursor') after drawing (mouseup)
old_draw = """                    });
                }
                setTool('cursor');
                return;
            }

            if (pointer) {
                clearSelection();"""
new_draw = """                    });
                }
                return;
            }

            if (pointer) {
                clearSelection();"""
if old_draw not in js:
    raise SystemExit('JS: drawing setTool block not found')
js = js.replace(old_draw, new_draw, 1)

# Remove setTool('cursor') after rect tool
old_rect = """                if (annotation) {
                    createAnnotation(pageNumber, annotation);
                    setTool('cursor');
                }
            }
        });"""
new_rect = """                if (annotation) {
                    createAnnotation(pageNumber, annotation);
                }
            }
        });"""
if old_rect not in js:
    raise SystemExit('JS: rect setTool block not found')
js = js.replace(old_rect, new_rect, 1)

# Remove setTool('cursor') after Shift+drawing (keyup)
old_shift = """                lines: [finalPoints.map(function (v) { return v / scale; })]
            });
            setTool('cursor');
        });
    }

    function rectToolPayload"""
new_shift = """                lines: [finalPoints.map(function (v) { return v / scale; })]
            });
        });
    }

    function rectToolPayload"""
if old_shift not in js:
    raise SystemExit('JS: shift-drawing setTool block not found')
js = js.replace(old_shift, new_shift, 1)

# Strikeout: color #f43f5e -> #6b7280, fill rgba(244,63,94,0.10) -> rgba(51,51,51,0.25)
js = js.replace("var color = annotation.type === 'strikeout' ? '#f43f5e' :", "var color = annotation.type === 'strikeout' ? '#6b7280' :")
js = js.replace("fill: isStrikeout ? 'rgba(244, 63, 94, 0.10)' :", "fill: isStrikeout ? 'rgba(51, 51, 51, 0.25)' :")

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)

print('OK: cosmetic plan applied')
