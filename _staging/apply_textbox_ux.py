#!/usr/bin/env python3
"""
Aplikuje zmiany Textbox UX do js_new/pdfannotator_new.v00054.js i styles.css.
Uruchamiany z katalogu głównego Moodle; ścieżki względem cwd.
"""
import os
import sys

MOODLE_ROOT = os.environ.get('MOODLE_ROOT', '/var/www/html/moodle')
BASE = os.path.join(MOODLE_ROOT, 'mod', 'pdfannotator')
JS_PATH = os.path.join(BASE, 'js_new', 'pdfannotator_new.v00054.js')
CSS_PATH = os.path.join(BASE, 'styles.css')

def main():
    if not os.path.isdir(BASE):
        print('Katalog nie znaleziony:', BASE, file=sys.stderr)
        sys.exit(1)

    # --- JS: setTool - dodanie klasy viewer
    js_old_1 = """        document.querySelectorAll('#tl-express-toolbar [data-proxy-tool]').forEach(function (button) {
            var activeTool = button.getAttribute('data-proxy-tool') === state.activeTool;
            button.classList.toggle('active-tool', activeTool);
        });
        if (state.activeTool !== 'cursor') {"""

    js_new_1 = """        document.querySelectorAll('#tl-express-toolbar [data-proxy-tool]').forEach(function (button) {
            var activeTool = button.getAttribute('data-proxy-tool') === state.activeTool;
            button.classList.toggle('active-tool', activeTool);
        });
        var viewer = viewerEl();
        if (viewer) {
            viewer.classList.toggle('tl-tool-textbox', state.activeTool === 'textbox');
        }
        if (state.activeTool !== 'cursor') {"""

    # --- JS: mousedown - textbox bez draftRect
    js_old_2 = """                return;
            }

            draftStart = pointer;

            if (tool === 'drawing') {"""

    js_new_2 = """                return;
            }

            if (tool === 'textbox') {
                draftStart = pointer;
                return;
            }

            draftStart = pointer;

            if (tool === 'drawing') {"""

    # --- JS: mouseup - pointer + textbox click
    js_old_3 = """        stage.on('mouseup touchend', function () {
            var tool = state.activeTool;
            if (drawing) {"""

    js_new_3 = """        stage.on('mouseup touchend', function () {
            var tool = state.activeTool;
            var pointer = stage.getPointerPosition();
            if (drawing) {"""

    js_old_4 = """                return;
            }

            if (draftRect && draftStart) {
                var finalRect = {"""

    js_new_4 = """                return;
            }

            if (tool === 'textbox' && pointer && !draftRect) {
                showNewTextboxEditor(pageNumber, pointer.x, pointer.y);
                return;
            }

            if (draftRect && draftStart) {
                var finalRect = {"""

    # --- JS: showNewTextboxEditor (wstawka przed drawAnnotation)
    js_old_5 = """        });
    }

    function drawAnnotation(pageNumber, annotation) {
        
                var pageState = getPageState(pageNumber);"""

    js_new_5 = """        });
    }

    function showNewTextboxEditor(pageNumber, pointerX, pointerY) {
        var viewer = viewerEl();
        if (!viewer) {
            return;
        }
        var pageElement = viewer.querySelector('.page[data-page-number="' + pageNumber + '"]');
        if (!pageElement) {
            return;
        }

        var editor = document.createElement('textarea');
        editor.className = 'tl-inline-text-editor';
        editor.value = '';

        var editorFontSize = Math.max(10, Number(state.textSize || 14));
        var editorFontFamily = state.textFont || 'Open Sans';

        editor.style.left = pointerX + 'px';
        editor.style.top = pointerY + 'px';
        editor.style.width = '140px';
        editor.style.height = '44px';
        editor.style.fontSize = editorFontSize + 'px';
        editor.style.fontFamily = editorFontFamily + ', sans-serif';
        editor.style.color = state.textColor || '#111827';

        pageElement.appendChild(editor);

        editor.addEventListener('mousedown', function (event) { event.stopPropagation(); });
        editor.addEventListener('click', function (event) { event.stopPropagation(); });
        editor.addEventListener('dblclick', function (event) { event.stopPropagation(); });

        editor.focus();
        editor.select();

        var committed = false;

        function cleanup() {
            try {
                editor.remove();
            } catch (e) {}
            setTool('cursor');
        }

        function commit() {
            if (committed) {
                return;
            }
            committed = true;

            var content = String(editor.value || '').trim();
            if (!content) {
                cleanup();
                return;
            }

            var pageState = getPageState(pageNumber);
            if (!pageState) {
                cleanup();
                return;
            }

            var centerX = (pointerX || 0) / state.scale;
            var centerY = (pointerY || 0) / state.scale;

            var annotation = {
                type: 'textbox',
                x: centerX - 20,
                y: centerY - 15,
                width: 40,
                height: 30,
                size: editorFontSize,
                font: editorFontFamily,
                color: state.textColor || '#111827',
                content: content
            };

            fitTextboxAroundContent(annotation);

            ajax('create', {
                page_Number: String(pageNumber),
                annotation: JSON.stringify(annotation)
            }).then(function (created) {
                if (!created || !created.uuid) {
                    return;
                }
                var createdGroup = drawAnnotation(pageNumber, created);
                var pageState = getPageState(pageNumber);
                if (pageState) {
                    pageState.annotationLayer.draw();
                }
                if (createdGroup) {
                    selectAnnotation(pageNumber, createdGroup);
                }
                ensureCommentPanelVisible();
                loadCommentsForAnnotation(created.uuid, created.type);
            }).catch(function (error) {
                console.error('Create annotation failed', error);
            }).finally(function () {
                cleanup();
            });
        }

        editor.addEventListener('blur', commit);
        editor.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                committed = true;
                cleanup();
                return;
            }
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                commit();
            }
        });
    }

    function drawAnnotation(pageNumber, annotation) {
        
                var pageState = getPageState(pageNumber);"""

    # --- JS: przezroczystość tła textbox
    js_old_6 = "fill: 'rgba(235, 242, 252, 0.92)'"
    js_new_6 = "fill: 'rgba(235, 242, 252, 0.55)'"

    with open(JS_PATH, 'r', encoding='utf-8') as f:
        js = f.read()

    js_ok = True
    for old, new in [(js_old_1, js_new_1), (js_old_2, js_new_2), (js_old_3, js_new_3),
                     (js_old_4, js_new_4), (js_old_5, js_new_5), (js_old_6, js_new_6)]:
        if old not in js:
            print('JS: brak oczekiwanego fragmentu – nie zapisuję', file=sys.stderr)
            js_ok = False
            break
        js = js.replace(old, new, 1)
    if js_ok:
        with open(JS_PATH, 'w', encoding='utf-8') as f:
            f.write(js)

    # --- CSS
    with open(CSS_PATH, 'r', encoding='utf-8') as f:
        css = f.read()

    css_old_1 = """.path-mod-pdfannotator .cursor-edit * {
    cursor: pointer !important;
}

/******************************************** START: mainly for overview page *******************************************/"""

    css_new_1 = """.path-mod-pdfannotator .cursor-edit * {
    cursor: pointer !important;
}

/* Kursor I-beam dla narzędzia Textbox */
.path-mod-pdfannotator #viewer.tl-tool-textbox,
.path-mod-pdfannotator #viewer.tl-tool-textbox .tl-konva-host,
.path-mod-pdfannotator #viewer.tl-tool-textbox .tl-pdf-canvas {
    cursor: text;
}

/******************************************** START: mainly for overview page *******************************************/"""

    css_old_2 = "background: rgba(240, 246, 253, 0.97);"
    css_new_2 = "background: rgba(240, 246, 253, 0.65);"

    css_ok = True
    if css_old_1 not in css:
        print('CSS: brak oczekiwanego fragmentu (cursor) – nie zapisuję', file=sys.stderr)
        css_ok = False
    else:
        css = css.replace(css_old_1, css_new_1, 1)
    if css_old_2 not in css:
        print('CSS: brak oczekiwanego fragmentu (background) – nie zapisuję', file=sys.stderr)
        css_ok = False
    else:
        css = css.replace(css_old_2, css_new_2, 1)

    if css_ok:
        with open(CSS_PATH, 'w', encoding='utf-8') as f:
            f.write(css)

    if js_ok and css_ok:
        print('Zmiany zastosowane: ' + JS_PATH + ', ' + CSS_PATH)
    else:
        sys.exit(1)

if __name__ == '__main__':
    main()
