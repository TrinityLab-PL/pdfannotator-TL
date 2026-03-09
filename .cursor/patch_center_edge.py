#!/usr/bin/env python3
"""Center overlay on path when nearEdge (drawing, FF): base = center(realRect) - half(overlay size)."""
path = "mod/pdfannotator/shared/index.js"
with open(path, "r", encoding="utf-8") as f:
    s = f.read()

old = """                                        if (annotType === 'drawing' && /firefox/i.test(navigator.userAgent) && svgEl) {
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

# overlay size (same as later: rect.width + paddingH*4, rect.height + paddingV*4)
# we need to center overlay on realRect, so baseLeft = realRect.left + realRect.width/2 - overlayW/2
new = """                                        if (annotType === 'drawing' && /firefox/i.test(navigator.userAgent) && svgEl) {
                                            var svgRect = svgEl.getBoundingClientRect();
                                            var edgeM = 40;
                                            var nearEdge = rect.left < edgeM || rect.top < edgeM || (rect.left + rect.width) > (svgRect.width - edgeM) || (rect.top + rect.height) > (svgRect.height - edgeM);
                                            if (nearEdge) {
                                                var _ow = rect.width + paddingH * 4;
                                                var _oh = rect.height + paddingV * 4;
                                                baseLeft = realRect.left + (realRect.width / 2) - (_ow / 2);
                                                baseTop = realRect.top + (realRect.height / 2) - (_oh / 2);
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
    print("OK: overlay centered on path at edge")
else:
    print("WARN: block not found")
    raise SystemExit(1)
