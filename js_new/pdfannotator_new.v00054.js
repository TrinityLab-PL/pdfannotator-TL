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
        drawingStroke: '#d61f26',
        textColor: '#1f2937',
        annotationColor: '#fff70f',
        strokeWidth: 2,
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
        viewer.addEventListener('scroll', function () {
            var current = getCurrentPage();
            var currentPageInput = document.getElementById('currentPage');
            if (currentPageInput) {
                currentPageInput.value = String(current);
            }
            updatePageCounter(current);
            updateDeleteButtonPosition();
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
            '<button type="button" data-proxy-tool="drawing" title="Drawing"><i class="fa fa-paint-brush"></i></button>',
            '<button type="button" data-proxy-tool="textbox" title="Textbox"><i class="fa fa-font"></i></button>',
            '<button type="button" data-proxy-tool="highlight" title="Highlight"><svg class="tl-icon-highlight-marker" viewBox="0 0 24 24" aria-hidden="true"><path d="M19.2 1.8l2.9 2.9a2.1 2.1 0 0 1 0 3L8.2 20.95H2.7v-6.1L16 1.8a2.2 2.2 0 0 1 3.2 0z"></path><path d="M14.3 4.3l5.2 5.2-1.7 1.7-5.2-5.2z"></path><path d="M2.2 22.75h12.2v5H2.2z"></path></svg></button>',
            '<button type="button" data-proxy-tool="strikeout" title="Strikeout"><i class="fa fa-strikethrough"></i></button>',
            '</div>',
            '<div class="tl-group tl-style">',
            '<label title="Color"><i class="fa fa-tint"></i></label>',
            '<input type="color" data-proxy-style="color" value="#d61f26" />',
            '<label title="Stroke width"><span class="tl-style-glyph">W</span></label>',
            '<select data-proxy-style="stroke-width" title="Stroke width"><option value="1">1</option><option value="2" selected>2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8</option><option value="9">9</option><option value="10">10</option><option value="11">11</option><option value="12">12</option><option value="13">13</option><option value="14">14</option><option value="15">15</option><option value="16">16</option><option value="17">17</option><option value="18">18</option><option value="19">19</option><option value="20">20</option></select>',
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
            '<button type="button" data-proxy-action="fullscreen" title="Browser fullscreen"><i class="fa fa-expand"></i></button>',
            '</div>'
        ].join('');
        container.appendChild(shell);

        shell.querySelectorAll('[data-proxy-tool]').forEach(function (button) {
            button.addEventListener('click', function () {
                var tool = button.getAttribute('data-proxy-tool');
                setTool(tool);
            });
        });

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
                var color = (event && event.target && event.target.value) ? event.target.value : '#d61f26';
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
                if (Number.isFinite(size) && size > 0) {
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
            var targetPage = Math.max(1, Math.min(state.pdf.numPages, parseInt(state.initialPage || 1, 10) || 1));
            scrollToPage(targetPage);
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
                    var padX = 6;
                    var padY = 5;
                    labelEl.style.left = (annotation.x * scale + padX) + 'px';
                    labelEl.style.top = (annotation.y * scale + padY) + 'px';
                    labelEl.style.width = Math.max(0, annotation.width * scale - padX * 2) + 'px';
                    labelEl.style.height = Math.max(0, annotation.height * scale - padY * 2) + 'px';
                }
            }
            activeGroup.setAttr('annotationData', annotation);
            persistAnnotation(annotation);
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
                createAnnotation(pageNumber, {
                    type: 'point',
                    x: pointer.x / state.scale,
                    y: pointer.y / state.scale
                });
                setTool('cursor');
        bindVisibilityRecovery();
                return;
            }

            if (tool === 'textbox') {
                draftStart = pointer;
                return;
            }

            draftStart = pointer;

            if (tool === 'drawing') {
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
            } else {
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
                setTool('cursor');
                return;
            }

            if (pointer) {
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
                    if (hitGroup) {
                        var ignData = hitGroup.getAttr('annotationData');
                        if (ignData && ignData.type === 'textbox') { return; }
                    }
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
                    setTool('cursor');
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
        var paddingX = 6;
        var paddingY = 5;

        var newWidth = Math.max(40, Math.ceil(maxWidth + paddingX * 2));
        var newHeight = Math.max(30, Math.ceil(textHeight + paddingY * 2));

        var oldWidth = Math.max(1, Number(annotationData.width) || newWidth);
        var oldHeight = Math.max(1, Number(annotationData.height) || newHeight);
        var centerX = (Number(annotationData.x) || 0) + oldWidth / 2;
        var centerY = (Number(annotationData.y) || 0) + oldHeight / 2;

        annotationData.width = newWidth;
        annotationData.height = newHeight;
        annotationData.x = Math.max(0, centerX - newWidth / 2);
        annotationData.y = Math.max(0, centerY - newHeight / 2);
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
        editor.style.color = annotationData.color || state.textColor || '#111827';
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
                color: annotationData.color || state.textColor || '#111827',
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
            fitTextboxAroundContent(annotationData);
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
            annotationData.width = editor.offsetWidth / scale;
            annotationData.height = Math.max(annotationData.height, editor.offsetHeight / scale, wrappedH);
            redrawOneAnnotation(pageNumber, annotationData.uuid, annotationData);
            persistAnnotation(annotationData);
            editor.remove();
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
            var annotation = {
                type: 'textbox',
                x: unscaledBoxX,
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
            group.add(new Konva.Circle({
                x: annotation.x * scale,
                y: annotation.y * scale,
                radius: 8,
                fill: '#ef4444',
                stroke: '#ffffff',
                strokeWidth: 2
            }));
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
            labelEl.style.left = (boxX + textPaddingX) + 'px';
            labelEl.style.top = (boxY + textPaddingY) + 'px';
            labelEl.style.width = Math.max(0, boxWidth - textPaddingX * 2) + 'px';
            labelEl.style.height = Math.max(0, boxHeight - textPaddingY * 2) + 'px';
            labelEl.style.fontSize = textFontSizePx + 'px';
            labelEl.style.fontFamily = (annotation.font || state.textFont || 'Open Sans') + ', sans-serif';
            labelEl.style.lineHeight = '1.25';
            labelEl.style.color = annotation.color || '#1f2937';
            labelEl.style.overflow = 'hidden';
            labelEl.style.pointerEvents = 'none';
            labelEl.style.whiteSpace = 'pre-wrap';
            labelEl.style.wordWrap = 'break-word';
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
                var lineWidth = Math.max(1, (annotation.width || 2) * scale);
                group.add(new Konva.Line({
                    points: scaledPoints,
                    stroke: annotation.color || '#ef4444',
                    strokeWidth: lineWidth,
                    hitStrokeWidth: Math.max(10, lineWidth * 4),
                    lineCap: 'round',
                    lineJoin: 'round'
                }));
            });
        } else if (annotation.type === 'highlight' || annotation.type === 'text' || annotation.type === 'strikeout') {
            var rectangles = normalizeRectangles(annotation.rectangles);
            rectangles.forEach(function (rect) {
                var color = annotation.type === 'strikeout' ? '#f43f5e' : (annotation.color || '#fff70f');
                var isStrikeout = annotation.type === 'strikeout';
                var rectShape = new Konva.Rect({
                    x: rect.x1 * scale,
                    y: rect.y1 * scale,
                    width: (rect.x2 - rect.x1) * scale,
                    height: (rect.y2 - rect.y1) * scale,
                    fill: isStrikeout ? 'rgba(244, 63, 94, 0.10)' : 'rgba(255, 247, 15, 0.33)',
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
                    var padX = 6;
                    var padY = 5;
                    labelEl.style.left = (annotation.x * scale + padX) + 'px';
                    labelEl.style.top = (annotation.y * scale + padY) + 'px';
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
                selectAnnotation(pageNumber, createdGroup);
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
        state.initialPage = page || 1;
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
