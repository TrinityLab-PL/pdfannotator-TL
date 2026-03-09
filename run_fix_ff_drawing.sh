#!/usr/bin/env bash
# Jednorazowy fix: drawing w FF – overlay z getBoundingClientRect. Uruchom z katalogu Moodle.
set -e
cd "$(dirname "$0")/../.."
php admin/cli/maintenance.php --enable
python3 << 'PYEOF'
p = "mod/pdfannotator/shared/index.js"
with open(p, "r") as f:
    s = f.read()
old = """                                    function calcDelta(x, y) {
                                        var border = OVERLAY_BORDER_SIZE;
                                        var overlayX = parseFloat(overlay.style.left) || overlay.offsetLeft;
                                        var overlayY = parseFloat(overlay.style.top) || overlay.offsetTop;
                                        var deltaX = 0;
                                        var deltaY = 0;
                                        if (type === 'drawing') {
                                            var moveX = overlayX - dragStartX;
                                            var moveY = overlayY - dragStartY;
                                            deltaX = (0, _utils.scaleDown)(svg, { x: moveX }).x;
                                            deltaY = (0, _utils.scaleDown)(svg, { y: moveY }).y;
                                        } else {"""
new = """                                    function calcDelta(x, y) {
                                        var border = OVERLAY_BORDER_SIZE;
                                        var overlayX, overlayY;
                                        if (type === 'drawing') {
                                            var parentRect = overlay.parentNode.getBoundingClientRect();
                                            var overlayRect = overlay.getBoundingClientRect();
                                            overlayX = overlayRect.left - parentRect.left;
                                            overlayY = overlayRect.top - parentRect.top;
                                        } else {
                                            overlayX = parseFloat(overlay.style.left) || overlay.offsetLeft;
                                            overlayY = parseFloat(overlay.style.top) || overlay.offsetTop;
                                        }
                                        var deltaX = 0;
                                        var deltaY = 0;
                                        if (type === 'drawing') {
                                            var moveX = overlayX - dragStartX;
                                            var moveY = overlayY - dragStartY;
                                            deltaX = (0, _utils.scaleDown)(svg, { x: moveX }).x;
                                            deltaY = (0, _utils.scaleDown)(svg, { y: moveY }).y;
                                        } else {"""
if old not in s:
    raise SystemExit("old block not found")
s = s.replace(old, new, 1)
with open(p, "w") as f:
    f.write(s)
print("OK")
PYEOF
php admin/cli/purge_caches.php
php admin/cli/maintenance.php --disable
grep -n "overlayRect.left - parentRect.left" mod/pdfannotator/shared/index.js
