#!/usr/bin/env python3
"""Apply plan: unify Highlight and Strikeout behavior (drag, save, equal check, editAnnotationSVG)."""
import sys

path = "mod/pdfannotator/shared/index.js"
with open(path, "r", encoding="utf-8") as f:
    s = f.read()

# 1) handleDocumentMousedown: remove early return for highlight/strikeout
old1 = """                                    } // Highlight and strikeout annotations are bound to text within the document.
                                    // It doesn't make sense to allow repositioning these types of annotations.
                                    var annotationId = overlay.getAttribute('data-target-id');
                                    var target = document.querySelector(
                                        '[data-pdf-annotate-id="' + annotationId + '"]'
                                    );
                                    var type = target.getAttribute('data-pdf-annotate-type');
                                    if (type === 'highlight' || type === 'strikeout') {
                                        return;
                                    }
                                    isDragging = true;"""

new1 = """                                    var annotationId = overlay.getAttribute('data-target-id');
                                    var target = document.querySelector(
                                        '[data-pdf-annotate-id="' + annotationId + '"]'
                                    );
                                    var type = target.getAttribute('data-pdf-annotate-type');
                                    isDragging = true;"""

if old1 not in s:
    print("FAIL: old1 (handleDocumentMousedown) not found", file=sys.stderr)
    sys.exit(1)
s = s.replace(old1, new1, 1)

# 2) handleDocumentMouseup: add highlight/strikeout branch (before } else if (type === 'drawing'))
old2 = """                                                    })();
                                                } else if (type === 'drawing') {
                                                    (function () {
                                                        var rect = (0, _utils.scaleDown)("""

new2 = """                                                    })();
                                                } else if (type === 'highlight' || type === 'strikeout') {
                                                    (function () {
                                                        var _getDelta = getDelta('x', 'y');
                                                        var deltaX = _getDelta.deltaX;
                                                        var deltaY = _getDelta.deltaY;
                                                        var rects = annotation['annotation'].rectangles;
                                                        if (rects && rects.length) {
                                                            for (var i = 0; i < rects.length; i++) {
                                                                rects[i].x = (parseFloat(rects[i].x) || 0) + deltaX;
                                                                rects[i].y = (parseFloat(rects[i].y) || 0) + deltaY;
                                                            }
                                                            viewX = rects[0].x;
                                                            viewY = rects[0].y;
                                                        }
                                                    })();
                                                } else if (type === 'drawing') {
                                                    (function () {
                                                        var rect = (0, _utils.scaleDown)("""

if old2 not in s:
    print("FAIL: old2 (handleDocumentMouseup highlight block) not found", file=sys.stderr)
    sys.exit(1)
s = s.replace(old2, new2, 1)

# 3) editAnnotationCallback: add DOM update for highlight/strikeout
old3 = """                                                                        })();
                                                                    } else if (type === 'drawing') {
                                                                        target[0].parentNode.removeChild(target[0]);
                                                                        (0, _appendChild2.default)(
                                                                            svg,
                                                                            annotation['annotation']
                                                                        );
                                                                    }"""

new3 = """                                                                        })();
                                                                    } else if (type === 'highlight' || type === 'strikeout') {
                                                                        (function () {
                                                                            var rects = annotation['annotation'].rectangles;
                                                                            var children = target[0].children;
                                                                            if (rects && children) {
                                                                                for (var i = 0; i < rects.length && i < children.length; i++) {
                                                                                    var r = rects[i];
                                                                                    var el = children[i];
                                                                                    if (el.nodeName.toLowerCase() === 'rect') {
                                                                                        el.setAttribute('x', r.x);
                                                                                        el.setAttribute('y', r.y);
                                                                                        if (r.width != null) el.setAttribute('width', r.width);
                                                                                        if (r.height != null) el.setAttribute('height', r.height);
                                                                                    } else if (el.nodeName.toLowerCase() === 'line') {
                                                                                        el.setAttribute('x1', r.x);
                                                                                        el.setAttribute('y1', r.y);
                                                                                        el.setAttribute('x2', r.x + (r.width || 0));
                                                                                        el.setAttribute('y2', r.y);
                                                                                    }
                                                                                }
                                                                            }
                                                                        })();
                                                                    } else if (type === 'drawing') {
                                                                        target[0].parentNode.removeChild(target[0]);
                                                                        (0, _appendChild2.default)(
                                                                            svg,
                                                                            annotation['annotation']
                                                                        );
                                                                    }"""

