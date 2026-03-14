(function () {
    'use strict';

    var state = {
        cm: null,
        documentObject: null,
        contextId: null,
        userId: null,
        capabilities: {},
        toolbarSettings: {},
        initialPage: 1,
        annoId: null,
        commId: null,
        editorSettings: {},
        pdf: null,
        scale: 1.33,
        activeTool: 'cursor',
        pages: {},
        activeAnnotation: null,
        deleteButton: null,
        deleteButtonPage: null,
        drawingStroke: '#ae090f',
        textColor: '#1f2937',
        annotationColor: '#fff70f',
        strokeWidth: 7,
        textSize: 14,
        textFont: 'Open Sans',
        commentTarget: null,
        commentRequestToken: 0,
        annotationsLoadedOnce: false,
        annotationWarmupTimer: null,
        annotationWarmupRounds: 0,
        ajaxNonce: 0,
        keyboardBound: false,
        deletedAnnotations: [],
        pendingDeletedAnnotations: {},
        restoreInitAttempts: 0,
        annotationFastWarmupTimer: null,
        commentNavObserver: null,
        commentNavMuting: false,
        recoveryTimer: null,
        visibilityRecoveryBound: false,
        initialLoadRetryTimer: null,
        initialLoadRetryCount: 0,
        bootstrapped: false
    };
    var cursorCache = {};
    var CURSOR_SIZE = 24;

    function buildSvgCursor(tool) {
        var f = '#4d5151';
        var s = '';
        if (tool === 'point') {
            s = '<circle cx="12" cy="7" r="5" fill="' + f + '"/><line x1="12" y1="12" x2="12" y2="22" stroke="' + f + '" stroke-width="2.5" stroke-linecap="round"/>';
        } else if (tool === 'area') {
            s = '<rect x="2" y="2" width="20" height="20" fill="none" stroke="' + f + '" stroke-width="2.5"/>';
        } else if (tool === 'drawing') {
            s = '<path fill="' + f + '" d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34c-.39-.39-1.02-.39-1.41 0L9 12.25 11.75 15l8.96-8.96c.39-.39.39-1.02 0-1.41z"/>';
        } else if (tool === 'highlight') {
            s = '<svg viewBox="-3.62 0 126.5 112.6" width="24" height="24"><g fill="' + f + '"><path d="m30.36,55.98 35.29,35.29c0.47,0.4 1.07,0.62 1.65,0.62 0.51,0 0.99-0.16 1.34-0.51l0.09-0.09 48.08-56.25c0.5-0.58 0.77-1.29 0.77-1.97 0-0.56-0.2-1.12-0.63-1.55L91.34,5.91c-0.42-0.42-0.95-0.61-1.5-0.61-0.71,0-1.44,0.28-2.07,0.79L30.15,52.8l-0.11,0.11c-0.32,0.32-0.46,0.77-0.46,1.25 0,0.58 0.21,1.17 0.59,1.64z"/><path d="M29.49,111.88c-2.2,0.91-6.3,0.75-7.12,0.61L2.36,110.28c-1.45-0.16-4.8-0.18-5.86-3.13-0.52-2.57 0.8-4.24 1.21-4.65 0,0 11.32-10.94 16.92-16.46 1.57-1.55 4.69-4.69 4.69-4.69l0.01,0.01 0.07-0.07c0.19-0.18 0.37-0.39 0.54-0.62 0.16-0.22 0.3-0.48 0.43-0.75 0.92-1.99 0.54-6.28 0.24-9.63h0.01c-0.09-0.96-0.16-1.85-0.2-2.46-0.56-4.42 2.26-6.98 5.09-9.51-0.77-1.25-1.18-2.69-1.19-4.11-0.02-1.84 0.62-3.67 1.99-5.04 0.13-0.13 0.3-0.28 0.52-0.46L84.44,1.99C86.02,0.7 87.94,0 89.84,0c1.9,0 3.77,0.68 5.25,2.16l25.61,25.61c1.48,1.48 2.18,3.37 2.18,5.29 0,1.91-0.71,3.85-2.05,5.41L72.75,94.73c-0.15,0.18-0.28,0.32-0.36,0.4-1.4,1.4-3.26,2.06-5.13,2.04-1.41-0.01-2.84-0.41-4.07-1.17-2.53,2.84-5.09,5.65-9.51,5.09-0.91-0.05-1.66-0.12-2.46-0.19v-0.01c-3.35-0.3-7.63-0.68-9.63,0.25-0.28,0.13-0.53,0.27-0.75,0.43-0.18,0.13-0.36,0.28-0.53,0.45-0.05,0.06-0.1,0.12-0.16,0.17l-4.69,4.69c-1.03,1.03-3.57,4.01-5.97,5z"/><path d="m20.24,87.9 1.07,1.07 11.2,11.2 1.07,1.07 5-5c1.73,0.23 3.37-1.6 5-3.43L29.08,62.2c-1.83,1.63-3.67,3.28-3.42,5.01l0.02,0.21c0.05,0.86 0.12,1.61 0.19,2.4h0.01c0.35,3.96 0.8,9.03-0.71,12.3-0.26,0.55-0.56,1.09-0.93,1.6-0.34,0.47-0.73,0.93-1.19,1.36l0.01,0.01z"/></g></svg>';
        } else if (tool === 'strikeout') {
            var strikeSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 537.643 537.643" width="18" height="18"><g fill="' + f + '"><path d="M399.768,239.341c-24.479-12.105-60.643-23.837-108.771-35.202c-51.035-12.051-83.17-23.624-96.402-34.731c-10.404-8.739-15.594-19.253-15.594-31.542c0-13.47,5.544-24.217,16.658-32.253c17.247-12.521,41.114-18.782,71.592-18.782c29.529,0,51.69,5.851,66.458,17.54c14.761,11.702,24.388,30.9,28.88,57.595l104.909-4.608c-1.658-47.724-18.96-85.882-51.928-114.475C382.62,14.296,333.525,0,268.316,0c-39.933,0-74.015,6.022-102.253,18.073c-28.231,12.05-49.847,29.59-64.848,52.632c-15.006,23.029-22.509,47.791-22.509,74.248c0,36.365,12.503,67.828,37.46,94.389H399.768L399.768,239.341z"/><path d="M351.775,427.592c-17.13,14.303-42.59,21.445-76.372,21.445c-31.897,0-57.234-8.029-76.029-24.102c-18.776-16.064-31.242-41.23-37.387-75.49l-102.069,9.928c6.848,58.121,27.876,102.369,63.085,132.725c35.202,30.361,85.643,45.545,151.335,45.545c45.129,0,82.81-6.322,113.061-18.961c30.239-12.643,53.63-31.951,70.172-57.949c16.536-25.986,24.811-53.869,24.811-83.643c0-22.582-3.348-42.619-9.884-60.232H306.529c9.97,2.766,17.467,5.012,22.388,6.713c17.95,6.377,30.538,13.881,37.742,22.504c7.209,8.629,10.813,19.088,10.813,31.371C377.473,396.582,368.911,413.297,351.775,427.592z"/><path d="M28.101,298.498h207.486h228.41h45.545c10.142,0,18.36-8.221,18.36-18.361v-4.082c0-10.141-8.219-18.36-18.36-18.36h-80.453H136.89H28.101c-10.141,0-18.36,8.219-18.36,18.36v4.082C9.74,290.277,17.959,298.498,28.101,298.498z"/></g></svg>';
            return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(strikeSvg)));
        }
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="' + CURSOR_SIZE + '" height="' + CURSOR_SIZE + '">' + s + '</svg>';
        return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    }

    function getCursorDataUrlForTool(tool, callback) {
        if (tool === 'cursor') { callback(null); return; }
        if (cursorCache[tool]) { callback(cursorCache[tool]); return; }
        var dataUrl = buildSvgCursor(tool);
        if (dataUrl) { cursorCache[tool] = dataUrl; }
        callback(dataUrl || null);
    }

    function viewerEl() {
        return document.getElementById('viewer');
    }

    function getPageElement(pageNumber) {
        var v = viewerEl();
        return v ? v.querySelector('.page[data-page-number="' + pageNumber + '"]') : null;
    }

    function getPageState(pageNumber) {
        return state.pages[pageNumber] || null;
    }

    function ajax(action, payload, method) {
        var base = ((window.M && M.cfg && M.cfg.wwwroot) ? M.cfg.wwwroot : '') + '/mod/pdfannotator/action.php';
        state.ajaxNonce += 1;
        // Critical anti-cache: unique URL per request protects against stale intermediary caches.
        var url = base + '?_ts=' + String(Date.now()) + '_' + String(state.ajaxNonce);
        var body = new URLSearchParams();
        var data = payload || {};
        Object.keys(data).forEach(function (key) {
            if (data[key] !== undefined && data[key] !== null) {
                body.append(key, data[key]);
            }
        });
        body.append('action', action);
        body.append('documentId', String(state.documentObject.annotatorid));
        if (!body.has('sesskey') && window.M && M.cfg && M.cfg.sesskey) {
            body.append('sesskey', M.cfg.sesskey);
        }

        return fetch(url, {
            method: method || 'POST',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            },
            body: body.toString()
        }).then(function (response) {
            if (!response.ok) {
                throw new Error('AJAX failed: ' + response.status);
            }
            return response.text();
        }).then(function (text) {
            if (!text) {
                return {};
            }
            var raw = String(text || '');
            var trimmed = raw.trim();
            if (!trimmed) {
                return {};
            }
            try {
                return JSON.parse(trimmed);
            } catch (err) {
                // Some environments prepend warnings/notices before JSON.
                var firstObj = trimmed.indexOf('{');
                var lastObj = trimmed.lastIndexOf('}');
                if (firstObj != -1 && lastObj > firstObj) {
                    try {
                        return JSON.parse(trimmed.slice(firstObj, lastObj + 1));
                    } catch (err2) {
                        // fall through
                    }
                }
                var firstArr = trimmed.indexOf('[');
                var lastArr = trimmed.lastIndexOf(']');
                if (firstArr != -1 && lastArr > firstArr) {
                    try {
                        return JSON.parse(trimmed.slice(firstArr, lastArr + 1));
                    } catch (err3) {
                        // fall through
                    }
                }
                return { __parseError: true, __rawLen: trimmed.length, __rawHead: trimmed.slice(0, 200) };
            }
        });
    }


    function debugLog(tag, msg, extra) {
        try {
            if (!window.M || !M.cfg || !M.cfg.wwwroot) {
                return;
            }
            state.__debugLogCount = (state.__debugLogCount || 0) + 1;
            if (state.__debugLogCount > 120) {
                return;
            }
            var base = M.cfg.wwwroot + '/mod/pdfannotator/action.php';
            var body = new URLSearchParams();
            body.append('action', 'debugLog');
            body.append('documentId', String((state.documentObject && state.documentObject.annotatorid) || '0'));
            if (window.M && M.cfg && M.cfg.sesskey) {
                body.append('sesskey', M.cfg.sesskey);
            }
            body.append('tag', String(tag || 'client'));
            body.append('msg', String(msg || '').slice(0, 500));
            body.append('href', String((window.location && window.location.href) || '').slice(0, 500));
            if (extra !== undefined) {
                try {
                    body.append('extra', JSON.stringify(extra).slice(0, 2000));
                } catch (e) {
                    body.append('extra', String(extra).slice(0, 2000));
                }
            }

            fetch(base + '?_ts=' + String(Date.now()), {
                method: 'POST',
                credentials: 'same-origin',
                cache: 'no-store',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                },
                body: body.toString()
            }).catch(function () { /* ignore */ });
        } catch (e) {
            // ignore
        }
    }

    function setTool(tool) {
        state.activeTool = tool || 'cursor';
        var buttons = document.querySelectorAll('#toolbarContent [data-tooltype]');
        buttons.forEach(function (button) {
            var active = button.getAttribute('data-tooltype') === state.activeTool;
            button.classList.toggle('tl-tool-active', active);
        });
        document.querySelectorAll('#tl-express-toolbar [data-proxy-tool]').forEach(function (button) {
            var activeTool = button.getAttribute('data-proxy-tool') === state.activeTool;
            button.classList.toggle('active-tool', activeTool);
        });
        var viewer = viewerEl();
        if (viewer) {
            viewer.classList.toggle('tl-tool-textbox', state.activeTool === 'textbox');
            (function () {
                var t = state.activeTool;
                if (t === 'cursor') { viewer.style.cursor = 'default'; return; }
                if (cursorCache[t]) {
                    var h = (t === 'point') ? '12 22' : (t === 'area' ? '0 0' : (t === 'strikeout' ? '7 7' : '0 22'));
                    viewer.style.cursor = 'url(' + cursorCache[t] + ') ' + h + ', auto';
                    return;
                }
                getCursorDataUrlForTool(t, function (dataUrl) {
                    var v = viewerEl();
                    if (!v) return;
                    if (!dataUrl) { v.style.cursor = 'default'; return; }
                    var h = (t === 'point') ? '12 22' : ((t === 'area' || t === 'strikeout') ? '0 0' : '0 22');
                    v.style.cursor = 'url(' + dataUrl + ') ' + h + ', auto';
                });
            })();
        }
        if (state.activeTool !== 'cursor') {
            clearSelection();
        }
    }

    function clearViewer() {
        var viewer = viewerEl();
        while (viewer && viewer.firstChild) {
            viewer.removeChild(viewer.firstChild);
        }
        state.pages = {};
        state.annotationsLoadedOnce = false;
        if (state.annotationWarmupTimer) {
            clearTimeout(state.annotationWarmupTimer);
            state.annotationWarmupTimer = null;
        }
        if (state.annotationFastWarmupTimer) {
            clearTimeout(state.annotationFastWarmupTimer);
            state.annotationFastWarmupTimer = null;
        }
        if (state.initialLoadRetryTimer) {
            clearInterval(state.initialLoadRetryTimer);
            state.initialLoadRetryTimer = null;
        }
        state.initialLoadRetryCount = 0;
        state.annotationWarmupRounds = 0;
        clearSelection();
    }

    function bindToolbar() {
        document.querySelectorAll('#toolbarContent [data-tooltype]').forEach(function (button) {
            button.addEventListener('click', function (event) {
                event.preventDefault();
                var tool = button.getAttribute('data-tooltype');
                if (tool === 'draw') {
                    tool = 'drawing';
                } else if (tool === 'text') {
                    tool = 'textbox';
                }
                setTool(tool);
            });
        });

        var scaleSelect = document.querySelector('select.scale');
        if (scaleSelect) {
            scaleSelect.value = String(state.scale);
            scaleSelect.addEventListener('change', function () {
                var val = parseFloat(scaleSelect.value);
                if (!Number.isFinite(val) || val <= 0) {
                    return;
                }
                state.scale = val;
                renderDocument();
            });
        }

        var scaleMinus = document.getElementById('scaleMinus');
        var scalePlus = document.getElementById('scalePlus');
        if (scaleMinus) {
            scaleMinus.addEventListener('click', function (event) {
                event.preventDefault();
                zoomBy(-1);
            });
        }
        if (scalePlus) {
            scalePlus.addEventListener('click', function (event) {
                event.preventDefault();
                zoomBy(1);
            });
        }

        var prevPage = document.getElementById('prevPage');
        var nextPage = document.getElementById('nextPage');
        var currentPage = document.getElementById('currentPage');

        if (prevPage) {
            prevPage.addEventListener('click', function (event) {
                event.preventDefault();
                scrollToPage(Math.max(1, getCurrentPage() - 1));
            });
        }
        if (nextPage) {
            nextPage.addEventListener('click', function (event) {
                event.preventDefault();
                scrollToPage(Math.min(state.pdf ? state.pdf.numPages : 1, getCurrentPage() + 1));
            });
        }
        if (currentPage) {
            currentPage.addEventListener('change', function () {
                var requested = parseInt(currentPage.value, 10);
                if (!Number.isFinite(requested)) {
                    return;
                }
                scrollToPage(Math.max(1, Math.min(state.pdf ? state.pdf.numPages : 1, requested)));
            });
        }
    }

    function zoomBy(direction) {
        var supported = [0.5, 0.75, 1, 1.33, 1.5, 2];
        var idx = supported.indexOf(state.scale);
        if (idx < 0) {
            idx = 2;
        }
        var next = idx + direction;
        if (next < 0 || next >= supported.length) {
            return;
        }
        state.scale = supported[next];
        var scaleSelect = document.querySelector('select.scale');
        if (scaleSelect) {
            scaleSelect.value = String(state.scale);
        }
        renderDocument();
    }

    function getCurrentPage() {
        var viewer = viewerEl();
        if (!viewer) {
            return 1;
        }
        var pages = viewer.querySelectorAll('.page');
        var top = viewer.scrollTop;
        var candidate = 1;
        pages.forEach(function (page) {
            if (page.offsetTop - 20 <= top) {
                candidate = parseInt(page.getAttribute('data-page-number') || '1', 10);
            }
        });
        return candidate;
    }

    function updatePageCounter(current) {
        var counter = document.querySelector('[data-proxy-action="page-counter"]');
        if (!counter) {
            return;
        }
        var c = Number.isFinite(current) ? current : getCurrentPage();
        var total = state.pdf ? state.pdf.numPages : 1;
        counter.textContent = String(c) + ' / ' + String(total);
    }

    function bindViewerScroll() {
        var viewer = viewerEl();
        if (!viewer) {
            return;
        }
        var savePosTimer = null;
        viewer.addEventListener('scroll', function () {
            var current = getCurrentPage();
            var currentPageInput = document.getElementById('currentPage');
            if (currentPageInput) {
                currentPageInput.value = String(current);
            }
            updatePageCounter(current);
            updateDeleteButtonPosition();
            if (savePosTimer) clearTimeout(savePosTimer);
            savePosTimer = setTimeout(function () {
                var key = 'pdfannotator_pos_' + state.contextId;
                if (state.contextId != null) {
                    var p = getCurrentPage();
                    var top = viewer.scrollTop;
                    try { localStorage.setItem(key, JSON.stringify({ page: p, scrollTop: top })); } catch (e) {}
                }
                savePosTimer = null;
            }, 400);
        });
    }

    function scrollToPage(pageNo) {
        var page = viewerEl().querySelector('.page[data-page-number="' + pageNo + '"]');
        if (!page) {
            return;
        }
        page.scrollIntoView({ behavior: 'smooth', block: 'start' });
        var currentPageInput = document.getElementById('currentPage');
        if (currentPageInput) {
            currentPageInput.value = String(pageNo);
        }
        updatePageCounter(pageNo);
    }

    function ensureCommentPanelVisible() {
        var wrapper = document.getElementById('comment-wrapper');
        if (!wrapper) {
            return;
        }
        wrapper.style.display = '';
        wrapper.classList.remove('hidden');
    }

    var theaterState = {
        enabled: false,
        hiddenElements: []
    };

    function toggleTheaterMode() {
        var selectors = [
            '#page-header',
            '#page-footer',
            '.breadcrumb',
            '.navbar',
            '#block-region-side-pre',
            '#block-region-side-post',
            '#nav-drawer'
        ];
        if (!theaterState.enabled) {
            theaterState.hiddenElements = [];
            selectors.forEach(function (selector) {
                document.querySelectorAll(selector).forEach(function (node) {
                    theaterState.hiddenElements.push({
                        node: node,
                        display: node.style.display || ''
                    });
                    node.style.display = 'none';
                });
            });
            document.body.classList.add('tl-pdf-fullscreen');
            setTimeout(logBug8Fullscreen, 1500);
            theaterState.enabled = true;
            return;
        }
        theaterState.hiddenElements.forEach(function (entry) {
            entry.node.style.display = entry.display;
        });
        theaterState.hiddenElements = [];
        document.body.classList.remove('tl-pdf-fullscreen');
        theaterState.enabled = false;
    }


    function isBrowserFullscreen() {
        return !!(document.fullscreenElement || document.webkitFullscreenElement ||
            document.mozFullScreenElement || document.msFullscreenElement);
    }

    function requestBrowserFullscreen() {
        var elem = document.documentElement;
        if (elem.requestFullscreen) {
            return elem.requestFullscreen();
        }
        if (elem.webkitRequestFullscreen) {
            return elem.webkitRequestFullscreen();
        }
        if (elem.mozRequestFullScreen) {
            return elem.mozRequestFullScreen();
        }
        if (elem.msRequestFullscreen) {
            return elem.msRequestFullscreen();
        }
        return Promise.resolve();
    }

    function exitBrowserFullscreen() {
        if (document.exitFullscreen) {
            return document.exitFullscreen();
        }
        if (document.webkitExitFullscreen) {
            return document.webkitExitFullscreen();
        }
        if (document.mozCancelFullScreen) {
            return document.mozCancelFullScreen();
        }
        if (document.msExitFullscreen) {
            return document.msExitFullscreen();
        }
        return Promise.resolve();
    }

    function toggleBrowserFullscreenAndTheater() {
        if (isBrowserFullscreen()) {
            exitBrowserFullscreen();
            if (theaterState.enabled) {
                toggleTheaterMode();
            }
            return;
        }
        requestBrowserFullscreen();
        if (!theaterState.enabled) {
            toggleTheaterMode();
        }
    }

    function buildShoelaceToolbar() {
        if (!document.getElementById('tl-open-sans-font-link')) {
            var openSansLink = document.createElement('link');
            openSansLink.id = 'tl-open-sans-font-link';
            openSansLink.rel = 'stylesheet';
            openSansLink.href = 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap';
            document.head.appendChild(openSansLink);
        }
        if (!document.getElementById('tl-roboto-slab-font-link')) {
            var robotoSlabLink = document.createElement('link');
            robotoSlabLink.id = 'tl-roboto-slab-font-link';
            robotoSlabLink.rel = 'stylesheet';
            robotoSlabLink.href = 'https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@700&display=swap';
            document.head.appendChild(robotoSlabLink);
        }

        var container = document.getElementById('pdftoolbar');
        if (!container || document.getElementById('tl-express-toolbar')) {
            return;
        }

        var shell = document.createElement('div');
        shell.id = 'tl-express-toolbar';
        shell.className = 'tl-express-toolbar';
        shell.innerHTML = [
            '<div class="tl-group tl-tools">',
            '<button type="button" data-proxy-tool="cursor" title="Cursor"><i class="fa fa-mouse-pointer"></i></button>',
            '<button type="button" data-proxy-tool="point" title="Point"><i class="fa fa-map-pin"></i></button>',
            '<button type="button" data-proxy-tool="area" title="Area"><i class="fa fa-square-o"></i></button>',
            '<button type="button" data-proxy-tool="drawing" title=""><i class="fa fa-paint-brush"></i></button>',
            '<button type="button" data-proxy-tool="textbox" title="Textbox"><i class="fa fa-font"></i></button>',
            '<button type="button" data-proxy-tool="highlight" title="Highlight"><svg class="tl-icon-highlight-marker" viewBox="-3.62 0 126.5 112.6" aria-hidden="true" style="width:1.35em;height:1.38em"><g fill="#3b3e3e"><path d="m30.36,55.98 35.29,35.29c0.47,0.4 1.07,0.62 1.65,0.62 0.51,0 0.99-0.16 1.34-0.51l0.09-0.09 48.08-56.25c0.5-0.58 0.77-1.29 0.77-1.97 0-0.56-0.2-1.12-0.63-1.55L91.34,5.91c-0.42-0.42-0.95-0.61-1.5-0.61-0.71,0-1.44,0.28-2.07,0.79L30.15,52.8l-0.11,0.11c-0.32,0.32-0.46,0.77-0.46,1.25 0,0.58 0.21,1.17 0.59,1.64z"/><path d="M29.49,111.88c-2.2,0.91-6.3,0.75-7.12,0.61L2.36,110.28c-1.45-0.16-4.8-0.18-5.86-3.13-0.52-2.57 0.8-4.24 1.21-4.65 0,0 11.32-10.94 16.92-16.46 1.57-1.55 4.69-4.69 4.69-4.69l0.01,0.01 0.07-0.07c0.19-0.18 0.37-0.39 0.54-0.62 0.16-0.22 0.3-0.48 0.43-0.75 0.92-1.99 0.54-6.28 0.24-9.63h0.01c-0.09-0.96-0.16-1.85-0.2-2.46-0.56-4.42 2.26-6.98 5.09-9.51-0.77-1.25-1.18-2.69-1.19-4.11-0.02-1.84 0.62-3.67 1.99-5.04 0.13-0.13 0.3-0.28 0.52-0.46L84.44,1.99C86.02,0.7 87.94,0 89.84,0c1.9,0 3.77,0.68 5.25,2.16l25.61,25.61c1.48,1.48 2.18,3.37 2.18,5.29 0,1.91-0.71,3.85-2.05,5.41L72.75,94.73c-0.15,0.18-0.28,0.32-0.36,0.4-1.4,1.4-3.26,2.06-5.13,2.04-1.41-0.01-2.84-0.41-4.07-1.17-2.53,2.84-5.09,5.65-9.51,5.09-0.91-0.05-1.66-0.12-2.46-0.19v-0.01c-3.35-0.3-7.63-0.68-9.63,0.25-0.28,0.13-0.53,0.27-0.75,0.43-0.18,0.13-0.36,0.28-0.53,0.45-0.05,0.06-0.1,0.12-0.16,0.17l-4.69,4.69c-1.03,1.03-3.57,4.01-5.97,5z"/><path d="m20.24,87.9 1.07,1.07 11.2,11.2 1.07,1.07 5-5c1.73,0.23 3.37-1.6 5-3.43L29.08,62.2c-1.83,1.63-3.67,3.28-3.42,5.01l0.02,0.21c0.05,0.86 0.12,1.61 0.19,2.4h0.01c0.35,3.96 0.8,9.03-0.71,12.3-0.26,0.55-0.56,1.09-0.93,1.6-0.34,0.47-0.73,0.93-1.19,1.36l0.01,0.01z"/></g></svg></button>',
            '<button type="button" data-proxy-tool="strikeout" title="Strikeout"><svg viewBox="0 0 537.643 537.643" aria-hidden="true" style="width:1.17em;height:1.17em"><g fill="#3b3e3e"><path d="M399.768,239.341c-24.479-12.105-60.643-23.837-108.771-35.202c-51.035-12.051-83.17-23.624-96.402-34.731c-10.404-8.739-15.594-19.253-15.594-31.542c0-13.47,5.544-24.217,16.658-32.253c17.247-12.521,41.114-18.782,71.592-18.782c29.529,0,51.69,5.851,66.458,17.54c14.761,11.702,24.388,30.9,28.88,57.595l104.909-4.608c-1.658-47.724-18.96-85.882-51.928-114.475C382.62,14.296,333.525,0,268.316,0c-39.933,0-74.015,6.022-102.253,18.073c-28.231,12.05-49.847,29.59-64.848,52.632c-15.006,23.029-22.509,47.791-22.509,74.248c0,36.365,12.503,67.828,37.46,94.389H399.768L399.768,239.341z"/><path d="M351.775,427.592c-17.13,14.303-42.59,21.445-76.372,21.445c-31.897,0-57.234-8.029-76.029-24.102c-18.776-16.064-31.242-41.23-37.387-75.49l-102.069,9.928c6.848,58.121,27.876,102.369,63.085,132.725c35.202,30.361,85.643,45.545,151.335,45.545c45.129,0,82.81-6.322,113.061-18.961c30.239-12.643,53.63-31.951,70.172-57.949c16.536-25.986,24.811-53.869,24.811-83.643c0-22.582-3.348-42.619-9.884-60.232H306.529c9.97,2.766,17.467,5.012,22.388,6.713c17.95,6.377,30.538,13.881,37.742,22.504c7.209,8.629,10.813,19.088,10.813,31.371C377.473,396.582,368.911,413.297,351.775,427.592z"/><path d="M28.101,298.498h207.486h228.41h45.545c10.142,0,18.36-8.221,18.36-18.361v-4.082c0-10.141-8.219-18.36-18.36-18.36h-80.453H136.89H28.101c-10.141,0-18.36,8.219-18.36,18.36v4.082C9.74,290.277,17.959,298.498,28.101,298.498z"/></g></svg></button>',
            '</div>',
            '<div class="tl-group tl-style">',
            '<label title="Color"><i class="fa fa-tint"></i></label>',
            '<div class="tl-color-picker-wrapper"><input type="color" data-proxy-style="color" value="#ae090f" /></div>',
            '<label title="Stroke width"><span class="tl-style-glyph">W</span></label>',
            '<select data-proxy-style="stroke-width" title="Stroke width"><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7" selected>7</option><option value="8">8</option><option value="9">9</option><option value="10">10</option><option value="11">11</option><option value="12">12</option><option value="13">13</option><option value="14">14</option><option value="15">15</option><option value="16">16</option><option value="17">17</option><option value="18">18</option><option value="19">19</option><option value="20">20</option></select>',
            '<label title="Text size"><span class="tl-style-glyph">A</span></label>',
            '<select data-proxy-style="text-size" title="Text size"><option value="9">9 pt</option><option value="10">10 pt</option><option value="11">11 pt</option><option value="12">12 pt</option><option value="14" selected>14 pt</option><option value="15">15 pt</option><option value="17">17 pt</option><option value="19">19 pt</option><option value="20">20 pt</option><option value="22">22 pt</option><option value="24">24 pt</option><option value="26">26 pt</option><option value="28">28 pt</option><option value="30">30 pt</option><option value="32">32 pt</option></select>',
            '<label title="Font family"><span class="tl-style-glyph">F</span></label>',
            '<select data-proxy-style="font-family" title="Font family">',
            '<option value="Open Sans" style="font-family:Open Sans, Arial, sans-serif;" selected>Open Sans</option>',
            '<option value="Times New Roman" style="font-family:Times New Roman, serif;">Times New Roman</option>',
            '<option value="Palatino Linotype" style="font-family:Palatino Linotype, Palatino, serif;">Palatino Linotype</option>',
            '</select>',
            '</div>',
            '<div class="tl-group tl-zoom">',
            '<button type="button" data-proxy-action="zoom-out" title="Zoom out"><i class="fa fa-minus"></i></button>',
            '<select data-proxy-action="zoom-select" title="Zoom">',
            '<option value="1">100%</option>',
            '<option value="1.33" selected>133%</option>',
            '<option value="1.5">150%</option>',
            '<option value="2">200%</option>',
            '</select>',
            '<button type="button" data-proxy-action="zoom-in" title="Zoom in"><i class="fa fa-plus"></i></button>',
            '</div>',
            '<div class="tl-group tl-nav">',
            '<button type="button" data-proxy-action="prev-page" title="Previous page"><i class="fa fa-chevron-up"></i></button>',
            '<button type="button" data-proxy-action="next-page" title="Next page"><i class="fa fa-chevron-down"></i></button>',
            '<span class="tl-page-counter" data-proxy-action="page-counter">1 / 1</span>',
            '</div>',
            '<div class="tl-group tl-misc">',
            '<button type="button" data-proxy-action="toggle-comments" title="Comments"><i class="fa fa-comments"></i></button>',
            '<button type="button" data-proxy-action="fullscreen" title="Full screen (ESC to exit)"><i class="fa fa-expand"></i></button>',
            '</div>'
        ].join('');
        container.appendChild(shell);

        shell.querySelectorAll('[data-proxy-tool]').forEach(function (button) {
            button.addEventListener('click', function () {
                var tool = button.getAttribute('data-proxy-tool');
                setTool(tool);
            });
        });

        (function () {
            var drawingBtn = shell.querySelector('[data-proxy-tool="drawing"]');
            if (drawingBtn) {
                var tip = document.createElement('div');
                tip.className = 'tl-drawing-tooltip';
                tip.innerHTML = '<div style="text-align:center;font-size:1em;font-weight:400">Drawing</div><div style="text-align:left;padding-left:0.5em;font-size:0.8em;font-weight:300">To draw straight lines<br>press and hold Shift + draw.</div>';
                tip.style.cssText = 'display:none;position:fixed;z-index:1000010;background:#333;color:#e6e6e6;padding:6px 10px;border-radius:4px;white-space:normal;pointer-events:none;font-family:"Open Sans",Arial,sans-serif;';
                document.body.appendChild(tip);
                var showTipTimer;
                var DRAWING_TOOLTIP_DELAY = 570;
                drawingBtn.addEventListener('mouseenter', function (e) {
                    showTipTimer = setTimeout(function () {
                        showTipTimer = null;
                        var r = drawingBtn.getBoundingClientRect();
                        tip.style.left = r.left + 'px';
                        tip.style.top = (r.bottom + 8) + 'px';
                        tip.style.display = 'block';
                    }, DRAWING_TOOLTIP_DELAY);
                });
                drawingBtn.addEventListener('mouseleave', function () {
                    if (showTipTimer) { clearTimeout(showTipTimer); showTipTimer = null; }
                    tip.style.display = 'none';
                });
            }
        })();

        (function () {
            var sharedTip = document.createElement('div');
            sharedTip.className = 'tl-toolbar-tooltip';
            sharedTip.innerHTML = '<div style="text-align:center;font-size:1em;font-weight:400"></div>';
            sharedTip.style.cssText = 'display:none;position:fixed;z-index:1000010;background:#333;color:#e6e6e6;padding:6px 10px;border-radius:4px;white-space:normal;pointer-events:none;font-family:"Open Sans",Arial,sans-serif;';
            document.body.appendChild(sharedTip);
            var showTimer;
            var TOOLTIP_DELAY = 570;
            shell.querySelectorAll('[title]').forEach(function (el) {
                if (!el.getAttribute('title') || el.getAttribute('title') === '') return;
                if (el.getAttribute('data-proxy-tool') === 'drawing') return;
                var text = el.getAttribute('title');
                el.setAttribute('title', '');
                el.addEventListener('mouseenter', function () {
                    if (showTimer) clearTimeout(showTimer);
                    showTimer = setTimeout(function () {
                        showTimer = null;
                        sharedTip.firstChild.textContent = (el.getAttribute('data-tooltip-text') || text);
                        var r = el.getBoundingClientRect();
                        sharedTip.style.left = r.left + 'px';
                        sharedTip.style.top = (r.bottom + 8) + 'px';
                        sharedTip.style.display = 'block';
                    }, TOOLTIP_DELAY);
                });
                el.addEventListener('mouseleave', function () {
                    if (showTimer) { clearTimeout(showTimer); showTimer = null; }
                    sharedTip.style.display = 'none';
                });
            });
        })();

        shell.querySelector('[data-proxy-action="zoom-in"]').addEventListener('click', function () {
            zoomBy(1);
            var select = shell.querySelector('[data-proxy-action="zoom-select"]');
            if (select) {
                select.value = String(state.scale);
            }
        });
        shell.querySelector('[data-proxy-action="zoom-out"]').addEventListener('click', function () {
            zoomBy(-1);
            var select = shell.querySelector('[data-proxy-action="zoom-select"]');
            if (select) {
                select.value = String(state.scale);
            }
        });
        shell.querySelector('[data-proxy-action="zoom-select"]').addEventListener('change', function (event) {
            var val = parseFloat(event.target.value);
            if (!Number.isFinite(val) || val <= 0) {
                return;
            }
            state.scale = val;
            var oldSelect = document.querySelector('select.scale');
            if (oldSelect) {
                oldSelect.value = String(val);
            }
            renderDocument();
        });
        shell.querySelector('[data-proxy-action="prev-page"]').addEventListener('click', function () {
            scrollToPage(Math.max(1, getCurrentPage() - 1));
        });
        shell.querySelector('[data-proxy-action="next-page"]').addEventListener('click', function () {
            scrollToPage(Math.min(state.pdf ? state.pdf.numPages : 1, getCurrentPage() + 1));
        });
        shell.querySelector('[data-proxy-action="fullscreen"]').addEventListener('click', function () {
            toggleBrowserFullscreenAndTheater();
        });
        var colorInput = shell.querySelector('[data-proxy-style="color"]');
        var strokeInput = shell.querySelector('[data-proxy-style="stroke-width"]');
        var textSizeInput = shell.querySelector('[data-proxy-style="text-size"]');
        var fontFamilyInput = shell.querySelector('[data-proxy-style="font-family"]');
        if (colorInput) {
            var applyColor = function (event) {
                var color = (event && event.target && event.target.value) ? event.target.value : '#ae090f';
                state.drawingStroke = color;
                state.textColor = color;
                state.annotationColor = color;
            };
            colorInput.addEventListener('input', applyColor);
            colorInput.addEventListener('change', applyColor);
        }
        if (strokeInput) {
            strokeInput.addEventListener('change', function (event) {
                var size = parseFloat(event.target.value);
                if (Number.isFinite(size) && size >= 0) {
                    state.strokeWidth = size;
                }
            });
        }
        if (textSizeInput) {
            textSizeInput.addEventListener('change', function (event) {
                var size = parseFloat(event.target.value);
                if (Number.isFinite(size) && size > 0) {
                    state.textSize = size;
                }
            });
        }
        if (fontFamilyInput) {
            fontFamilyInput.addEventListener('change', function (event) {
                state.textFont = event.target.value || 'Open Sans';
            });
        }
        shell.querySelector('[data-proxy-action="toggle-comments"]').addEventListener('click', function () {
            var wrapper = document.getElementById('comment-wrapper');
            if (!wrapper) {
                return;
            }
            wrapper.style.display = (wrapper.style.display === 'none') ? '' : 'none';
        });
    }

    function initPdf() {
        if (!window.pdfjsLib) {
            throw new Error('pdfjsLib is not available');
        }
        pdfjsLib.GlobalWorkerOptions.workerSrc = ((window.M && M.cfg && M.cfg.wwwroot) ? M.cfg.wwwroot : '') + '/mod/pdfannotator/lib/pdfjs/pdf.worker.min.js?ver=00004';
        return pdfjsLib.getDocument({ url: state.documentObject.fullurl, withCredentials: true }).promise.then(function (pdfDoc) {
            state.pdf = pdfDoc;
            var sumPages = document.getElementById('sumPages');
            if (sumPages) {
                sumPages.textContent = String(pdfDoc.numPages);
            }
            updatePageCounter(1);
            return pdfDoc;
        });
    }

    function renderDocument() {
        if (!state.pdf) {
            return;
        }
        clearViewer();
        var chain = Promise.resolve();
        for (var pageNumber = 1; pageNumber <= state.pdf.numPages; pageNumber++) {
            (function (pageNo) {
                chain = chain.then(function () {
                    var renderPromise = renderPage(pageNo).catch(function (error) {
                        console.error('Render page failed for page', pageNo, error);
                    });
                    var timeoutPromise = new Promise(function (resolve) {
                        setTimeout(function () {
                            console.error('Render page timeout guard for page', pageNo);
                            resolve();
                        }, 4500);
                    });
                    return Promise.race([renderPromise, timeoutPromise]);
                });
            }(pageNumber));
        }
        chain.then(function () {
            var viewer = viewerEl();
            var targetPage = Math.max(1, Math.min(state.pdf.numPages, parseInt(state.initialPage || 1, 10) || 1));
            if (viewer && viewer.scrollTop <= 80) {
                scrollToPage(targetPage);
            }
            if (viewer && state.savedScrollTop != null) {
                viewer.scrollTop = Math.max(0, Math.min(state.savedScrollTop, viewer.scrollHeight - viewer.clientHeight));
                state.savedScrollTop = null;
            }
            requestAnimationFrame(function () {
                setTimeout(function () { startAnnotationWarmup(); }, 150);
            });
        }).catch(function (error) {
            console.error('Render chain failed', error);
        });
    }

    function startAnnotationWarmup() {
        if (!state.pdf) {
            return;
        }
        if (state.annotationWarmupTimer) {
            clearTimeout(state.annotationWarmupTimer);
            state.annotationWarmupTimer = null;
        }
        if (state.annotationFastWarmupTimer) {
            clearTimeout(state.annotationFastWarmupTimer);
            state.annotationFastWarmupTimer = null;
        }

        // Anti-freeze hotfix: avoid aggressive interval storms on all pages.
        for (var pageNo = 1; pageNo <= state.pdf.numPages; pageNo++) {
            loadAndRenderAnnotations(pageNo, true);
        }

        // One delayed retry helps after reuse/cache races without flooding the browser.
        state.annotationWarmupTimer = setTimeout(function () {
            if (!state.pdf || state.annotationsLoadedOnce) {
                return;
            }
            for (var delayedPage = 1; delayedPage <= state.pdf.numPages; delayedPage++) {
                loadAndRenderAnnotations(delayedPage, true);
            }
        }, 1200);
    }


    function startInitialLoadRetries() {
        if (state.initialLoadRetryTimer) {
            clearInterval(state.initialLoadRetryTimer);
            state.initialLoadRetryTimer = null;
        }
        state.initialLoadRetryCount = 0;
        state.initialLoadRetryTimer = setInterval(function () {
            if (!state.pdf) {
                clearInterval(state.initialLoadRetryTimer);
                state.initialLoadRetryTimer = null;
                return;
            }
            if (state.annotationsLoadedOnce || state.initialLoadRetryCount >= 20) {
                clearInterval(state.initialLoadRetryTimer);
                state.initialLoadRetryTimer = null;
                return;
            }
            state.initialLoadRetryCount += 1;
            for (var pageNo = 1; pageNo <= state.pdf.numPages; pageNo++) {
                loadAndRenderAnnotations(pageNo, true);
            }
        }, 900);
    }

    function renderPage(pageNumber) {
        return state.pdf.getPage(pageNumber).then(function (page) {
            var cssViewport = page.getViewport({ scale: state.scale });
            var pixelRatio = window.devicePixelRatio || 1;

            var pageContainer = document.createElement('div');
            pageContainer.className = 'page tl-page';
            pageContainer.setAttribute('data-page-number', String(pageNumber));
            pageContainer.style.width = cssViewport.width + 'px';
            pageContainer.style.height = cssViewport.height + 'px';

            var canvas = document.createElement('canvas');
            canvas.width = Math.ceil(cssViewport.width * pixelRatio);
            canvas.height = Math.ceil(cssViewport.height * pixelRatio);
            canvas.style.width = cssViewport.width + 'px';
            canvas.style.height = cssViewport.height + 'px';
            canvas.className = 'tl-pdf-canvas';

            var overlayHost = document.createElement('div');
            overlayHost.className = 'tl-konva-host';
            overlayHost.style.width = cssViewport.width + 'px';
            overlayHost.style.height = cssViewport.height + 'px';

            pageContainer.appendChild(canvas);
            pageContainer.appendChild(overlayHost);
            viewerEl().appendChild(pageContainer);

            var canvasContext = canvas.getContext('2d', { alpha: false });
            canvasContext.imageSmoothingEnabled = true;
            var renderContext = {
                canvasContext: canvasContext,
                viewport: cssViewport
            };
            if (pixelRatio !== 1) {
                renderContext.transform = [pixelRatio, 0, 0, pixelRatio, 0, 0];
            }
            return page.render(renderContext).promise.then(function () {
                initKonvaForPage(pageNumber, cssViewport, overlayHost);
                return loadAndRenderAnnotations(pageNumber);
            });
        });
    }

    function initKonvaForPage(pageNumber, viewport, hostElement) {
        if (!window.Konva) {
            throw new Error('Konva is not available');
        }

        var stage = new Konva.Stage({
            container: hostElement,
            width: viewport.width,
            height: viewport.height,
            pixelRatio: window.devicePixelRatio || 1
        });

        var annotationLayer = new Konva.Layer();
        var overlayLayer = new Konva.Layer();
        var transformer = new Konva.Transformer({
            anchorSize: 7,
            borderStroke: '#1f2937',
            visible: false,
            rotateEnabled: false,
            shouldOverdrawWholeArea: true,
            enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right']
        });

        overlayLayer.add(transformer);
        transformer.on('dblclick dbltap', function (event) {
            event.cancelBubble = true;
            if (!state.activeAnnotation || state.activeAnnotation.pageNumber !== pageNumber) {
                return;
            }
            var activeGroup = state.activeAnnotation.group;
            if (!activeGroup || activeGroup.getAttr('annotationType') !== 'textbox') {
                return;
            }
            var data = activeGroup.getAttr('annotationData');
            if (data && data.uuid) {
                showTextboxEditor(pageNumber, data);
            }
        });
        transformer.on('transformend', function () {
            if (!state.activeAnnotation || state.activeAnnotation.pageNumber !== pageNumber) {
                return;
            }
            var activeGroup = state.activeAnnotation.group;
            var annotation = activeGroup ? activeGroup.getAttr('annotationData') : null;
            if (!annotation || (annotation.type !== 'area' && annotation.type !== 'textbox')) {
                return;
            }
            var rect = activeGroup.findOne('Rect');
            if (!rect) {
                return;
            }
            var scale = state.scale || 1;
            var gx = activeGroup.x();
            var gy = activeGroup.y();
            var newW = rect.width() * activeGroup.scaleX();
            var newH = rect.height() * activeGroup.scaleY();
            var newX = gx + rect.x() * activeGroup.scaleX();
            var newY = gy + rect.y() * activeGroup.scaleY();
            annotation.x = newX / scale;
            annotation.y = newY / scale;
            annotation.width = newW / scale;
            annotation.height = newH / scale;
            rect.width(newW);
            rect.height(newH);
            rect.x(annotation.x * scale);
            rect.y(annotation.y * scale);
            activeGroup.position({ x: 0, y: 0 });
            activeGroup.scaleX(1);
            activeGroup.scaleY(1);
            if (annotation.type === 'textbox') {
                var labelEl = activeGroup.getAttr('textboxLabelEl');
                if (labelEl) {
                    applyTextboxLabelLayout(pageNumber, labelEl, annotation, scale);
                }
            }
            activeGroup.setAttr('annotationData', annotation);
            persistAnnotation(annotation);
            state.ignoreNextTextboxClick = true;
        });
        stage.add(annotationLayer);
        stage.add(overlayLayer);

        var konvaDpr = window.devicePixelRatio || 1;
        if (annotationLayer.getCanvas && annotationLayer.getCanvas()) {
            annotationLayer.getCanvas().setPixelRatio(konvaDpr);
        }
        if (overlayLayer.getCanvas && overlayLayer.getCanvas()) {
            overlayLayer.getCanvas().setPixelRatio(konvaDpr);
        }

        state.pages[pageNumber] = {
            stage: stage,
            annotationLayer: annotationLayer,
            overlayLayer: overlayLayer,
            transformer: transformer,
            viewport: viewport,
            annotationsById: {}
        };

        bindStageCreation(stage, pageNumber);
    }

    function bindStageCreation(stage, pageNumber) {
        var drawing = null;
        var draftRect = null;
        var draftStart = null;
        var drawingLazy = null;
        var shiftPolyPoints = [];
        var shiftPolyLine = null;
        var shiftPolyPreview = null;

        stage.on('mousedown touchstart', function (event) {
            var tool = state.activeTool;
            if (tool === 'cursor') {
                if (event && event.target === stage) {
                    clearSelection();
                }
                return;
            }
            var pointer = stage.getPointerPosition();
            if (!pointer) {
                return;
            }

            if (tool === 'point') {
                var pageState = getPageState(pageNumber);
                var hitGroup = null;
                if (pageState && pageState.annotationLayer) {
                    var hit = pageState.annotationLayer.getIntersection(pointer);
                    if (hit) {
                        var n = hit;
                        while (n) {
                            if (n.getAttr && n.getAttr('annotationData')) {
                                hitGroup = n;
                                break;
                            }
                            n = n.getParent ? n.getParent() : null;
                        }
                    }
                    if (!hitGroup) {
                        var children = pageState.annotationLayer.getChildren();
                        for (var i = children.length - 1; i >= 0; i--) {
                            var gr = children[i];
                            var ad = gr.getAttr && gr.getAttr('annotationData');
                            if (!ad || ad.type !== 'point') { continue; }
                            var rect = gr.getClientRect && gr.getClientRect();
                            if (rect && pointer.x >= rect.x && pointer.x <= rect.x + rect.width && pointer.y >= rect.y && pointer.y <= rect.y + rect.height) {
                                hitGroup = gr;
                                break;
                            }
                        }
                    }
                }
                if (hitGroup) {
                    state._pointClickSelect = true;
                    selectAnnotation(pageNumber, hitGroup);
                    if (hitGroup.getAttr && hitGroup.getAttr('annotationData') && hitGroup.getAttr('annotationData').type !== 'point') {
                        setTool('cursor');
                    }
                    return;
                }
                createAnnotation(pageNumber, {
                    type: 'point',
                    x: pointer.x / state.scale,
                    y: pointer.y / state.scale
                });
                bindVisibilityRecovery();
                return;
            }

            if (tool === 'textbox') {
                draftStart = pointer;
                return;
            }

            draftStart = pointer;

            if (tool === 'drawing') {
                var pageStateDraw = getPageState(pageNumber);
                var hitGroupDraw = null;
                if (pageStateDraw && pageStateDraw.annotationLayer) {
                    var hitDraw = pageStateDraw.annotationLayer.getIntersection(pointer);
                    if (hitDraw) {
                        var nDraw = hitDraw;
                        while (nDraw) {
                            if (nDraw.getAttr && nDraw.getAttr('annotationData')) {
                                hitGroupDraw = nDraw;
                                break;
                            }
                            nDraw = nDraw.getParent ? nDraw.getParent() : null;
                        }
                    }
                    if (!hitGroupDraw) {
                        var childrenDraw = pageStateDraw.annotationLayer.getChildren();
                        for (var d = childrenDraw.length - 1; d >= 0; d--) {
                            var grDraw = childrenDraw[d];
                            var adDraw = grDraw.getAttr && grDraw.getAttr('annotationData');
                            if (!adDraw) { continue; }
                            var rectDraw = grDraw.getClientRect && grDraw.getClientRect();
                            if (rectDraw && pointer.x >= rectDraw.x && pointer.x <= rectDraw.x + rectDraw.width && pointer.y >= rectDraw.y && pointer.y <= rectDraw.y + rectDraw.height) {
                                hitGroupDraw = grDraw;
                                break;
                            }
                        }
                    }
                }
                if (hitGroupDraw) {
                    state._pointClickSelect = true;
                    selectAnnotation(pageNumber, hitGroupDraw);
                    if (hitGroupDraw.getAttr && hitGroupDraw.getAttr('annotationData') && hitGroupDraw.getAttr('annotationData').type !== 'drawing') {
                        setTool('cursor');
                    }
                    return;
                }
                if (event.evt && event.evt.shiftKey) {
                    shiftPolyPoints.push(pointer.x, pointer.y);
                    var liveWidthSP = state.strokeWidth === 0 ? 0 : Math.max(1, (state.strokeWidth || 2) * state.scale);
                    if (!shiftPolyLine) {
                        shiftPolyLine = new Konva.Line({
                            points: shiftPolyPoints.slice(),
                            stroke: state.drawingStroke,
                            strokeWidth: liveWidthSP,
                            lineCap: 'round',
                            lineJoin: 'round'
                        });
                        getPageState(pageNumber).annotationLayer.add(shiftPolyLine);
                    } else {
                        shiftPolyLine.points(shiftPolyPoints.slice());
                    }
                    getPageState(pageNumber).annotationLayer.batchDraw();
                } else {
                    if (shiftPolyPoints.length > 0) {
                        if (shiftPolyLine) { shiftPolyLine.destroy(); shiftPolyLine = null; }
                        if (shiftPolyPreview) { shiftPolyPreview.destroy(); shiftPolyPreview = null; }
                        shiftPolyPoints = [];
                        getPageState(pageNumber).annotationLayer.batchDraw();
                    }
                    var liveWidth = state.strokeWidth === 0 ? 0 : Math.max(1, (state.strokeWidth || 2) * state.scale);
                    drawing = new Konva.Line({
                        points: [pointer.x, pointer.y],
                        stroke: state.drawingStroke,
                        strokeWidth: liveWidth,
                        hitStrokeWidth: liveWidth === 0 ? 4 : Math.max(10, liveWidth * 4),
                        lineCap: 'round',
                        lineJoin: 'round'
                    });
                    getPageState(pageNumber).annotationLayer.add(drawing);
                    getPageState(pageNumber).annotationLayer.draw();
                    if (window['lazy-brush'] && window['lazy-brush'].LazyBrush) {
                        drawingLazy = new window['lazy-brush'].LazyBrush({ radius: 20, enabled: true, initialPoint: { x: pointer.x, y: pointer.y } });
                    }
                }
            } else {
                if (tool === 'area' || tool === 'highlight' || tool === 'strikeout') {
                    var pageStateRect = getPageState(pageNumber);
                    var hitGroupRect = null;
                    if (pageStateRect && pageStateRect.annotationLayer) {
                        var hitRect = pageStateRect.annotationLayer.getIntersection(pointer);
                        if (hitRect) {
                            var nRect = hitRect;
                            while (nRect) {
                                if (nRect.getAttr && nRect.getAttr('annotationData')) {
                                    hitGroupRect = nRect;
                                    break;
                                }
                                nRect = nRect.getParent ? nRect.getParent() : null;
                            }
                        }
                        if (!hitGroupRect) {
                            var childrenRect = pageStateRect.annotationLayer.getChildren();
                            for (var r = childrenRect.length - 1; r >= 0; r--) {
                                var grRect = childrenRect[r];
                                var adRect = grRect.getAttr && grRect.getAttr('annotationData');
                                if (!adRect) { continue; }
                                var rectRect = grRect.getClientRect && grRect.getClientRect();
                                if (rectRect && pointer.x >= rectRect.x && pointer.x <= rectRect.x + rectRect.width && pointer.y >= rectRect.y && pointer.y <= rectRect.y + rectRect.height) {
                                    hitGroupRect = grRect;
                                    break;
                                }
                            }
                        }
                    }
                    if (hitGroupRect) {
                        state._pointClickSelect = true;
                        selectAnnotation(pageNumber, hitGroupRect);
                        var adTypeRect = hitGroupRect.getAttr && hitGroupRect.getAttr('annotationData') && hitGroupRect.getAttr('annotationData').type;
                        if (adTypeRect !== tool) {
                            setTool('cursor');
                        }
                        return;
                    }
                }
                draftRect = new Konva.Rect({
                    x: pointer.x,
                    y: pointer.y,
                    width: 1,
                    height: 1,
                    stroke: '#0f766e',
                    strokeWidth: 1,
                    dash: [4, 4],
                    fill: 'rgba(15, 118, 110, 0.1)'
                });
                getPageState(pageNumber).overlayLayer.add(draftRect);
                getPageState(pageNumber).overlayLayer.draw();
            }
        });

        stage.on('mousemove touchmove', function () {
            var pointer = stage.getPointerPosition();
            if (!pointer) {
                return;
            }
            if (drawing) {
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
            }
            if (shiftPolyPoints.length >= 2) {
                var spLastX = shiftPolyPoints[shiftPolyPoints.length - 2];
                var spLastY = shiftPolyPoints[shiftPolyPoints.length - 1];
                var spPrevW = state.strokeWidth === 0 ? 0 : Math.max(1, (state.strokeWidth || 2) * state.scale);
                if (!shiftPolyPreview) {
                    shiftPolyPreview = new Konva.Line({
                        points: [spLastX, spLastY, pointer.x, pointer.y],
                        stroke: state.drawingStroke,
                        strokeWidth: spPrevW,
                        lineCap: 'round',
                        dash: [6, 4]
                    });
                    getPageState(pageNumber).annotationLayer.add(shiftPolyPreview);
                } else {
                    shiftPolyPreview.stroke(state.drawingStroke);
                    shiftPolyPreview.strokeWidth(spPrevW);
                    shiftPolyPreview.points([spLastX, spLastY, pointer.x, pointer.y]);
                }
                getPageState(pageNumber).annotationLayer.batchDraw();
            }
            if (draftRect && draftStart) {
                var nextRect = normalizeRect(draftStart.x, draftStart.y, pointer.x, pointer.y);
                draftRect.setAttrs(nextRect);
                getPageState(pageNumber).overlayLayer.batchDraw();
            }
        });

        stage.on('mouseup touchend', function (event) {
            var tool = state.activeTool;
            var pointer = stage.getPointerPosition();
            if (drawing) {
                var linePoints = drawing.points();
                drawing.destroy();
                drawing = null;
                drawingLazy = null;
                getPageState(pageNumber).annotationLayer.draw();

                if (linePoints.length >= 4) {
                    createAnnotation(pageNumber, {
                        type: 'drawing',
                        width: state.strokeWidth,
                        color: state.drawingStroke,
                        lines: [linePoints.map(function (value) {
                            return value / state.scale;
                        })]
                    });
                }
                return;
            }

            if (pointer) {
                if (!state._pointClickSelect) {
                    clearSelection();
                }
                state._pointClickSelect = false;
                var domTarget = event && event.evt && event.evt.target;
                if (!(domTarget && domTarget.closest && (domTarget.closest('.tl-inline-text-editor') || domTarget.closest('.tl-save-textbox')))) {
                    var pageState = getPageState(pageNumber);
                    if (pageState && pageState.annotationLayer) {
                        var hit = pageState.annotationLayer.getIntersection(pointer);
                        var hitGroup = null;
                        if (hit) {
                            var n = hit;
                            while (n) {
                                if (n.getAttr && n.getAttr('annotationData')) {
                                    hitGroup = n;
                                    break;
                                }
                                n = n.getParent && n.getParent();
                            }
                        }
                        if (!hitGroup) {
                            var children = pageState.annotationLayer.getChildren();
                            for (var i = children.length - 1; i >= 0; i--) {
                                var gr = children[i];
                                var ad = gr.getAttr && gr.getAttr('annotationData');
                                if (!ad || ad.type !== 'textbox') { continue; }
                                var rect = gr.getClientRect && gr.getClientRect();
                                if (rect && pointer.x >= rect.x && pointer.x <= rect.x + rect.width && pointer.y >= rect.y && pointer.y <= rect.y + rect.height) {
                                    hitGroup = gr;
                                    break;
                                }
                            }
                        }
                        if (hitGroup) {
                            var data = hitGroup.getAttr('annotationData');
                            if (data && data.type === 'textbox' && data.uuid) {
                                var last = state._lastTextboxClick;
                                if (last && last.uuid === data.uuid && (Date.now() - last.time) < 400) {
                                    state._lastTextboxClick = null;
                                    showTextboxEditor(pageNumber, data);
                                    return;
                                }
                                state._lastTextboxClick = { time: Date.now(), pageNumber: pageNumber, uuid: data.uuid };
                            } else {
                                state._lastTextboxClick = null;
                            }
                        } else {
                            state._lastTextboxClick = null;
                        }
                    } else {
                        state._lastTextboxClick = null;
                    }
                }
            } else {
                state._lastTextboxClick = null;
            }

            if (tool === 'textbox' && pointer && !draftRect) {
                var domTarget = event && event.evt && event.evt.target;
                if (domTarget && domTarget.closest && (domTarget.closest('.tl-inline-text-editor') || domTarget.closest('.tl-textbox-label') || domTarget.closest('.tl-save-textbox'))) {
                    return;
                }
                var pageState = getPageState(pageNumber);
                var overlayHit = pageState && pageState.overlayLayer ? pageState.overlayLayer.getIntersection(pointer) : null;
                if (overlayHit && pageState) {
                    var node = overlayHit;
                    while (node) {
                        if (node === pageState.transformer) {
                            return;
                        }
                        node = node.getParent ? node.getParent() : null;
                    }
                }
                var hit = (pageState && pageState.annotationLayer)
                    ? pageState.annotationLayer.getIntersection(pointer)
                    : stage.getIntersection(pointer);
                var hitGroup = null;
                if (hit) {
                    var n = hit;
                    while (n) {
                        if (n.getAttr && n.getAttr('annotationData')) {
                            hitGroup = n;
                            break;
                        }
                        n = n.getParent && n.getParent();
                    }
                }
                if (!hitGroup && pageState && pageState.annotationLayer) {
                    var children = pageState.annotationLayer.getChildren();
                    for (var i = children.length - 1; i >= 0; i--) {
                        var gr = children[i];
                        var ad = gr.getAttr && gr.getAttr('annotationData');
                        if (!ad || ad.type !== 'textbox') { continue; }
                        var rect = gr.getClientRect && gr.getClientRect();
                        if (rect && pointer.x >= rect.x && pointer.x <= rect.x + rect.width && pointer.y >= rect.y && pointer.y <= rect.y + rect.height) {
                            hitGroup = gr;
                            break;
                        }
                    }
                }
                if (state.ignoreNextTextboxClick) {
                    state.ignoreNextTextboxClick = false;
                    return;
                }
                if (hitGroup) {
                    var data = hitGroup.getAttr('annotationData');
                    if (data && data.type === 'textbox') {
                        selectAnnotation(pageNumber, hitGroup);
                        return;
                    }
                    if (data && data.type !== 'textbox') {
                        selectAnnotation(pageNumber, hitGroup);
                        setTool('cursor');
                        return;
                    }
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

                var annotation = rectToolPayload(tool, finalRect);
                if (annotation) {
                    createAnnotation(pageNumber, annotation);
                }
            }
        });

        stage.on('dblclick dbltap', function (event) {
            var domTarget = event && event.evt && event.evt.target;
            if (domTarget && domTarget.closest && (domTarget.closest('.tl-inline-text-editor') || domTarget.closest('.tl-save-textbox'))) {
                return;
            }
            var pointer = stage.getPointerPosition();
            if (!pointer) { return; }
            var pageState = getPageState(pageNumber);
            if (!pageState || !pageState.annotationLayer) { return; }
            var hit = pageState.annotationLayer.getIntersection(pointer);
            var hitGroup = null;
            if (hit) {
                var n = hit;
                while (n) {
                    if (n.getAttr && n.getAttr('annotationData')) {
                        hitGroup = n;
                        break;
                    }
                    n = n.getParent && n.getParent();
                }
            }
            if (!hitGroup && pageState.annotationLayer) {
                var children = pageState.annotationLayer.getChildren();
                for (var i = children.length - 1; i >= 0; i--) {
                    var gr = children[i];
                    var ad = gr.getAttr && gr.getAttr('annotationData');
                    if (!ad || ad.type !== 'textbox') { continue; }
                    var rect = gr.getClientRect && gr.getClientRect();
                    if (rect && pointer.x >= rect.x && pointer.x <= rect.x + rect.width && pointer.y >= rect.y && pointer.y <= rect.y + rect.height) {
                        hitGroup = gr;
                        break;
                    }
                }
            }
            if (hitGroup) {
                var data = hitGroup.getAttr('annotationData');
                if (data && data.type === 'textbox' && data.uuid) {
                    showTextboxEditor(pageNumber, data);
                }
            }
        });

        document.addEventListener('keyup', function (ev) {
            if (ev.key !== 'Shift') { return; }
            if (state.activeTool !== 'drawing') { return; }
            if (shiftPolyPoints.length === 0) { return; }
            var ps = getPageState(pageNumber);
            if (shiftPolyLine) { shiftPolyLine.destroy(); shiftPolyLine = null; }
            if (shiftPolyPreview) { shiftPolyPreview.destroy(); shiftPolyPreview = null; }
            var finalPoints = shiftPolyPoints.slice();
            shiftPolyPoints = [];
            if (ps) { ps.annotationLayer.batchDraw(); }
            if (finalPoints.length < 4) { return; }
            var scale = state.scale || 1;
            createAnnotation(pageNumber, {
                type: 'drawing',
                width: state.strokeWidth,
                color: state.drawingStroke,
                lines: [finalPoints.map(function (v) { return v / scale; })]
            });
        });
    }

    function rectToolPayload(tool, rect) {
        var unscaled = {
            x: rect.x / state.scale,
            y: rect.y / state.scale,
            width: rect.width / state.scale,
            height: rect.height / state.scale
        };

        if (tool === 'area') {
            return {
                type: 'area',
                x: unscaled.x,
                y: unscaled.y,
                width: unscaled.width,
                height: unscaled.height
            };
        }

        if (tool === 'textbox') {
            return {
                type: 'textbox',
                x: unscaled.x,
                y: unscaled.y,
                width: unscaled.width,
                height: unscaled.height,
                size: state.textSize,
                font: state.textFont,
                color: state.textColor,
                content: ''
            };
        }

        if (tool === 'highlight') {
            return {
                type: 'highlight',
                color: state.annotationColor,
                rectangles: [
                    [unscaled.x, unscaled.y, unscaled.x + unscaled.width, unscaled.y + unscaled.height]
                ]
            };
        }

        if (tool === 'strikeout') {
            return {
                type: 'strikeout',
                color: '#e11d48',
                rectangles: [
                    [unscaled.x, unscaled.y, unscaled.x + unscaled.width, unscaled.y + unscaled.height]
                ]
            };
        }

        return null;
    }

    function normalizeRect(x1, y1, x2, y2) {
        var x = Math.min(x1, x2);
        var y = Math.min(y1, y2);
        return {
            x: x,
            y: y,
            width: Math.abs(x2 - x1),
            height: Math.abs(y2 - y1)
        };
    }

    function loadAndRenderAnnotations(pageNumber, forceRetry) {
        var maxAttempts = forceRetry ? 8 : 3;
        function run(attempt) {
            return ajax('read', {
                page_Number: String(pageNumber),
                tl_dbg: (!state.annotationsLoadedOnce && attempt === 0 && (state.initialLoadRetryCount || 0) < 4) ? '1' : '0',
                _cb: String(Date.now()) + '-' + String(pageNumber) + '-' + String(attempt),
                _r: String(Date.now()) + '-' + String(attempt)
            }).then(function (data) {
                if (data && data.__parseError) { debugLog('read', 'parseError', data); }
                var annotations = Array.isArray(data.annotations) ? data.annotations : [];
                if (!annotations.length && attempt === 0) { debugLog('read_empty', 'no annotations', {page: pageNumber, cb: String(Date.now())}); }
                
                var pageState = getPageState(pageNumber);
                if (!pageState) {
                    var key = "pw_" + String(pageNumber);
                    state._pageWait = state._pageWait || {};
                    state._pageWait[key] = (state._pageWait[key] || 0) + 1;
                    if (state._pageWait[key] > 28) { return; }
                    return new Promise(function (r) { setTimeout(r, 150); }).then(function () { return run(attempt); });
                }
                state._pageWait = state._pageWait || {};
                state._pageWait["pw_" + String(pageNumber)] = 0;
                var selectedId = (state.activeAnnotation && state.activeAnnotation.pageNumber === pageNumber)
                    ? String(state.activeAnnotation.annotationId || '') : null;
                annotations = annotations.filter(function (annotation) {
                    return !state.pendingDeletedAnnotations[String(annotation.uuid || '')];
                });

                if (!annotations.length && pageState.annotationsById && Object.keys(pageState.annotationsById).length) {
                    state.annotationsLoadedOnce = true;
                    return;
                }
                var pageEl = getPageElement(pageNumber);
                if (pageEl) {
                    pageEl.querySelectorAll('.tl-textbox-label').forEach(function (el) { el.remove(); });
                }
                pageState.annotationLayer.destroyChildren();
                pageState.annotationsById = {};
                annotations.forEach(function (annotation) {
                    drawAnnotation(pageNumber, annotation);
                });
                pageState.annotationLayer.draw();
                if (annotations.length) {
                    state.annotationsLoadedOnce = true;
                }

                if (selectedId && pageState.annotationsById[selectedId]) {
                    var group = pageState.annotationsById[selectedId];
                    state.activeAnnotation = {
                        pageNumber: pageNumber,
                        group: group,
                        annotationId: selectedId
                    };
                    pageState.transformer.nodes([group]);
                    pageState.transformer.visible(true);
                    pageState.overlayLayer.draw();
                    showDeleteButton();
                }

                if (!annotations.length && attempt < maxAttempts) {
                    return new Promise(function (resolve) {
                        setTimeout(resolve, 320 + (attempt * 120));
                    }).then(function () {
                        return run(attempt + 1);
                    });
                }
            }).catch(function (error) {
                if (attempt < maxAttempts) {
                    return new Promise(function (resolve) {
                        setTimeout(resolve, 320 + (attempt * 120));
                    }).then(function () {
                        return run(attempt + 1);
                    });
                }
                console.error('Loading annotations failed for page', pageNumber, error);
            });
        }
        return run(0);
    }

    function normalizeAnnotationType(annotation) {
        var type = String((annotation && annotation.type) || '').toLowerCase();
        if (type === 'draw') {
            return 'drawing';
        }
        if (type === 'pin') {
            return 'point';
        }
        if (type === 'text' && annotation && (annotation.content || annotation.size)) {
            return 'textbox';
        }
        return type;
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatPolishTimestamp(rawTs, fallbackText) {
        var ts = Number(rawTs);
        if (!Number.isFinite(ts) || ts <= 0) {
            return fallbackText || '';
        }
        var d = new Date(ts * 1000);
        if (!Number.isFinite(d.getTime())) {
            return fallbackText || '';
        }
        var day = d.getDate();
        var month = String(d.getMonth() + 1).padStart(2, '0');
        var year = d.getFullYear();
        var hour = d.getHours();
        var minute = String(d.getMinutes()).padStart(2, '0');
        return String(day) + '.' + month + '.' + String(year) + ' r., godz. ' + String(hour) + ':' + minute;
    }

    function extractRestorableComments(payload) {
        var comments = (payload && Array.isArray(payload.comments)) ? payload.comments : [];
        return comments.map(function (item) {
            var plain = (item.content || item.rawAnsweredquestion || item.answer || '').trim();
            if (!plain) {
                plain = String(item.displaycontent || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            }
            return {
                content: plain,
                visibility: item.visibility || 'public',
                isquestion: item.isquestion ? '1' : '0'
            };
        }).filter(function (entry) {
            return !!entry.content;
        });
    }

    function observeCommentNav() {
        var nav = document.getElementById('comment-nav');
        if (!nav) {
            return;
        }
        if (state.commentNavObserver) {
            return;
        }
        state.commentNavObserver = new MutationObserver(function () {
            if (state.commentNavMuting) {
                return;
            }
            ensureRestoreControls();
        });
        state.commentNavObserver.observe(nav, { childList: true, subtree: true });
    }

    function ensureRestoreControls() {
        var nav = document.getElementById('comment-nav');
        if (!nav) {
            if (state.restoreInitAttempts < 20) {
                state.restoreInitAttempts += 1;
                setTimeout(ensureRestoreControls, 300);
            }
            return;
        }
        state.restoreInitAttempts = 0;

        var wrap = nav.querySelector('.tl-restore-wrap');
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.className = 'tl-restore-wrap';
            wrap.style.display = 'inline-flex';
            wrap.style.alignItems = 'center';
            wrap.innerHTML = [
                '<button type="button" class="tl-restore-toggle">Restore</button>',
                '<div class="tl-restore-list" hidden></div>'
            ].join('');
            nav.appendChild(wrap);
        }

        var toggle = wrap.querySelector('.tl-restore-toggle');
        if (!toggle) {
            toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'tl-restore-toggle';
            toggle.textContent = 'Restore';
            wrap.appendChild(toggle);
        }
        toggle.style.display = 'inline-flex';
        toggle.style.visibility = 'visible';
        toggle.style.opacity = '1';

        var list = wrap.querySelector('.tl-restore-list');
        if (!list) {
            list = document.createElement('div');
            list.className = 'tl-restore-list';
            list.hidden = true;
            wrap.appendChild(list);
        }

        if (wrap.dataset.boundRestore === '1') {
            return;
        }
        wrap.dataset.boundRestore = '1';

        toggle.addEventListener('click', function (event) {
            event.preventDefault();
            list.hidden = !list.hidden;
            renderRestoreList();
        });
        document.addEventListener('click', function (event) {
            if (!wrap.contains(event.target)) {
                list.hidden = true;
            }
        });
        renderRestoreList();
    }

    function renderRestoreList() {
        var list = document.querySelector('#comment-nav .tl-restore-list');
        if (!list) {
            return;
        }
        state.commentNavMuting = true;
        if (!state.deletedAnnotations.length) {
            list.innerHTML = '<div class="tl-restore-empty">Brak usuniętych adnotacji.</div>';
            setTimeout(function () {
                state.commentNavMuting = false;
            }, 0);
            return;
        }
        list.innerHTML = state.deletedAnnotations.map(function (entry, index) {
            var type = escapeHtml((entry.annotation && entry.annotation.type) || 'annotation');
            var page = Number(entry.pageNumber) || 1;
            return '<button type="button" class="tl-restore-item" data-restore-index="' + String(index) + '">'
                + 'Przywróć: ' + type + ' (str. ' + String(page) + ')</button>';
        }).join('');
        list.querySelectorAll('.tl-restore-item').forEach(function (button) {
            button.addEventListener('click', function () {
                var idx = parseInt(button.getAttribute('data-restore-index') || '-1', 10);
                if (idx >= 0) {
                    restoreDeletedAnnotation(idx);
                }
            });
        });
        setTimeout(function () {
            state.commentNavMuting = false;
        }, 0);
    }

    function pushDeletedAnnotation(entry) {
        state.deletedAnnotations.unshift(entry);
        if (state.deletedAnnotations.length > 3) {
            state.deletedAnnotations = state.deletedAnnotations.slice(0, 3);
        }
        renderRestoreList();
    }

    function restoreDeletedAnnotation(index) {
        if (index < 0 || index >= state.deletedAnnotations.length) {
            return;
        }
        var entry = state.deletedAnnotations[index];
        state.deletedAnnotations.splice(index, 1);
        renderRestoreList();

        var source = clone(entry.annotation || {});
        delete source.uuid;
        delete source.class;
        delete source.owner;
        delete source.page;

        ajax('create', {
            page_Number: String(entry.pageNumber || 1),
            annotation: JSON.stringify(source)
        }).then(function (created) {
            if (!created || !created.uuid) {
                return;
            }
            var group = drawAnnotation(entry.pageNumber || 1, created);
            var pageState = getPageState(entry.pageNumber || 1);
            if (pageState) {
                pageState.annotationLayer.draw();
            }
            var chain = Promise.resolve();
            (entry.comments || []).forEach(function (comment) {
                chain = chain.then(function () {
                    return ajax('addComment', {
                        annotationId: String(created.uuid),
                        content: comment.content,
                        visibility: comment.visibility || 'public',
                        isquestion: comment.isquestion || '0',
                        pdfannotator_addcomment_editoritemid: '0'
                    }).catch(function () { return {}; });
                });
            });
            return chain.then(function () {
                delete state.pendingDeletedAnnotations[String(created.uuid || '')];
                if (group) {
                    selectAnnotation(entry.pageNumber || 1, group);
                }
                ensureCommentPanelVisible();
                ensureRestoreControls();
                loadCommentsForAnnotation(created.uuid, created.type);
            });
        }).catch(function (error) {
            console.error('Restore annotation failed', error);
        });
    }

    function initKeyboardShortcuts() {
        if (state.keyboardBound) {
            return;
        }
        state.keyboardBound = true;
        document.addEventListener('keydown', function (event) {
            var key = event.key;
            if (key !== 'Delete') {
                return;
            }
            var target = event.target;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) {
                return;
            }
            if (state.activeAnnotation) {
                event.preventDefault();
                deleteActiveAnnotation();
            }
        });
    }

    function ensureCommentComposer() {
        var panel = document.querySelector('#comment-wrapper .pdfannotator-comment-list');
        if (!panel) {
            return null;
        }
        var composer = panel.querySelector('.tl-comment-composer');
        if (composer) {
            return composer;
        }

        composer = document.createElement('div');
        composer.className = 'tl-comment-composer';
        composer.innerHTML = [
            '<textarea class="tl-comment-input" rows="3" placeholder="Wybierz adnotację i wpisz komentarz..."></textarea>',
            '<div class="tl-comment-composer-actions">',
            '<select class="tl-comment-visibility" title="Widoczność komentarza">',
            '<option value="public">Public</option>',
            '<option value="anonymous">Anonymous</option>',
            '<option value="private">Private</option>',
            '<option value="protected">Protected</option>',
            '</select>',
            '<button type="button" class="tl-comment-submit">Dodaj komentarz</button>',
            '</div>',
            '<div class="tl-comment-composer-hint"></div>'
        ].join('');

        panel.appendChild(composer);
        ensureRestoreControls();

        var input = composer.querySelector('.tl-comment-input');
        var visibility = composer.querySelector('.tl-comment-visibility');
        var submit = composer.querySelector('.tl-comment-submit');
        var hint = composer.querySelector('.tl-comment-composer-hint');

        function syncComposerState() {
            var enabled = !!(state.commentTarget && state.commentTarget.annotationId);
            input.disabled = !enabled;
            visibility.disabled = !enabled;
            submit.disabled = !enabled;
            hint.textContent = enabled ? ('Adnotacja #' + state.commentTarget.annotationId) : 'Najpierw zaznacz adnotację, potem dodaj komentarz.';
        }

        submit.addEventListener('click', function () {
            if (!state.commentTarget || !state.commentTarget.annotationId) {
                syncComposerState();
                return;
            }
            var content = (input.value || '').trim();
            if (!content) {
                input.focus();
                return;
            }
            submit.disabled = true;
            ajax('addComment', {
                annotationId: String(state.commentTarget.annotationId),
                content: content,
                visibility: visibility.value || 'public',
                isquestion: '0',
                pdfannotator_addcomment_editoritemid: '0'
            }).then(function () {
                var submittedContent = content;
                input.value = '';
                if (state.commentTarget && state.commentTarget.annotationId) {
                    var targetId = state.commentTarget.annotationId;
                    var targetType = state.commentTarget.annotationType;
                    // Optimistic immediate feedback: show freshly added comment instantly.
                    var list = document.querySelector('#comment-wrapper .comment-list-container');
                    if (list) {
                        var empty = list.querySelector('.tl-comment-empty');
                        if (empty) {
                            empty.remove();
                        }
                        var preview = document.createElement('article');
                        preview.className = 'tl-comment-item tl-comment-item--pending';
                        preview.innerHTML = '<div class="tl-comment-meta"><strong>Ty</strong><span>Teraz</span></div>'
                            + '<div class="tl-comment-body">' + escapeHtml(submittedContent) + '</div>';
                        list.appendChild(preview);
                    }
                    setTimeout(function () {
                        if (state.commentTarget && state.commentTarget.annotationId === targetId) {
                            loadCommentsForAnnotation(targetId, targetType);
                        }
                    }, 700);
                    setTimeout(function () {
                        if (state.commentTarget && state.commentTarget.annotationId === targetId) {
                            loadCommentsForAnnotation(targetId, targetType);
                        }
                    }, 1700);
                }
            }).catch(function (error) {
                console.error('Add comment failed', error);
            }).finally(function () {
                syncComposerState();
            });
        });

        composer.syncState = syncComposerState;
        syncComposerState();
        return composer;
    }

    function setCommentTarget(annotationId, annotationType) {
        state.commentTarget = {
            annotationId: String(annotationId || ''),
            annotationType: String(annotationType || '')
        };
        var composer = ensureCommentComposer();
        if (composer && composer.syncState) {
            composer.syncState();
        }
    }

    function clearCommentTarget() {
        state.commentTarget = null;
        var composer = ensureCommentComposer();
        if (composer && composer.syncState) {
            composer.syncState();
        }
    }

    function renderCommentsPanel(commentsPayload) {
        var list = document.querySelector('#comment-wrapper .comment-list-container');
        if (!list) {
            return;
        }
        var comments = (commentsPayload && Array.isArray(commentsPayload.comments)) ? commentsPayload.comments : [];
        if (!comments.length) {
            if (list.querySelector('.tl-comment-item--pending')) {
                return;
            }
            list.innerHTML = '<div class="tl-comment-empty">Brak komentarzy dla tej adnotacji.</div>';
            return;
        }
        list.innerHTML = comments.map(function (item) {
            var user = escapeHtml(item.username || 'Użytkownik');
            var formattedTime = formatPolishTimestamp(item.timecreatedts, item.timecreated || '');
            var time = escapeHtml(formattedTime || item.timecreated || '');
            var commentId = escapeHtml(item.uuid || item.id || '');
            var body = item.displaycontent || escapeHtml(item.content || item.rawAnsweredquestion || item.answer || '');
            return '<article class="tl-comment-item">'
                + '<div class="tl-comment-meta"><strong>' + user + '</strong><span class="tl-comment-meta-right"><span>' + time + '</span>'
                + '<button type="button" class="tl-comment-delete" data-comment-id="' + commentId + '" title="Usuń komentarz"><i class="fa fa-trash"></i></button>'
                + '</span></div>'
                + '<div class="tl-comment-body">' + body + '</div>'
                + '</article>';
        }).join('');

        list.querySelectorAll('.tl-comment-delete').forEach(function (button) {
            button.addEventListener('click', function (event) {
                event.preventDefault();
                var commentId = button.getAttribute('data-comment-id');
                if (!commentId) {
                    return;
                }
                button.disabled = true;
                ajax('deleteComment', { commentId: String(commentId) })
                    .then(function () {
                        if (state.commentTarget && state.commentTarget.annotationId) {
                            loadCommentsForAnnotation(state.commentTarget.annotationId, state.commentTarget.annotationType);
                        }
                    })
                    .catch(function (error) {
                        button.disabled = false;
                        console.error('Delete comment failed', error);
                    });
            });
        });
    }

    function loadCommentsForAnnotation(annotationId, annotationType) {
        if (!annotationId) {
            return;
        }
        ensureRestoreControls();
        setCommentTarget(annotationId, annotationType);
        var requestToken = ++state.commentRequestToken;
        var annotationIdStr = String(annotationId);
        var noCache = String(Date.now()) + '-' + annotationIdStr;

        ajax('getComments', { annotationId: annotationIdStr, _cb: noCache })
            .then(function (data) {
                if (requestToken !== state.commentRequestToken) {
                    return;
                }
                var comments = (data && Array.isArray(data.comments)) ? data.comments : [];
                renderCommentsPanel({ comments: comments });
            })
            .catch(function (error) {
                if (requestToken !== state.commentRequestToken) {
                    return;
                }
                console.error('Loading comments failed for annotation', annotationId, error);
            });
    }

    
    function logTextboxDebug(payload) {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open('POST', 'textbox_debug_log.php', true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify(payload || {}));
        } catch (e) {
        }
    }

    function logBug8Fullscreen() {
        try {
            var labels = document.querySelectorAll('.tl-textbox-label');
            var editors = document.querySelectorAll('.tl-inline-text-editor');
            var elements = [];
            labels.forEach(function (el) {
                var c = window.getComputedStyle(el);
                elements.push({ tag: el.tagName, class: 'tl-textbox-label', color: c.color, webkitTextFillColor: c.webkitTextFillColor || c.getPropertyValue('-webkit-text-fill-color') });
            });
            editors.forEach(function (el) {
                var c = window.getComputedStyle(el);
                elements.push({ tag: el.tagName, class: 'tl-inline-text-editor', color: c.color, webkitTextFillColor: c.webkitTextFillColor || c.getPropertyValue('-webkit-text-fill-color') });
            });
            var url = ((window.M && M.cfg && M.cfg.wwwroot) ? M.cfg.wwwroot : '') + '/mod/pdfannotator/bug8_fullscreen_log.php';
            var xhr = new XMLHttpRequest();
            xhr.open('POST', url, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify({ fullscreen: document.body.classList.contains('tl-pdf-fullscreen'), elements: elements }));
        } catch (e) {
        }
    }
    if (typeof window !== 'undefined') { window.logBug8Fullscreen = logBug8Fullscreen; }
    if (typeof window !== 'undefined') {
        window.tlInspectMode = function(on) {
            document.body.classList.toggle('tl-inspect-mode', !!on);
            console.log('TL Inspect mode: ' + (on ? 'ON – możesz zaznaczać elementy pod PDF (np. .tl-textbox-label). Wyłącz: tlInspectMode(0)' : 'OFF'));
        };
    }

    function computeWrappedLineCount(pageElement, text, widthPx, paddingX, paddingY, fontSizePx, fontFamily) {
        try {
            if (!pageElement) { return 1; }
            var el = document.createElement('div');
            el.setAttribute('aria-hidden', 'true');
            el.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre-wrap;word-break:break-word;box-sizing:border-box;margin:0;border:none;pointer-events:none;display:flex;align-items:flex-start;justify-content:flex-start;';
            // Użyj realnej szerokości pomniejszonej tylko o padding,
            // bez dodatkowego safety – nie chcemy sztucznie zwiększać
            // liczby zawinięć.
            var innerWidth = Math.max(1, Math.round(widthPx - 2 * paddingX));
            el.style.width = innerWidth + 'px';
            el.style.padding = Math.max(0, Math.round(paddingY)) + 'px ' + Math.max(0, Math.round(paddingX)) + 'px';
            el.style.fontSize = Math.max(10, Math.round(fontSizePx)) + 'px';
            el.style.fontFamily = (fontFamily || 'Open Sans') + ', sans-serif';
            el.style.lineHeight = '1.25';
            el.textContent = String(text || '');
            pageElement.appendChild(el);
            var lh = Math.max(1, Math.round(fontSizePx * 1.25));
            var h = el.offsetHeight || lh;
            if (el.parentNode) { el.parentNode.removeChild(el); }
            // Minimalne przeszacowanie wysokości, żeby ostatnia linia
            // nie była przycinana.
            return Math.max(1, Math.ceil(h / lh + 0.15));
        } catch (e) {
            return 1;
        }
    }

    function applyTextboxLabelLayout(pageNumber, labelEl, annotation, scale) {
        if (!labelEl || !annotation) { return; }
        var s = scale || state.scale || 1;
        var boxX = Math.round((annotation.x || 0) * s);
        var boxY = Math.round((annotation.y || 0) * s);
        var boxW = Math.max(12, Math.ceil((annotation.width || 1) * s));
        var boxH = Math.max(12, Math.ceil((annotation.height || 1) * s));
        var fontSizePx = Math.max(10, Math.round((annotation.size || state.textSize || 14) * s));
        var padX = Math.round(0.4 * fontSizePx);
        var padY = Math.round(0.4 * fontSizePx);
        var padRight = padX + Math.round(fontSizePx * 0.4);

        labelEl.style.position = 'absolute';
        labelEl.style.left = boxX + 'px';
        labelEl.style.top = boxY + 'px';
        labelEl.style.width = boxW + 'px';
        labelEl.style.height = boxH + 'px';
        labelEl.style.boxSizing = 'border-box';
        labelEl.style.paddingLeft = padX + 'px';
        labelEl.style.paddingRight = padRight + 'px';
        labelEl.style.paddingTop = padY + 'px';
        labelEl.style.paddingBottom = padY + 'px';
        labelEl.style.fontSize = fontSizePx + 'px';
        labelEl.style.fontFamily = (annotation.font || state.textFont || 'Open Sans') + ', sans-serif';
        labelEl.style.lineHeight = '1.25';
        labelEl.style.overflow = 'hidden';
        labelEl.style.whiteSpace = 'pre';
        labelEl.style.wordBreak = 'normal';
        var _isSingleLine = (annotation.content || '').split('\n').length === 1;
        labelEl.style.display = 'flex';
        labelEl.style.alignItems = _isSingleLine ? 'center' : 'flex-start';
        labelEl.style.justifyContent = _isSingleLine ? 'center' : 'flex-start';
        labelEl.style.textAlign = _isSingleLine ? 'center' : 'left';
    }

