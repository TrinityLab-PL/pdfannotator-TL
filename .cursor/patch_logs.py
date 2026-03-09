#!/usr/bin/env python3
"""Add extended debug instrumentation to shared/index.js. Run from moodle root via edit-with-maintenance.sh --cmd 'python3 mod/pdfannotator/.cursor/patch_logs.py'"""
import os

path = "mod/pdfannotator/shared/index.js"
with open(path, "r", encoding="utf-8") as f:
    s = f.read()

# 1) Extend createEditOverlay log: add svgRect, viewport, pathTransform, geomBaseLeft/geomBaseTop
old_log = "var _logD={sessionId:'7d36cc',location:'createEditOverlay',message:'drawing FF',hypothesisId:'H1H2H3',data:{baseLeft:baseLeft,baseTop:baseTop,styleLeft:styleLeft,styleTop:styleTop,usedRealRectForPosition:usedRealRectForPosition,realRect:{l:realRect.left,t:realRect.top,w:realRect.width,h:realRect.height},parentRect:{l:parentRect.left,t:parentRect.top,w:parentRect.width,h:parentRect.height},pageRect:{l:pageRect.left,t:pageRect.top},rect:{l:rect.left,t:rect.top,w:rect.width,h:rect.height},nearEdge:_near,overlayW:rect.width+paddingH*4,overlayH:rect.height+paddingV*4},timestamp:Date.now()};console.log('[DEBUG drawing FF]',_logD);fetch('http://localhost:7572/ingest/95e3202a-acc2-4a7c-ab43-d3db5f154f90',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7d36cc'},body:JSON.stringify(_logD)}).catch(function(){});"

new_log = "var _logD={sessionId:'7d36cc',location:'createEditOverlay',message:'drawing FF',hypothesisId:'H1H2H3',data:{baseLeft:baseLeft,baseTop:baseTop,styleLeft:styleLeft,styleTop:styleTop,usedRealRectForPosition:usedRealRectForPosition,realRect:{l:realRect.left,t:realRect.top,w:realRect.width,h:realRect.height},parentRect:{l:parentRect.left,t:parentRect.top,w:parentRect.width,h:parentRect.height},pageRect:{l:pageRect.left,t:pageRect.top},rect:{l:rect.left,t:rect.top,w:rect.width,h:rect.height},nearEdge:_near,overlayW:rect.width+paddingH*4,overlayH:rect.height+paddingV*4,svgRect:{l:_sr.left,t:_sr.top,w:_sr.width,h:_sr.height},viewport:(viewportData||{scale:currentScale}),pathTransform:(target.getAttribute('transform')||''),geomBaseLeft:(svgEl?_sr.left+rect.left:null),geomBaseTop:(svgEl?_sr.top+rect.top:null)},timestamp:Date.now()};console.log('[DEBUG drawing FF]',_logD);fetch('http://localhost:7572/ingest/95e3202a-acc2-4a7c-ab43-d3db5f154f90',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7d36cc'},body:JSON.stringify(_logD)}).catch(function(){});"

if old_log in s:
    s = s.replace(old_log, new_log, 1)
    print("OK: extended createEditOverlay log")
else:
    print("WARN: createEditOverlay log block not found (maybe already patched)")

# 2) getAnnotationRect path: log before/after scaleUp for path+FF
old_scale = """                                    if (!['svg', 'g'].includes(el.nodeName.toLowerCase())) {
                                        result = scaleUp(findSVGAtPoint(rect.left, rect.top), result);
                                    }"""

new_scale = """                                    if (!['svg', 'g'].includes(el.nodeName.toLowerCase())) {
                                        var _svgPath = findSVGAtPoint(rect.left, rect.top);
                                        var _pathBefore = (isFirefox && el.nodeName.toLowerCase() === 'path') ? { left: result.left, top: result.top, width: result.width, height: result.height } : null;
                                        result = scaleUp(_svgPath, result);
                                        if (_pathBefore) {
                                            var _vp = _svgPath ? (_svgPath.getAttribute('data-pdf-annotate-viewport') ? JSON.parse(_svgPath.getAttribute('data-pdf-annotate-viewport')) : {}) : {};
                                            fetch('http://localhost:7572/ingest/95e3202a-acc2-4a7c-ab43-d3db5f154f90',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7d36cc'},body:JSON.stringify({sessionId:'7d36cc',location:'getAnnotationRect_path',message:'path bbox',hypothesisId:'H4',data:{beforeScale:_pathBefore,afterScale:{left:result.left,top:result.top,width:result.width,height:result.height},svgRect:_svgPath?_svgPath.getBoundingClientRect():null,viewport:_vp},timestamp:Date.now()})}).catch(function(){});
                                        }
                                    }"""

if old_scale in s:
    s = s.replace(old_scale, new_scale, 1)
    print("OK: getAnnotationRect path log added")
else:
    print("WARN: getAnnotationRect scaleUp block not found")

# 3) calcDelta drawing: add fetch log after deltaY
old_calc = """                                            deltaY = (0, _utils.scaleDown)(svg, { y: moveY }).y;
                                            console.log("calcDelta drawing VIEWPORT: moveX=" + moveX + " moveY=" + moveY + " => deltaX=" + deltaX + " deltaY=" + deltaY);"""

new_calc = """                                            deltaY = (0, _utils.scaleDown)(svg, { y: moveY }).y;
                                            (function(){ var _vp = svg.getAttribute('data-pdf-annotate-viewport'); var _scale = _vp ? JSON.parse(_vp).scale : null; fetch('http://localhost:7572/ingest/95e3202a-acc2-4a7c-ab43-d3db5f154f90',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7d36cc'},body:JSON.stringify({sessionId:'7d36cc',location:'calcDelta_drawing',message:'drawing delta',hypothesisId:'H5',data:{overlayStartViewportRect:overlayStartViewportRect,overlayRect:{l:_or.left,t:_or.top,w:_or.width,h:_or.height},moveX:moveX,moveY:moveY,deltaX:deltaX,deltaY:deltaY,scale:_scale},timestamp:Date.now()})}).catch(function(){}); })();
                                            console.log("calcDelta drawing VIEWPORT: moveX=" + moveX + " moveY=" + moveY + " => deltaX=" + deltaX + " deltaY=" + deltaY);"""

if old_calc in s:
    s = s.replace(old_calc, new_calc, 1)
    print("OK: calcDelta drawing log added")
else:
    print("WARN: calcDelta block not found")

with open(path, "w", encoding="utf-8") as f:
    f.write(s)
print("Done.")