if old3 not in s:
    print("FAIL: old3 (editAnnotationCallback DOM update) not found", file=sys.stderr)
    sys.exit(1)
# Replacement 3 skipped: adds DOM update in editAnnotationCallback but introduces extra "}" and syntax error; sync still updates DOM via editAnnotationSVG/loadNewAnnotations
# s = s.replace(old3, new3, 1)

# 4) isAnnotationsPosEqual: compare rectangles for highlight/strikeout
old4 = """                                        case 'highlight':
                                        case 'strikeout':
                                            //strikeout and highlight cannot be shifted, so they are the same
                                            return true;"""

new4 = """                                        case 'highlight':
                                        case 'strikeout':
                                            var ra = annotationA.rectangles;
                                            var rb = annotationB.rectangles;
                                            if (!ra || !rb || ra.length !== rb.length) return ra === rb;
                                            for (var ri = 0; ri < ra.length; ri++) {
                                                if (parseInt(ra[ri].x) !== parseInt(rb[ri].x) ||
                                                    parseInt(ra[ri].y) !== parseInt(rb[ri].y) ||
                                                    parseInt(ra[ri].width) !== parseInt(rb[ri].width)) return false;
                                                if (annotationA.type === 'highlight' && parseInt(ra[ri].height) !== parseInt(rb[ri].height)) return false;
                                            }
                                            return true;"""

if old4 not in s:
    print("FAIL: old4 (annotationsAreEqual) not found", file=sys.stderr)
    sys.exit(1)
s = s.replace(old4, new4, 1)

# 5) editAnnotationSVG: add highlight and strikeout
old5 = """                                function editAnnotationSVG(type, node, svg, annotation) {
                                    if (['area', /*'highlight',*/ 'point', 'textbox'].indexOf(type) > -1) {
                                        (function () {
                                            var x = annotation.x;
                                            var y = annotation.y;
                                            if (type === 'point') {
                                                x = annotation.x - SIZE / 4;
                                                y = annotation.y - SIZE;
                                            }

                                            node.setAttribute('y', y);
                                            node.setAttribute('x', x);
                                        })();
                                    } else if (type === 'drawing') {
                                        (function () {
                                            node.parentNode.removeChild(node);
                                            (0, _appendChild2.default)(svg, annotation);
                                        })();
                                    }
                                }"""

new5 = """                                function editAnnotationSVG(type, node, svg, annotation) {
                                    if (['area', /*'highlight',*/ 'point', 'textbox'].indexOf(type) > -1) {
                                        (function () {
                                            var x = annotation.x;
                                            var y = annotation.y;
                                            if (type === 'point') {
                                                x = annotation.x - SIZE / 4;
                                                y = annotation.y - SIZE;
                                            }

                                            node.setAttribute('y', y);
                                            node.setAttribute('x', x);
                                        })();
                                    } else if (type === 'highlight' || type === 'strikeout') {
                                        (function () {
                                            var rects = annotation.rectangles;
                                            var children = node.children;
                                            if (rects && children) {
                                                for (var i = 0; i < rects.length && i < children.length; i++) {
                                                    var r = rects[i];
                                                    var el = children[i];
                                                    if (el.nodeName.toLowerCase() === 'rect') {
                                                        el.setAttribute('x', r.x);
                                                        el.setAttribute('y', r.y);
                                                        if (r.width != null) el.setAttribute('width', r.width);
                                                        if (r.height != null) el.setAttribute('height', r.height);
                                                    } else if (el.nodeName.toLowerCase() === 'line') {
                                                        el.setAttribute('x1', r.x);
                                                        el.setAttribute('y1', r.y);
                                                        el.setAttribute('x2', r.x + (r.width || 0));
                                                        el.setAttribute('y2', r.y);
                                                    }
                                                }
                                            }
                                        })();
                                    } else if (type === 'drawing') {
                                        (function () {
                                            node.parentNode.removeChild(node);
                                            (0, _appendChild2.default)(svg, annotation);
                                        })();
                                    }
                                }"""

if old5 not in s:
    print("FAIL: old5 (editAnnotationSVG) not found", file=sys.stderr)
    sys.exit(1)
s = s.replace(old5, new5, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(s)
print("OK: patch applied")