function fitTextboxAroundContent(annotationData) {
        if (!annotationData) {
            return;
        }
        var fontSize = Math.max(10, Number(annotationData.size || state.textSize || 14));
        var fontFamily = annotationData.font || state.textFont || 'Open Sans';
        var content = String(annotationData.content || '');
        var lines = content.split('\n');
        if (!lines.length) {
            lines = [''];
        }

        if (!fitTextboxAroundContent._canvas) {
            fitTextboxAroundContent._canvas = document.createElement('canvas');
            fitTextboxAroundContent._ctx = fitTextboxAroundContent._canvas.getContext('2d');
        }
        var ctx = fitTextboxAroundContent._ctx;
        if (!ctx) {
            return;
        }

        ctx.font = String(fontSize) + 'px ' + fontFamily + ', sans-serif';
        var maxWidth = 0;
        lines.forEach(function (line) {
            var sample = line && line.length ? line : ' ';
            maxWidth = Math.max(maxWidth, ctx.measureText(sample).width);
        });

        var lineHeight = fontSize * 1.25;
        var textHeight = Math.max(lineHeight, lines.length * lineHeight);
        var paddingLeft = Math.round(0.4 * fontSize);
        var paddingRight = paddingLeft + Math.round(0.4 * fontSize);
        var paddingY = Math.round(0.4 * fontSize);

        var newWidth = Math.max(40, Math.ceil(maxWidth + paddingLeft + paddingRight + 4));
        var newHeight = Math.max(30, Math.ceil(textHeight + paddingY * 2));

        annotationData.width = newWidth;
        annotationData.height = newHeight;
    }

    function showTextboxEditor(pageNumber, annotationData) {
        if (!annotationData || !annotationData.uuid) {
            return;
        }
        var viewer = viewerEl();
        var pageElement = viewer.querySelector('.page[data-page-number="' + pageNumber + '"]');
        if (!pageElement) {
            return;
        }

        var labelEl = pageElement.querySelector('.tl-textbox-label[data-annotation-id="' + annotationData.uuid + '"]');
        if (labelEl) {
            labelEl.style.visibility = 'hidden';
        }

        var existing = pageElement.querySelector('.tl-inline-text-editor');
        if (existing && existing.dataset.annotationId === String(annotationData.uuid)) {
            existing.focus();
            existing.select();
            return;
        }
        if (existing) {
            existing.remove();
        }

        var editor = document.createElement('textarea');
        editor.className = 'tl-inline-text-editor';
        editor.dataset.annotationId = String(annotationData.uuid);
        editor.value = annotationData.content || '';
        editor.setAttribute('wrap', 'off');
        var editorFontSize = Math.max(10, Number(annotationData.size || state.textSize || 14));
        var displayFontSize = Math.max(10, Math.round(editorFontSize * (state.scale || 1)));
        var editorFontFamily = annotationData.font || state.textFont || 'Open Sans';
        editor.style.left = (annotationData.x * state.scale) + 'px';
        editor.style.top = (annotationData.y * state.scale) + 'px';
        editor.style.width = Math.max(80, annotationData.width * state.scale) + 'px';
        editor.style.height = Math.max(36, annotationData.height * state.scale) + 'px';
        editor.style.fontSize = displayFontSize + 'px';
        editor.style.fontFamily = editorFontFamily + ', sans-serif';
        var _c = annotationData.color || '#111827';
        editor.style.color = _c;
        editor.style.webkitTextFillColor = _c;
        editor.style.lineHeight = '1.25';
        pageElement.appendChild(editor);
        var measureEl = document.createElement('div');
        measureEl.setAttribute('aria-hidden', 'true');
        measureEl.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre-wrap;word-wrap:break-word;pointer-events:none;margin:0;border:none;padding:0;';
        measureEl.style.fontSize = displayFontSize + 'px';
        measureEl.style.fontFamily = editorFontFamily + ', sans-serif';
        measureEl.style.lineHeight = '1.25';
        pageElement.appendChild(measureEl);
        function resizeEditorToContent() {
            var tmp = {
                size: editorFontSize,
                font: editorFontFamily,
                color: annotationData.color || '#111827',
                content: editor.value || '',
                width: Math.max(1, annotationData.width || 1),
                height: Math.max(1, annotationData.height || 1),
                x: annotationData.x || 0,
                y: annotationData.y || 0
            };
            fitTextboxAroundContent(tmp);
            var scale = state.scale || 1;
            var w = Math.max(80, Math.ceil(tmp.width * scale));
            var h = Math.max(36, Math.ceil(tmp.height * scale));
            editor.style.width = w + 'px';
            editor.style.height = h + 'px';
        }
        editor.addEventListener('input', resizeEditorToContent);
        editor.addEventListener('keyup', resizeEditorToContent);
        resizeEditorToContent();
        var saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'tl-save-textbox';
        saveBtn.style.cursor = 'pointer';
        saveBtn.setAttribute('aria-label', 'Save');
        saveBtn.innerHTML = '<i class="fa fa-check" aria-hidden="true"></i>';
        saveBtn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); commit(); });
        saveBtn.addEventListener('mousedown', function (e) { e.stopPropagation(); });
        pageElement.appendChild(saveBtn);
        function updateSaveBtnPos() {
            saveBtn.style.left = (editor.offsetLeft + editor.offsetWidth - 12) + 'px';
            saveBtn.style.top = (editor.offsetTop - 12) + 'px';
        }
        var resizeEditorToContentWithBtn = function () {
            resizeEditorToContent();
            updateSaveBtnPos();
        };
        editor.removeEventListener('input', resizeEditorToContent);
        editor.removeEventListener('keyup', resizeEditorToContent);
        editor.addEventListener('input', resizeEditorToContentWithBtn);
        editor.addEventListener('keyup', resizeEditorToContentWithBtn);
        updateSaveBtnPos();
        annotationData.width = editor.offsetWidth / (state.scale || 1);
        annotationData.height = editor.offsetHeight / (state.scale || 1);
        var _repl = redrawOneAnnotation(pageNumber, annotationData.uuid, annotationData);
        if (_repl) {
            var _lbl = _repl.getAttr('textboxLabelEl');
            if (_lbl) { _lbl.style.visibility = 'hidden'; }
        }
        editor.addEventListener('mousedown', function (event) { event.stopPropagation(); });
        editor.addEventListener('click', function (event) { event.stopPropagation(); });
        editor.addEventListener('dblclick', function (event) { event.stopPropagation(); });
        editor.focus();
        editor.select();

        var committed = false;
        function commit(fromBlur) {
            if (committed) {
                return;
            }
            committed = true;
            if (fromBlur) {
                state.ignoreNextTextboxClick = true;
            }
            if (saveBtn && saveBtn.parentNode) {
                saveBtn.parentNode.removeChild(saveBtn);
            }
            if (measureEl && measureEl.parentNode) {
                measureEl.parentNode.removeChild(measureEl);
            }
            annotationData.content = editor.value || '';
            annotationData.size = editorFontSize;
            annotationData.font = editorFontFamily;
            var _anchorX = editor.offsetLeft / (state.scale || 1);
            var _anchorY = editor.offsetTop / (state.scale || 1);
            var _anchorW = editor.offsetWidth / (state.scale || 1);
            fitTextboxAroundContent(annotationData);
            var _tbLines = (annotationData.content || '').split('\n').length;
            if (_tbLines === 1) {
                annotationData.x = _anchorX + (_anchorW - annotationData.width) / 2;
            } else {
                annotationData.x = _anchorX;
            }
            annotationData.y = _anchorY;
            var scale = state.scale || 1;
            var wrappedH = annotationData.height;
            (function () {
                var wrapEl = document.createElement('div');
                wrapEl.setAttribute('aria-hidden', 'true');
                wrapEl.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre-wrap;word-wrap:break-word;margin:0;border:none;pointer-events:none;padding:6px;box-sizing:border-box;';
                wrapEl.style.width = editor.offsetWidth + 'px';
                wrapEl.style.fontSize = displayFontSize + 'px';
                wrapEl.style.fontFamily = editorFontFamily + ', sans-serif';
                wrapEl.style.lineHeight = '1.25';
                wrapEl.textContent = annotationData.content || '';
                pageElement.appendChild(wrapEl);
                wrappedH = wrapEl.offsetHeight / scale;
                if (wrapEl.parentNode) { wrapEl.parentNode.removeChild(wrapEl); }
            })();
            annotationData.height = Math.max(annotationData.height, editor.offsetHeight / scale, wrappedH);
            redrawOneAnnotation(pageNumber, annotationData.uuid, annotationData);
            logTextboxDebug({
                kind: 'textbox-commit',
                page: pageNumber,
                width: annotationData.width,
                height: annotationData.height,
                scale: state.scale || 1,
                contentLength: (annotationData.content || '').length
            });
            persistAnnotation(annotationData);
            editor.remove();
            clearSelection();
        }
        editor.addEventListener('blur', function () { commit(true); });
        editor.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                committed = true;
                if (saveBtn && saveBtn.parentNode) {
                    saveBtn.parentNode.removeChild(saveBtn);
                }
                if (measureEl && measureEl.parentNode) {
                    measureEl.parentNode.removeChild(measureEl);
                }
                if (labelEl) {
                    labelEl.style.visibility = 'visible';
                }
                editor.remove();
                clearSelection();
                return;
            }
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                commit();
            }
        });
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
        editor.setAttribute('wrap', 'off');

        var editorFontSize = Math.max(10, Number(state.textSize || 14));
        var editorFontFamily = state.textFont || 'Open Sans';
        var displayFontSize = Math.max(10, Math.round(editorFontSize * (state.scale || 1)));

        var paddingTop = 5;
        var paddingLeft = 6;
        var baselineOffset = Math.round(displayFontSize * 0.78);
        editor.style.left = (pointerX - paddingLeft) + 'px';
        editor.style.top = (pointerY - paddingTop - baselineOffset + 3) + 'px';
        editor.style.minWidth = '60px';
        editor.style.minHeight = '36px';
        editor.style.width = '60px';
        editor.style.height = '36px';
        editor.style.fontSize = displayFontSize + 'px';
        editor.style.fontFamily = editorFontFamily + ', sans-serif';
        editor.style.color = state.textColor || '#111827';
        editor.style.webkitTextFillColor = editor.style.color;
        editor.style.lineHeight = '1.25';
        editor.style.outline = 'none';
        editor.style.webkitFontSmoothing = 'subpixel-antialiased';
        editor.style.textRendering = 'geometricPrecision';

        pageElement.appendChild(editor);

        var measureEl = document.createElement('div');
        measureEl.setAttribute('aria-hidden', 'true');
        measureEl.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre-wrap;word-wrap:break-word;pointer-events:none;margin:0;border:none;padding:0;';
        measureEl.style.fontSize = displayFontSize + 'px';
        measureEl.style.fontFamily = editorFontFamily + ', sans-serif';
        measureEl.style.lineHeight = '1.25';
        pageElement.appendChild(measureEl);

        function resizeEditorToContent() {
            var tmp = {
                size: editorFontSize,
                font: editorFontFamily,
                color: state.textColor || '#111827',
                content: editor.value || '',
                width: 1,
                height: 1,
                x: 0,
                y: 0
            };
            fitTextboxAroundContent(tmp);
            var scale = state.scale || 1;
            var w = Math.max(60, Math.ceil(tmp.width * scale));
            var h = Math.max(36, Math.ceil(tmp.height * scale));
            editor.style.width = w + 'px';
            editor.style.height = h + 'px';
        }

        var saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'tl-save-textbox';
        saveBtn.style.cursor = 'pointer';
        saveBtn.setAttribute('aria-label', 'Save');
        saveBtn.innerHTML = '<i class="fa fa-check" aria-hidden="true"></i>';
        saveBtn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); commit(); });
        saveBtn.addEventListener('mousedown', function (e) { e.stopPropagation(); });
        pageElement.appendChild(saveBtn);
        function updateSaveBtnPos() {
            saveBtn.style.left = (editor.offsetLeft + editor.offsetWidth - 12) + 'px';
            saveBtn.style.top = (editor.offsetTop - 12) + 'px';
        }
        function resizeAndUpdateBtn() {
            resizeEditorToContent();
            updateSaveBtnPos();
        }
        editor.addEventListener('input', resizeAndUpdateBtn);
        editor.addEventListener('keyup', resizeAndUpdateBtn);
        resizeAndUpdateBtn();

        editor.addEventListener('mousedown', function (event) { event.stopPropagation(); });
        editor.addEventListener('click', function (event) { event.stopPropagation(); });
        editor.addEventListener('dblclick', function (event) { event.stopPropagation(); });

        editor.focus();
        editor.select();

        var committed = false;

        function cleanup() {
            try {
                if (saveBtn && saveBtn.parentNode) {
                    saveBtn.parentNode.removeChild(saveBtn);
                }
                if (measureEl && measureEl.parentNode) {
                    measureEl.parentNode.removeChild(measureEl);
                }
                editor.remove();
            } catch (e) {}
        }

        function commit(fromBlur) {
            if (committed) {
                return;
            }
            committed = true;
            if (fromBlur) {
                state.ignoreNextTextboxClick = true;
            }

            var content = String(editor.value || '').trim();
            if (!content) {
                state.ignoreNextTextboxClick = true;
                cleanup();
                return;
            }

            var pageState = getPageState(pageNumber);
            if (!pageState) {
                cleanup();
                return;
            }

            var unscaledBoxX = (pointerX - paddingLeft) / state.scale;
            var unscaledBoxY = (pointerY - paddingTop - baselineOffset + 3) / state.scale;

            var measure = {
                type: 'textbox',
                x: 0,
                y: 0,
                width: 1,
                height: 1,
                size: editorFontSize,
                font: editorFontFamily,
                color: state.textColor || '#111827',
                content: content
            };

            fitTextboxAroundContent(measure);

            var scale = state.scale || 1;
            var wrappedHeightUnscaled = measure.height;
            (function () {
                var wrapEl = document.createElement('div');
                wrapEl.setAttribute('aria-hidden', 'true');
                wrapEl.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre-wrap;word-wrap:break-word;margin:0;border:none;pointer-events:none;padding:6px;box-sizing:border-box;';
                wrapEl.style.width = editor.offsetWidth + 'px';
                wrapEl.style.fontSize = displayFontSize + 'px';
                wrapEl.style.fontFamily = editorFontFamily + ', sans-serif';
                wrapEl.style.lineHeight = '1.25';
                wrapEl.textContent = content;
                pageElement.appendChild(wrapEl);
                wrappedHeightUnscaled = wrapEl.offsetHeight / scale;
                if (wrapEl.parentNode) { wrapEl.parentNode.removeChild(wrapEl); }
            })();
            var _tbLines2 = content.split('\n').length;
            var _tbAnchorX = _tbLines2 === 1
                ? unscaledBoxX + (editor.offsetWidth / scale - measure.width) / 2
                : unscaledBoxX;
            var annotation = {
                type: 'textbox',
                x: _tbAnchorX,
                y: unscaledBoxY,
                width: editor.offsetWidth / scale,
                height: Math.max(measure.height, editor.offsetHeight / scale, wrappedHeightUnscaled),
                size: editorFontSize,
                font: editorFontFamily,
                color: state.textColor || '#111827',
                content: content
            };

            ajax('create', {
                page_Number: String(pageNumber),
                annotation: JSON.stringify(annotation)
            }).then(function (created) {
                if (!created || !created.uuid) {
                    return;
                }
                created.width = annotation.width;
                created.height = annotation.height;
                created.x = annotation.x;
                created.y = annotation.y;
                var createdGroup = drawAnnotation(pageNumber, created);
                var pageState = getPageState(pageNumber);
                if (pageState) {
                    pageState.annotationLayer.draw();
                }
                if (createdGroup) {
                    clearSelection();
                }
                ensureCommentPanelVisible();
                loadCommentsForAnnotation(created.uuid, created.type);
            }).catch(function (error) {
                console.error('Create annotation failed', error);
            }).finally(function () {
                cleanup();
            });
        }

        editor.addEventListener('blur', function () { commit(true); });
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
        
                var pageState = getPageState(pageNumber);
        if (!pageState) {
            return;
        }
        annotation.type = normalizeAnnotationType(annotation);

        var group = new Konva.Group({
            name: 'tl-annotation-group',
            draggable: isDraggableType(annotation.type)
        });
        group.setAttr('annotationId', annotation.uuid);
        group.setAttr('annotationType', annotation.type);
        group.setAttr('annotationData', clone(annotation));

        var scale = state.scale;
        if (annotation.type === 'point') {
            var pinH = 22;
            var pinUnitsH = 4222;
            var pathScale = (pinH / pinUnitsH) * scale;
            var pinGroup = new Konva.Group({
                x: annotation.x * scale,
                y: annotation.y * scale,
                offsetX: 0,
                offsetY: 0,
                scaleX: pathScale,
                scaleY: pathScale
            });
            pinGroup.add(new Konva.Path({
                x: 0,
                y: 0,
                data: 'M 1445,-2779 C 1445,-2526 1380,-2279 1252,-2059 1125,-1838 0,0 0,0 C 0,0 -1119,-1838 -1246,-2059 -1373,-2279 -1439,-2526 -1439,-2779 C -1439,-3033 -1372,-3281 -1246,-3501 -1119,-3722 -938,-3904 -718,-4031 -498,-4158 -250,-4222 4,-4222 C 257,-4222 504,-4156 724,-4030 945,-3903 1125,-3721 1248,-3500 1374,-3280 1441,-3033 1445,-2781 L 1445,-2779 Z',
                fill: 'rgb(114,159,207)',
                listening: false
            }));
            pinGroup.add(new Konva.Circle({
                x: 4,
                y: -2878,
                radius: 525,
                fill: 'rgb(247,205,0)',
                listening: false
            }));
            var marginUnits = 4 / pathScale;
            var halfWidth = 1500 + marginUnits;
            var extraTop = 0.12 * pinUnitsH;
            var extraBottom = marginUnits;
            pinGroup.add(new Konva.Rect({
                x: -halfWidth,
                y: -pinUnitsH - extraTop,
                width: halfWidth * 2,
                height: pinUnitsH + extraTop + extraBottom,
                fill: 'transparent',
                listening: true
            }));
            group.add(pinGroup);
        } else if (annotation.type === 'area') {
            group.add(new Konva.Rect({
                x: annotation.x * scale,
                y: annotation.y * scale,
                width: annotation.width * scale,
                height: annotation.height * scale,
                stroke: '#f59e0b',
                strokeWidth: 2,
                fill: 'rgba(245, 158, 11, 0.18)'
            }));
        } else if (annotation.type === 'textbox') {
            var boxX = Math.round(annotation.x * scale);
            var boxY = Math.round(annotation.y * scale);
            var boxWidth = Math.max(12, Math.ceil(annotation.width * scale));
            var boxHeight = Math.max(12, Math.ceil(annotation.height * scale));
            group.add(new Konva.Rect({
                x: boxX,
                y: boxY,
                width: boxWidth,
                height: boxHeight,
                cornerRadius: 7,
                fill: 'rgba(235, 242, 252, 0.35)',
                stroke: 'rgba(235, 242, 252, 0.35)',
                strokeWidth: 0
            }));
            var textFontSizePx = Math.max(10, Math.round((annotation.size || state.textSize || 14) * scale));
            var textPaddingX = Math.round(0.4 * textFontSizePx);
            var textPaddingY = Math.round(0.4 * textFontSizePx);
            var labelEl = document.createElement('div');
            labelEl.className = 'tl-textbox-label';
            labelEl.setAttribute('data-annotation-id', String(annotation.uuid || ''));
            labelEl.style.position = 'absolute';
            var _labelColor = annotation.color || '#1f2937';
            labelEl.style.setProperty('--tl-label-color', _labelColor, 'important');
            labelEl.style.setProperty('color', _labelColor, 'important');
            labelEl.style.setProperty('-webkit-text-fill-color', _labelColor, 'important');
            labelEl.style.pointerEvents = 'none';
            labelEl.style.whiteSpace = 'pre-wrap';
            labelEl.style.wordBreak = 'break-word';
            labelEl.textContent = annotation.content || '';
            applyTextboxLabelLayout(pageNumber, labelEl, annotation, scale);
            labelEl.textContent = annotation.content || '';
            var pageEl = getPageElement(pageNumber);
            if (pageEl) {
                pageEl.appendChild(labelEl);
            }
            group.setAttr('textboxLabelEl', labelEl);
        } else if (annotation.type === 'drawing') {
            var rawLines = annotation.lines;
            if (typeof rawLines === 'string') {
                try {
                    rawLines = JSON.parse(rawLines);
                } catch (err) {
                    rawLines = [];
                }
            }
            if (!Array.isArray(rawLines) && rawLines && Array.isArray(rawLines.points)) {
                rawLines = [rawLines.points];
            }
            var lines = Array.isArray(rawLines) ? rawLines : [];
            if (lines.length && typeof lines[0] === 'number') {
                lines = [lines];
            }
            // Legacy format from old stack: [[x,y],[x,y],...]
            if (lines.length && Array.isArray(lines[0]) && lines[0].length === 2 &&
                typeof lines[0][0] !== 'object' && typeof lines[0][1] !== 'object') {
                var flattened = [];
                lines.forEach(function (pair) {
                    if (Array.isArray(pair) && pair.length >= 2) {
                        flattened.push(Number(pair[0]) || 0, Number(pair[1]) || 0);
                    }
                });
                if (flattened.length >= 4) {
                    lines = [flattened];
                }
            }
            // Legacy format from old stack: [{x,y},{x,y},...]
            if (lines.length && !Array.isArray(lines[0]) && typeof lines[0] === 'object' &&
                typeof lines[0].x !== 'undefined' && typeof lines[0].y !== 'undefined') {
                var flattenedObj = [];
                lines.forEach(function (pt) {
                    if (pt && typeof pt.x !== 'undefined' && typeof pt.y !== 'undefined') {
                        flattenedObj.push(Number(pt.x) || 0, Number(pt.y) || 0);
                    }
                });
                if (flattenedObj.length >= 4) {
                    lines = [flattenedObj];
                }
            }
            lines.forEach(function (line) {
                var normalized = [];
                if (Array.isArray(line)) {
                    if (line.length && typeof line[0] === 'object' && line[0] !== null) {
                        line.forEach(function (pt) {
                            if (Array.isArray(pt) && pt.length >= 2) {
                                normalized.push(Number(pt[0]) || 0, Number(pt[1]) || 0);
                            } else if (typeof pt.x !== 'undefined' && typeof pt.y !== 'undefined') {
                                normalized.push(Number(pt.x) || 0, Number(pt.y) || 0);
                            }
                        });
                    } else {
                        normalized = line.map(function (value) {
                            return Number(value) || 0;
                        });
                    }
                } else if (line && typeof line === 'object' && Array.isArray(line.points)) {
                    normalized = line.points.map(function (value) {
                        return Number(value) || 0;
                    });
                }
                if (!Array.isArray(normalized) || normalized.length < 4) {
                    return;
                }
                var scaledPoints = normalized.map(function (value) {
                    return value * scale;
                });
                var lineWidth = annotation.width === 0 ? 0 : Math.max(1, (annotation.width || 2) * scale);
                group.add(new Konva.Line({
                    points: scaledPoints,
                    stroke: annotation.color || '#ef4444',
                    strokeWidth: lineWidth,
                    hitStrokeWidth: lineWidth === 0 ? 4 : Math.max(10, lineWidth * 4),
                    lineCap: 'round',
                    lineJoin: 'round'
                }));
            });
        } else if (annotation.type === 'highlight' || annotation.type === 'text' || annotation.type === 'strikeout') {
            var rectangles = normalizeRectangles(annotation.rectangles);
            rectangles.forEach(function (rect) {
                var color = annotation.type === 'strikeout' ? '#6b7280' : (annotation.color || '#fff70f');
                var isStrikeout = annotation.type === 'strikeout';
                var rectShape = new Konva.Rect({
                    x: rect.x1 * scale,
                    y: rect.y1 * scale,
                    width: (rect.x2 - rect.x1) * scale,
                    height: (rect.y2 - rect.y1) * scale,
                    fill: isStrikeout ? 'rgba(51, 51, 51, 0.25)' : 'rgba(255, 247, 15, 0.33)',
                    stroke: isStrikeout ? color : undefined,
                    strokeEnabled: isStrikeout,
                    strokeWidth: isStrikeout ? 1 : 0
                });
                group.add(rectShape);
                if (annotation.type === 'strikeout') {
                    var midY = (rect.y1 + rect.y2) / 2;
                    group.add(new Konva.Line({
                        points: [rect.x1 * scale, midY * scale, rect.x2 * scale, midY * scale],
                        stroke: color,
                        strokeWidth: 2
                    }));
                }
            });
        }

        group.on('click tap', function (event) {
            event.cancelBubble = true;
            selectAnnotation(pageNumber, group);
            ensureCommentPanelVisible();
            loadCommentsForAnnotation(annotation.uuid, annotation.type);
        });

        if (annotation.type === 'textbox') {
            group.on('dblclick dbltap', function (event) {
                event.cancelBubble = true;
                var currentData = group.getAttr('annotationData') || annotation;
                showTextboxEditor(pageNumber, currentData);
            });
        }

        if (group.draggable()) {
            group.on('dragstart', function () {
                if (state.activeAnnotation && state.activeAnnotation.group === group && state.deleteButton) {
                    state.deleteButton.style.display = 'none';
                }
            });
            group.on('dragmove', function () {
                if (state.activeAnnotation && state.activeAnnotation.group === group) {
                    updateDeleteButtonPosition();
                }
            });
            group.on('dragend', function () {
                onAnnotationDragged(pageNumber, group);
            });
        }

        pageState.annotationLayer.add(group);
        pageState.annotationsById[String(annotation.uuid)] = group;
        return group;
    }

    function normalizeRectangles(rectangles) {
        if (typeof rectangles === 'string') {
            try {
                rectangles = JSON.parse(rectangles);
            } catch (err) {
                rectangles = [];
            }
        }
        if (!Array.isArray(rectangles)) {
            return [];
        }
        return rectangles.map(function (rect) {
            if (Array.isArray(rect) && rect.length >= 4) {
                return {
                    x1: Number(rect[0]) || 0,
                    y1: Number(rect[1]) || 0,
                    x2: Number(rect[2]) || 0,
                    y2: Number(rect[3]) || 0
                };
            }
            return {
                x1: Number(rect.x1 || rect.x || 0),
                y1: Number(rect.y1 || rect.y || 0),
                x2: Number(rect.x2 || (rect.x + rect.width) || 0),
                y2: Number(rect.y2 || (rect.y + rect.height) || 0)
            };
        });
    }

    function isDraggableType(type) {
        return type === 'point' || type === 'area' || type === 'textbox' || type === 'drawing';
    }

    function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function selectAnnotation(pageNumber, group) {
        clearSelection();
        
                var pageState = getPageState(pageNumber);
        if (!pageState) {
            return;
        }
        state.activeAnnotation = {
            pageNumber: pageNumber,
            group: group,
            annotationId: String(group.getAttr('annotationId') || '')
        };
        setCommentTarget(state.activeAnnotation.annotationId, String(group.getAttr('annotationType') || ''));

        if (group.draggable()) {
            pageState.transformer.nodes([group]);
            pageState.transformer.visible(true);
            pageState.overlayLayer.draw();
        }
        showDeleteButton();
    }

    function clearSelection() {
        if (state.activeAnnotation) {
            var pageState = getPageState(state.activeAnnotation.pageNumber);
            if (pageState && pageState.transformer) {
                pageState.transformer.nodes([]);
                pageState.transformer.visible(false);
                pageState.overlayLayer.draw();
            }
        }
        state.activeAnnotation = null;
        clearCommentTarget();
        if (state.deleteButton) {
            state.deleteButton.style.display = 'none';
        }
        state.deleteButtonPage = null;
    }

    function showDeleteButton() {
        if (!state.activeAnnotation) {
            return;
        }
        var pageNo = state.activeAnnotation.pageNumber;
        var pageElement = viewerEl().querySelector('.page[data-page-number="' + pageNo + '"]');
        if (!pageElement) {
            return;
        }

        if (!state.deleteButton) {
            var button = document.createElement('button');
            button.id = 'tl-delete-annotation';
            button.type = 'button';
            button.innerHTML = '<i class="fa fa-times" aria-hidden="true"></i>';
            button.setAttribute('aria-label', 'Delete annotation');
            button.className = 'tl-delete-annotation';
            button.addEventListener('click', function () {
                deleteActiveAnnotation();
            });
            state.deleteButton = button;
        }

        if (state.deleteButton.parentNode !== pageElement) {
            if (state.deleteButton.parentNode) {
                state.deleteButton.parentNode.removeChild(state.deleteButton);
            }
            pageElement.appendChild(state.deleteButton);
        }
        state.deleteButtonPage = pageNo;
        updateDeleteButtonPosition();
        state.deleteButton.style.display = 'flex';
    }

    function updateDeleteButtonPosition() {
        if (!state.activeAnnotation || !state.deleteButton) {
            return;
        }
        var group = state.activeAnnotation.group;
        var pageNo = state.activeAnnotation.pageNumber;
        var pageElement = viewerEl().querySelector('.page[data-page-number="' + pageNo + '"]');
        if (!group || !pageElement) {
            return;
        }
        var box = group.getClientRect({ skipTransform: false, skipShadow: true });
        var left = box.x + box.width - 12;
        var top = box.y - 12;
        state.deleteButton.style.left = Math.max(0, left) + 'px';
        state.deleteButton.style.top = Math.max(0, top) + 'px';
    }

    function deleteActiveAnnotation() {
        if (!state.activeAnnotation) {
            return;
        }
        var active = state.activeAnnotation;
        var group = active.group;
        var annotationId = group && group.getAttr('annotationId');
        if (!annotationId) {
            return;
        }
        var annotationIdStr = String(annotationId);
        var pageNumber = active.pageNumber;
        
                var pageState = getPageState(pageNumber);
        var annotationData = clone(group.getAttr('annotationData') || {});

        state.pendingDeletedAnnotations[annotationIdStr] = true;

        // Optimistic UI: remove immediately for intuitive behavior.
        if (pageState) {
            delete pageState.annotationsById[annotationIdStr];
        }
        if (group) {
            var labelEl = group.getAttr('textboxLabelEl');
            if (labelEl && labelEl.parentNode) {
                labelEl.parentNode.removeChild(labelEl);
            }
            group.destroy();
        }
        if (pageState) {
            pageState.annotationLayer.draw();
        }
        clearSelection();

        ajax('getComments', { annotationId: annotationIdStr, _cb: String(Date.now()) + '-del' })
            .catch(function () {
                return { comments: [] };
            })
            .then(function (commentsPayload) {
                var restorableComments = extractRestorableComments(commentsPayload);
                return ajax('delete', { annotation: annotationIdStr }).then(function () {
                    delete state.pendingDeletedAnnotations[annotationIdStr];
                    pushDeletedAnnotation({
                        annotation: annotationData,
                        pageNumber: pageNumber,
                        comments: restorableComments
                    });
                });
            })
            .catch(function (error) {
                console.error('Delete annotation failed', error);
                delete state.pendingDeletedAnnotations[annotationIdStr];
                // Rollback optimistic removal if backend delete failed.
                if (pageState && annotationData && annotationData.uuid) {
                    var restored = drawAnnotation(pageNumber, annotationData);
                    if (restored) {
                        pageState.annotationLayer.draw();
                    }
                }
            });
    }

    function onAnnotationDragged(pageNumber, group) {
        var annotation = group.getAttr('annotationData');
        if (!annotation) {
            return;
        }
        var scale = state.scale;

        if (annotation.type === 'point') {
            var point = group.findOne('Circle');
            if (!point) {
                return;
            }
            annotation.x = point.x() / scale;
            annotation.y = point.y() / scale;
        } else if (annotation.type === 'area' || annotation.type === 'textbox') {
            var rect = group.findOne('Rect');
            if (!rect) {
                return;
            }
            var gx = group.x();
            var gy = group.y();
            annotation.x = (gx + rect.x()) / scale;
            annotation.y = (gy + rect.y()) / scale;
            annotation.width = rect.width() / scale;
            annotation.height = rect.height() / scale;
            rect.x(annotation.x * scale);
            rect.y(annotation.y * scale);
            group.position({ x: 0, y: 0 });
            if (annotation.type === 'textbox') {
                var labelEl = group.getAttr('textboxLabelEl');
                if (labelEl) {
                    applyTextboxLabelLayout(pageNumber, labelEl, annotation, scale);
                }
            }
        } else if (annotation.type === 'drawing') {
            var delta = group.position();
            var lines = Array.isArray(annotation.lines) ? annotation.lines : [];
            annotation.lines = lines.map(function (line) {
                if (!Array.isArray(line)) {
                    return line;
                }
                return line.map(function (value, idx) {
                    var add = idx % 2 === 0 ? delta.x / scale : delta.y / scale;
                    return value + add;
                });
            });
            group.position({ x: 0, y: 0 });
            var redrawn = redrawOneAnnotation(pageNumber, annotation.uuid, annotation);
            if (redrawn) {
                group = redrawn;
            }
        }

        group.setAttr('annotationData', annotation);
        persistAnnotation(annotation);
        if (state.activeAnnotation && (state.activeAnnotation.group === group || state.activeAnnotation.annotationId === String(annotation.uuid))) {
            state.activeAnnotation.group = group;
            state.activeAnnotation.pageNumber = pageNumber;
            state.activeAnnotation.annotationId = String(annotation.uuid);
            showDeleteButton();
        }
    }

    function redrawOneAnnotation(pageNumber, annotationId, annotationData) {
        
                var pageState = getPageState(pageNumber);
        if (!pageState) {
            return null;
        }
        var key = String(annotationId);
        var current = pageState.annotationsById[key];
        if (current) {
            var labelEl = current.getAttr('textboxLabelEl');
            if (labelEl && labelEl.parentNode) {
                labelEl.parentNode.removeChild(labelEl);
            }
            current.destroy();
        }
        var replacement = drawAnnotation(pageNumber, annotationData);
        pageState.annotationLayer.draw();

        if (state.activeAnnotation && state.activeAnnotation.annotationId === key && replacement) {
            state.activeAnnotation.group = replacement;
            state.activeAnnotation.pageNumber = pageNumber;
            pageState.transformer.nodes([replacement]);
            pageState.transformer.visible(true);
            pageState.overlayLayer.draw();
            showDeleteButton();
        }
        return replacement || null;
    }

    function persistAnnotation(annotation) {
        ajax('update', {
            annotationId: String(annotation.uuid),
            annotation: JSON.stringify({ annotation: annotation })
        }).catch(function (error) {
            console.error('Update annotation failed', error);
        });
    }

    function createAnnotation(pageNumber, annotation) {
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
                clearSelection();
            }
            ensureCommentPanelVisible();
            loadCommentsForAnnotation(created.uuid, created.type);
            if (created.type === 'textbox') {
                setTimeout(function () {
                    showTextboxEditor(pageNumber, created);
                }, 0);
            }
        }).catch(function (error) {
            console.error('Create annotation failed', error);
        });
    }


    function scheduleAnnotationRecovery(reason) {
        if (state.recoveryTimer) {
            clearTimeout(state.recoveryTimer);
            state.recoveryTimer = null;
        }
        var delay = (reason === 'shown.bs.tab') ? 350 : 220;
        state.recoveryTimer = setTimeout(function () {
            state.recoveryTimer = null;
            if (!state.pdf) {
                return;
            }
            var viewer = viewerEl();
            if (!viewer) {
                return;
            }

            var hasPages = !!viewer.querySelector('.page');
            var likelyHiddenRender = (viewer.clientWidth < 80 || viewer.clientHeight < 80);
            var mustRebuild = !hasPages;

            // Recovery: never rebuild PDF on focus/alt-tab; only re-fetch annotations.
            if (mustRebuild) {
                renderDocument();
                return;
            }

            for (var pageNo = 1; pageNo <= state.pdf.numPages; pageNo++) {
                loadAndRenderAnnotations(pageNo, true);
            }
        }, delay);
    }

    function bindVisibilityRecovery() {
        if (state.visibilityRecoveryBound) {
            return;
        }
        state.visibilityRecoveryBound = true;

        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) {
                scheduleAnnotationRecovery('visibilitychange');
            }
        });

        document.addEventListener('shown.bs.tab', function () {
            scheduleAnnotationRecovery('shown.bs.tab');
        });
    }

    function bootstrap(cm, documentObject, contextId, userId, capabilities, toolbarSettings, page, annoid, commid, editorSettings) {
        if (state.bootstrapped) {
            // Prevent double init / double render (can happen with Moodle tab lifecycles).
            scheduleAnnotationRecovery('rebootstrap');
            return;
        }
        state.bootstrapped = true;
        debugLog('boot', 'bootstrap', {bundle: 'v00054'});

        state.cm = cm;
        state.documentObject = documentObject;
        state.contextId = contextId;
        state.userId = userId;
        state.capabilities = capabilities || {};
        state.toolbarSettings = toolbarSettings || {};
        var posKey = 'pdfannotator_pos_' + contextId;
        var stored = null;
        if (page !== 1) {
            state.initialPage = page;
        } else {
            try {
                var raw = typeof localStorage !== 'undefined' && localStorage.getItem(posKey);
                if (raw) { stored = JSON.parse(raw); }
            } catch (e) {}
            if (stored && typeof stored.page === 'number' && stored.page >= 1) {
                state.initialPage = stored.page;
                state.savedScrollTop = typeof stored.scrollTop === 'number' ? stored.scrollTop : 0;
            } else {
                state.initialPage = 1;
            }
        }
        state.annoid = annoid;
        state.commid = commid;
        state.editorSettings = editorSettings || {};

        if (!state.documentObject || !state.documentObject.fullurl) {
            console.error('Missing documentObject.fullurl', state.documentObject);
            var missingViewer = viewerEl();
            if (missingViewer) {
                missingViewer.innerHTML = '<div class="alert alert-danger">Missing PDF URL from backend init params.</div>';
            }
            return;
        }

        state.scale = 1.33;
        var defaultScale = document.querySelector('select.scale');
        if (defaultScale) {
            defaultScale.value = '1.33';
        }

        if (window.Konva) {
            if (window.devicePixelRatio) {
                window.Konva.pixelRatio = window.devicePixelRatio;
            }
            window.Konva._fixTextRendering = true;
        }

        bindToolbar();
        debugLog('boot', 'bootstrap', {bundle: 'v00054'});
        bindViewerScroll();
        buildShoelaceToolbar();
        observeCommentNav();
        ensureRestoreControls();
        setTimeout(ensureRestoreControls, 400);
        setTimeout(ensureRestoreControls, 1200);
        initKeyboardShortcuts();
        setTool('cursor');
        bindVisibilityRecovery();
        document.addEventListener('fullscreenchange', function () {
            if (!isBrowserFullscreen() && theaterState.enabled) {
                toggleTheaterMode();
            }
        });

        initPdf().then(function () {
            renderDocument();
            startInitialLoadRetries();
            setTimeout(function () {
                scheduleAnnotationRecovery('init');
            }, 900);
        }).catch(function (error) {
            console.error('PDF initialization failed', error);
            var viewer = viewerEl();
            if (viewer) {
                viewer.innerHTML = '<div class="alert alert-danger">PDF.js/Konva initialization failed. Check console.</div>';
            }
        });
    }

    function startIndexCompat() {
        var args = Array.prototype.slice.call(arguments);
        if (args.length > 1) {
            var first = args[0];
            var looksLikeYui = first && typeof first === 'object' && (
                typeof first.use === 'function' ||
                typeof first.one === 'function' ||
                typeof first.Node === 'function'
            );
            if (looksLikeYui) {
                args.shift();
            }
        }
        return bootstrap.apply(null, args);
    }

    window.startIndex = startIndexCompat;
}());
