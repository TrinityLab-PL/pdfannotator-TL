#!/usr/bin/env python3
# Revert: Drawing / Area-Highlight-Strikeout click-to-select (plan 425b4fa5).
# Removes only the added hit-test blocks. Run from Moodle root; use with edit-with-maintenance.sh:
#   ./mod/pdfannotator/edit-with-maintenance.sh --cmd "python3 mod/pdfannotator/_revert_drawing_area_highlight_strikeout_click_select.py" || true; php admin/cli/maintenance.php --disable
import sys
js_path = "mod/pdfannotator/js_new/pdfannotator_new.v00054.js"
with open(js_path) as f:
    text = f.read()
orig_len = len(text)
# Remove Drawing hit-test block (from "var pageStateDraw" up to and including "return;" before "if (event.evt && event.evt.shiftKey)")
start_draw = "                var pageStateDraw = getPageState(pageNumber);"
end_draw = "                    return;\n                }\n                if (event.evt && event.evt.shiftKey)"
if start_draw in text and end_draw in text:
    i = text.find(start_draw)
    j = text.find(end_draw)
    if i != -1 and j != -1 and j > i:
        text = text[:i] + "                if (event.evt && event.evt.shiftKey)" + text[j + len(end_draw):]
# Remove Area/Highlight/Strikeout hit-test block
start_rect = "                if (tool === 'area' || tool === 'highlight' || tool === 'strikeout') {"
end_rect = "                        return;\n                    }\n                }\n                draftRect = new Konva.Rect"
if start_rect in text and end_rect in text:
    i = text.find(start_rect)
    j = text.find(end_rect)
    if i != -1 and j != -1 and j > i:
        text = text[:i] + "                draftRect = new Konva.Rect" + text[j + len(end_rect):]
if len(text) != orig_len:
    with open(js_path, 'w') as f:
        f.write(text)
    sys.exit(0)
sys.exit(0)
