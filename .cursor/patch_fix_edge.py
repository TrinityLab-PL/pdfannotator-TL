#!/usr/bin/env python3
"""Fix: use realRect for overlay position when nearEdge for all stroke widths (drawing, FF). Run from moodle root via edit-with-maintenance.sh."""
path = "mod/pdfannotator/shared/index.js"
with open(path, "r", encoding="utf-8") as f:
    s = f.read()

old = """                                        if (annotType === 'drawing' && /firefox/i.test(navigator.userAgent)) {
                                            var strokeW = parseFloat(target.getAttribute('stroke-width') || target.getAttribute('strokeWidth') || 1);
                                            if (strokeW > 2 && svgEl) {
                                                var svgRect = svgEl.getBoundingClientRect();
                                                var edgeM = 40;
                                                var nearEdge = rect.left < edgeM || rect.top < edgeM || (rect.left + rect.width) > (svgRect.width - edgeM) || (rect.top + rect.height) > (svgRect.height - edgeM);
                                                if (nearEdge) {
                                                    baseLeft = realRect.left;
                                                    baseTop = realRect.top;
                                                    usedRealRectForPosition = true;
                                                } else {
                                                    baseLeft = svgRect.left + rect.left;
                                                    baseTop = svgRect.top + rect.top;
                                                }
                                            }
                                        }"""

new = """                                        if (annotType === 'drawing' && /firefox/i.test(navigator.userAgent) && svgEl) {
                                            var svgRect = svgEl.getBoundingClientRect();
                                            var edgeM = 40;
                                            var nearEdge = rect.left < edgeM || rect.top < edgeM || (rect.left + rect.width) > (svgRect.width - edgeM) || (rect.top + rect.height) > (svgRect.height - edgeM);
                                            if (nearEdge) {
                                                baseLeft = realRect.left;
                                                baseTop = realRect.top;
                                                usedRealRectForPosition = true;
                                            } else {
                                                var strokeW = parseFloat(target.getAttribute('stroke-width') || target.getAttribute('strokeWidth') || 1);
                                                if (strokeW > 2) {
                                                    baseLeft = svgRect.left + rect.left;
                                                    baseTop = svgRect.top + rect.top;
                                                }
                                            }
                                        }"""

if old in s:
    s = s.replace(old, new, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(s)
    print("OK: use realRect at edge for all stroke widths")
else:
    print("WARN: block not found")
    raise SystemExit(1)
