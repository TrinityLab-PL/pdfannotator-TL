#!/usr/bin/env python3
"""
Port wygładzania rysowania (LazyBrush) z v00055 do v00054.
Dodaje: drawingLazy, inicjalizację w mousedown (drawing), użycie w mousemove, zerowanie w mouseup.
Modyfikuje: js_new/pdfannotator_new.v00054.js. Uruchomić z katalogu Moodle.
"""
import os

root = os.getcwd()
JS = os.path.join(root, 'mod', 'pdfannotator', 'js_new', 'pdfannotator_new.v00054.js')

with open(JS, 'r', encoding='utf-8') as f:
    js = f.read()

# 1) Dodaj var drawingLazy = null;
old_vars = """    function bindStageCreation(stage, pageNumber) {
        var drawing = null;
        var draftRect = null;
        var draftStart = null;

        stage.on('mousedown touchstart', function (event) {"""
new_vars = """    function bindStageCreation(stage, pageNumber) {
        var drawing = null;
        var draftRect = null;
        var draftStart = null;
        var drawingLazy = null;

        stage.on('mousedown touchstart', function (event) {"""
if old_vars not in js:
    raise SystemExit('bindStageCreation vars block not found')
js = js.replace(old_vars, new_vars, 1)

# 2) W mousedown przy tool === 'drawing': po annotationLayer.draw() dodaj inicjalizację LazyBrush
old_drawing_start = """            if (tool === 'drawing') {
                var liveWidth = Math.max(1, (state.strokeWidth || 2) * state.scale);
                drawing = new Konva.Line({
                    points: [pointer.x, pointer.y],
                    stroke: state.drawingStroke,
                    strokeWidth: liveWidth,
                    hitStrokeWidth: Math.max(10, liveWidth * 4),
                    lineCap: 'round',
                    lineJoin: 'round'
                });
                getPageState(pageNumber).annotationLayer.add(drawing);
                getPageState(pageNumber).annotationLayer.draw();
            } else {"""
new_drawing_start = """            if (tool === 'drawing') {
                var liveWidth = Math.max(1, (state.strokeWidth || 2) * state.scale);
                drawing = new Konva.Line({
                    points: [pointer.x, pointer.y],
                    stroke: state.drawingStroke,
                    strokeWidth: liveWidth,
                    hitStrokeWidth: Math.max(10, liveWidth * 4),
                    lineCap: 'round',
                    lineJoin: 'round'
                });
                getPageState(pageNumber).annotationLayer.add(drawing);
                getPageState(pageNumber).annotationLayer.draw();
                if (window['lazy-brush'] && window['lazy-brush'].LazyBrush) {
                    drawingLazy = new window['lazy-brush'].LazyBrush({ radius: 20, enabled: true, initialPoint: { x: pointer.x, y: pointer.y } });
                }
            } else {"""
if old_drawing_start not in js:
    raise SystemExit('drawing mousedown block not found')
js = js.replace(old_drawing_start, new_drawing_start, 1)

# 3) W mousemove: użyj LazyBrush gdy dostępny
old_mousemove = """            if (drawing) {
                var points = drawing.points().concat([pointer.x, pointer.y]);
                drawing.points(points);
                getPageState(pageNumber).annotationLayer.batchDraw();
            }"""
new_mousemove = """            if (drawing) {
                var points;
                if (drawingLazy && window['lazy-brush']) {
                    drawingLazy.update({ x: pointer.x, y: pointer.y });
                    var brush = drawingLazy.getBrushCoordinates();
                    points = drawing.points().concat([brush.x, brush.y]);
                } else {
                    points = drawing.points().concat([pointer.x, pointer.y]);
                }
                drawing.points(points);
                getPageState(pageNumber).annotationLayer.batchDraw();
            }"""
if old_mousemove not in js:
    raise SystemExit('drawing mousemove block not found')
js = js.replace(old_mousemove, new_mousemove, 1)

# 4) W mouseup przy drawing: zeruj drawingLazy
old_mouseup = """            if (drawing) {
                var linePoints = drawing.points();
                drawing.destroy();
                drawing = null;
                getPageState(pageNumber).annotationLayer.draw();"""
new_mouseup = """            if (drawing) {
                var linePoints = drawing.points();
                drawing.destroy();
                drawing = null;
                drawingLazy = null;
                getPageState(pageNumber).annotationLayer.draw();"""
if old_mouseup not in js:
    raise SystemExit('drawing mouseup block not found')
js = js.replace(old_mouseup, new_mouseup, 1)

with open(JS, 'w', encoding='utf-8') as f:
    f.write(js)

print('port_lazy_brush_to_v00054: OK')
