# Plan: kursory = przechwycone ikony z paska (html2canvas)

- Wstrzyknięcie 1: po `bootstrapped: false\n    };\n\n    function viewerEl()` dodać zmienne i funkcje (cursorCache, CURSOR_SIZE, CAPTURE_SIZE, loadHtml2Canvas, scaleDataUrlToSize, captureIconFromBar, getCursorDataUrlForTool).
- Wstrzyknięcie 2: w setTool, po `viewer.classList.toggle('tl-tool-textbox', ...)` dodać ustawienie kursora (sync z cache lub async capture).

Hotspoty: point 12 22, area/strikeout 0 0, drawing/highlight/textbox 0 22.
