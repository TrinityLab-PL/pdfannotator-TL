#!/usr/bin/env python3
"""Move textbox single-click block from mousemove (wrong) to mouseup (correct)."""
JS = 'mod/pdfannotator/js_new/pdfannotator_new.v00054.js'

def main():
    with open(JS, 'r', encoding='utf-8') as f:
        s = f.read()

    # 1) Remove from mousemove
    old_mmove = """            if (tool === 'textbox' && pointer && !draftRect) {
                if (state.ignoreNextTextboxClick) {
                    state.ignoreNextTextboxClick = false;
                    return;
                }
                showNewTextboxEditor(pageNumber, pointer.x, pointer.y);
                return;
            }

            if (draftRect && draftStart) {
                var nextRect = normalizeRect(draftStart.x, draftStart.y, pointer.x, pointer.y);
                draftRect.setAttrs(nextRect);
                getPageState(pageNumber).overlayLayer.batchDraw();
            }
        });

        stage.on('mouseup touchend', function () {"""
    new_mmove = """            if (draftRect && draftStart) {
                var nextRect = normalizeRect(draftStart.x, draftStart.y, pointer.x, pointer.y);
                draftRect.setAttrs(nextRect);
                getPageState(pageNumber).overlayLayer.batchDraw();
            }
        });

        stage.on('mouseup touchend', function () {"""
    if old_mmove not in s:
        raise SystemExit('mousemove block not found')
    s = s.replace(old_mmove, new_mmove, 1)

    # 2) Add to mouseup before "if (draftRect && draftStart)"
    old_mup = """            }

            if (draftRect && draftStart) {
                var finalRect = {
                    x: draftRect.x(),
                    y: draftRect.y(),
                    width: draftRect.width(),
                    height: draftRect.height()
                };
                draftRect.destroy();
                draftRect = null;
                draftStart = null;
                getPageState(pageNumber).overlayLayer.draw();

                if (finalRect.width < 4 || finalRect.height < 4) {
                    return;
                }

                var annotation = rectToolPayload(tool, finalRect);"""
    new_mup = """            }

            if (tool === 'textbox' && pointer && !draftRect) {
                if (state.ignoreNextTextboxClick) {
                    state.ignoreNextTextboxClick = false;
                    return;
                }
                showNewTextboxEditor(pageNumber, pointer.x, pointer.y);
                return;
            }

            if (draftRect && draftStart) {
                var finalRect = {
                    x: draftRect.x(),
                    y: draftRect.y(),
                    width: draftRect.width(),
                    height: draftRect.height()
                };
                draftRect.destroy();
                draftRect = null;
                draftStart = null;
                getPageState(pageNumber).overlayLayer.draw();

                if (finalRect.width < 4 || finalRect.height < 4) {
                    return;
                }

                var annotation = rectToolPayload(tool, finalRect);"""
    if old_mup not in s:
        raise SystemExit('mouseup block not found')
    s = s.replace(old_mup, new_mup, 1)

    with open(JS, 'w', encoding='utf-8') as f:
        f.write(s)
    print('Patched:', JS)

if __name__ == '__main__':
    main()
