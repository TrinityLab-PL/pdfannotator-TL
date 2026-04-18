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
        zoomUser: 1,
        fitScale: 1,
        effectiveScale: 1,
        scale: 1,
        activeTool: 'cursor',
        pages: {},
        activeAnnotation: null,
        deleteButton: null,
        deleteButtonPage: null,
        drawingStroke: '#ae090f',
        textColor: '#111827',
        annotationColor: '#fff70f',
        strokeWidth: 7,
        textSize: 14,
        textFont: 'Open Sans',
        commentTarget: null,
        commentRequestToken: 0,
        annotationsLoadedOnce: false,
        annotationWarmupTimer: null,
        ajaxNonce: 0,
        keyboardBound: false,
        deletedAnnotations: [],
        recycleItems: [],
        pendingDeletedAnnotations: {},
        restoreInitAttempts: 0,
        commentNavObserver: null,
        commentNavMuting: false,
        showAllComments: false,
        _lastQuestionsPage: null,
        recoveryTimer: null,
        visibilityRecoveryBound: false,
        bootstrapped: false,
        searchPattern: '',
        _questionsCache: null,
        savedPosition: null,
        restorePositionPending: null,
        displayModeRerenderTimer: null,
        layoutReflowTimer: null,
        layoutRev: 0,
        theatreTransitionUntilTs: 0,
        pendingUnifiedReflowOpts: null,
        pendingUnifiedReflowTimer: null,
        lastScrollTop: 0,
        lastScrollTs: 0,
        fastScrollUntilTs: 0,
        annotationsCache: {},
        annotationsHashByPage: {},
        annotationsInFlight: {},
        renderQueue: [],
        renderQueueMap: {},
        renderInFlight: 0,
        renderingPages: {},
        renderedPages: {},
        pageRenderSignatures: {},
        renderSchedulePending: false,
        pageRenderTasks: {},
        metrics: {
            sessionStartTs: Date.now(),
            renderStartTs: 0,
            firstPageRenderMs: null,
            fullRenderMs: null,
            readRequests: 0,
            readBatchRequests: 0,
            queuedPages: 0,
            renderedPagesCount: 0,
            prunedPages: 0,
            visibleWithoutBitmap: 0,
            ensurePageReadyRetries: 0
        },
        perfFlags: {
            virtualizedRender: true,
            batchRead: true,
            aggressivePrune: true,
            strictEnsurePageReady: true
        }
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


    function isTheaterModeActive() {
        return !!(document.body && document.body.classList && document.body.classList.contains('tl-pdf-fullscreen'));
    }

    function layoutRootEl() {
        return document.getElementById('pdfannotator_index');
    }

    function isLayoutV4Active() {
        var root = layoutRootEl();
        return !!(root && root.classList && root.classList.contains('tl-layout-v4'));
    }

    function isCommentsOpen() {
        var wrapper = document.getElementById('comment-wrapper');
        if (!wrapper) {
            return true;
        }
        var root = layoutRootEl();
        if (root && isLayoutV4Active()) {
            var stateAttr = root.getAttribute('data-comments-state');
            if (stateAttr === 'open') {
                return true;
            }
            if (stateAttr === 'closed') {
                return false;
            }
        }
        return !wrapper.classList.contains('tl-comments-hidden');
    }

    function setCommentsOpen(isOpen) {
        var wrapper = document.getElementById('comment-wrapper');
        var root = layoutRootEl();
        if (root && isLayoutV4Active()) {
            root.setAttribute('data-comments-state', isOpen ? 'open' : 'closed');
        }
        if (!wrapper) {
            return;
        }
        wrapper.classList.toggle('tl-comments-hidden', !isOpen);
        wrapper.classList.remove('hidden');
    }

    function getRequestedZoom() {
        return (Number.isFinite(state.zoomUser) && state.zoomUser > 0) ? state.zoomUser : 1;
    }

    function rasterPixelRatioForLayout() {
        var pr = window.devicePixelRatio || 1;
        /* Theatre + 100% toolbar zoom: higher backing ratio (primary mode) for sharper PDF + Konva vs plain DPR. */
        if (isTheaterModeActive() && Math.abs(getRequestedZoom() - 1) < 0.0001) {
            return Math.min(3, pr * 1.22);
        }
        return pr;
    }

    function getBaseViewportWidth() {
        return Math.max(1, Number(state.defaultViewport && state.defaultViewport.width) || 900);
    }

    function computeFitScale() {
        var viewer = viewerEl();
        var contentWrapper = document.getElementById('content-wrapper');
        var availableWidth = 0;

        if (isLayoutV4Active() && contentWrapper) {
            var style = window.getComputedStyle(contentWrapper);
            var paddingLeft = parseFloat(style.paddingLeft || '0') || 0;
            var paddingRight = parseFloat(style.paddingRight || '0') || 0;
            availableWidth = Math.max(0, contentWrapper.clientWidth - paddingLeft - paddingRight);
        } else if (viewer) {
            availableWidth = viewer.clientWidth || 0;
        }

        if (!Number.isFinite(availableWidth) || availableWidth < 64) {
            return state.fitScale || 1;
        }

        return clampNumber(availableWidth / getBaseViewportWidth(), 0.1, 8);
    }

    function updateEffectiveScale() {
        var zoomUser = getRequestedZoom();
        var fitScale = computeFitScale();
        var effectiveScale = clampNumber(zoomUser * fitScale, 0.1, 8);
        state.zoomUser = zoomUser;
        state.fitScale = fitScale;
        state.effectiveScale = effectiveScale;
        state.scale = effectiveScale;
    }

    function syncZoomUiState() {
        var isZoom200 = getRequestedZoom() >= 2;
        var cw = document.getElementById('content-wrapper');
        var root = layoutRootEl();
        if (cw) {
            cw.classList.toggle('zoom-200', isZoom200);
        }
        if (root && isLayoutV4Active()) {
            root.classList.toggle('zoom-200', isZoom200);
        }
        var viewerZ = viewerEl();
        if (viewerZ) {
            viewerZ.classList.toggle('tl-zoom-pan', getRequestedZoom() > 1.0001);
        }
        syncViewerPanCursorClass();
    }

    function syncViewerPanCursorClass() {
        var v = viewerEl();
        if (!v) {
            return;
        }
        var z = getRequestedZoom() > 1.0001;
        v.classList.toggle('tl-pdf-pan-ready', z && state.activeTool === 'cursor');
        if (v.classList.contains('tl-pdf-panning')) {
            v.style.cursor = 'grabbing';
            return;
        }
        if (z && state.activeTool === 'cursor') {
            v.style.cursor = 'grab';
        }
    }

    function detachViewerPanListeners() {
        document.removeEventListener('mousemove', onViewerPanMouseMove, true);
        document.removeEventListener('mouseup', onViewerPanMouseUp, true);
        document.removeEventListener('touchmove', onViewerPanTouchMove, { passive: false, capture: true });
        document.removeEventListener('touchend', onViewerPanTouchEnd, true);
        document.removeEventListener('touchcancel', onViewerPanTouchEnd, true);
    }

    function endViewerPanSession() {
        var p = state._viewerPanSession;
        state._viewerPanSession = null;
        detachViewerPanListeners();
        var ve = viewerEl();
        if (ve) {
            ve.classList.remove('tl-pdf-panning');
        }
        syncViewerPanCursorClass();
        if (p && !p.moved) {
            clearSelection();
        }
    }

    function onViewerPanMouseMove(e) {
        if (!state._viewerPanSession) {
            return;
        }
        var clientX = e.clientX;
        var clientY = e.clientY;
        var p = state._viewerPanSession;
        var dx = clientX - p.lastClientX;
        var dy = clientY - p.lastClientY;
        p.lastClientX = clientX;
        p.lastClientY = clientY;
        if (Math.abs(clientX - p.startClientX) > 4 || Math.abs(clientY - p.startClientY) > 4) {
            p.moved = true;
        }
        var vv = viewerEl();
        if (vv) {
            vv.scrollLeft -= dx;
            vv.scrollTop -= dy;
        }
        if (e.cancelable) {
            e.preventDefault();
        }
    }

    function onViewerPanMouseUp() {
        if (!state._viewerPanSession) {
            return;
        }
        endViewerPanSession();
    }

    function onViewerPanTouchMove(e) {
        if (!state._viewerPanSession) {
            return;
        }
        var t = e.touches && e.touches[0];
        if (!t) {
            return;
        }
        var clientX = t.clientX;
        var clientY = t.clientY;
        var p = state._viewerPanSession;
        var dx = clientX - p.lastClientX;
        var dy = clientY - p.lastClientY;
        p.lastClientX = clientX;
        p.lastClientY = clientY;
        if (Math.abs(clientX - p.startClientX) > 4 || Math.abs(clientY - p.startClientY) > 4) {
            p.moved = true;
        }
        var vv2 = viewerEl();
        if (vv2) {
            vv2.scrollLeft -= dx;
            vv2.scrollTop -= dy;
        }
        if (e.cancelable) {
            e.preventDefault();
        }
    }

    function onViewerPanTouchEnd() {
        if (!state._viewerPanSession) {
            return;
        }
        endViewerPanSession();
    }

    function scheduleDeferredUnifiedReflow(options) {
        var opts = options || {};
        if (state.pendingUnifiedReflowTimer) {
            clearTimeout(state.pendingUnifiedReflowTimer);
            state.pendingUnifiedReflowTimer = null;
        }
        state.pendingUnifiedReflowOpts = {
            delayMs: Number.isFinite(opts.delayMs) ? opts.delayMs : 120,
            gentle: !!opts.gentle
        };
        var until = state.theatreTransitionUntilTs || 0;
        var wait = Math.max(15, until - Date.now() + 25);
        state.pendingUnifiedReflowTimer = setTimeout(function () {
            state.pendingUnifiedReflowTimer = null;
            var pending = state.pendingUnifiedReflowOpts;
            state.pendingUnifiedReflowOpts = null;
            if (!state.pdf || !pending) {
                return;
            }
            if (isTheatreLayoutTransitionBusy()) {
                scheduleDeferredUnifiedReflow(pending);
                return;
            }
            triggerUnifiedReflow(pending);
        }, wait);
    }

    function triggerUnifiedReflow(options) {
        if (!state.pdf) {
            syncZoomUiState();
            return;
        }
        var opts = options || {};
        var ignoreBusy = !!opts.ignoreTheatreBusy;
        if (isTheatreLayoutTransitionBusy() && !ignoreBusy) {
            syncZoomUiState();
            scheduleDeferredUnifiedReflow(opts);
            return;
        }
        if (ignoreBusy && state.pendingUnifiedReflowTimer) {
            clearTimeout(state.pendingUnifiedReflowTimer);
            state.pendingUnifiedReflowTimer = null;
            state.pendingUnifiedReflowOpts = null;
        }
        var delay = Number.isFinite(opts.delayMs) ? opts.delayMs : 90;
        var gentle = !!opts.gentle;

        updateEffectiveScale();
        syncZoomUiState();
        rerenderAfterDisplayModeChange(delay, { gentle: gentle });
    }

    function isFastScrollingNow() {
        return Date.now() < (state.fastScrollUntilTs || 0);
    }

    function getRenderConcurrency() {
        if (isFastScrollingNow()) {
            return 1;
        }
        if (isTheaterModeActive() && state.scale >= 1.5) {
            return 1;
        }
        // Balance profile: normal view 200% favors smoothness over parallel render bursts.
        if (!isTheaterModeActive() && state.scale >= 2) {
            return 1;
        }
        return 2;
    }

    function scheduleTheaterZoomReflow() {
        syncZoomUiState();
        if (!state.pdf) {
            return;
        }
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                scheduleRenderWindowUpdate(true);
            });
        });
    }

    function getPageElement(pageNumber) {
        var v = viewerEl();
        return v ? v.querySelector('.page[data-page-number="' + pageNumber + '"]') : null;
    }

    function getPageState(pageNumber) {
        return state.pages[pageNumber] || null;
    }


    function clampNumber(value, min, max) {
        var numeric = Number(value);
        if (!Number.isFinite(numeric)) {
            return min;
        }
        return Math.max(min, Math.min(max, numeric));
    }

    function buildSavedPosition(pageNo, scrollTop) {
        var viewer = viewerEl();
        var page = Math.max(1, parseInt(pageNo || 1, 10) || 1);
        var top = Math.max(0, Number(scrollTop) || 0);
        var ratio = null;
        var pageEl = getPageElement(page);
        if (viewer && pageEl) {
            var pageHeight = Math.max(1, pageEl.offsetHeight || 1);
            ratio = clampNumber((top - pageEl.offsetTop) / pageHeight, 0, 1);
        }
        return {
            page: page,
            ratio: ratio,
            scrollTop: top,
            scale: state.scale
        };
    }

    function applyPendingSavedPosition(renderedPageNo) {
        var pending = state.restorePositionPending;
        if (!pending || Number(pending.page) !== Number(renderedPageNo)) {
            return;
        }
        var viewer = viewerEl();
        var pageEl = getPageElement(renderedPageNo);
        if (!viewer || !pageEl) {
            return;
        }
        var targetTop;
        if (Number.isFinite(pending.ratio)) {
            targetTop = pageEl.offsetTop + (Math.max(0, Math.min(1, pending.ratio)) * Math.max(1, pageEl.offsetHeight || 1));
        } else {
            targetTop = Number.isFinite(pending.scrollTop) ? pending.scrollTop : pageEl.offsetTop;
        }
        var maxScroll = Math.max(0, viewer.scrollHeight - viewer.clientHeight);
        viewer.scrollTop = Math.max(0, Math.min(maxScroll, Math.round(targetTop)));
        state.restorePositionPending = null;
        state.savedPosition = null;
    }

    function isTheatreLayoutTransitionBusy() {
        return Date.now() < (state.theatreTransitionUntilTs || 0);
    }

    function markTheatreLayoutTransition(extraMs) {
        var ms = Number.isFinite(extraMs) ? extraMs : 450;
        var until = Date.now() + ms;
        state.theatreTransitionUntilTs = Math.max(state.theatreTransitionUntilTs || 0, until);
    }


    function computePageRenderSignature() {
        var s = Number(state.scale) || 1;
        var theater = isTheaterModeActive() ? 1 : 0;
        var branch = "std";
        if (theater && Math.abs(s - 1.5) < 0.0001) {
            branch = "t150";
        } else if (theater && Math.abs(s - 1) < 0.0001) {
            branch = "t100";
        }
        var dpr = window.devicePixelRatio || 1;
        var fitKey = Number(state.fitScale || 1).toFixed(4);
        var trBoost = (isTheaterModeActive() && Math.abs(getRequestedZoom() - 1) < 0.0001) ? 1 : 0;
        return String(s) + "|" + String(theater) + "|" + branch + "|" + String(dpr) + "|" + fitKey + "|tb" + String(trBoost);
    }

    function isPageRenderedForCurrentSignature(pageNumber) {
        var key = String(pageNumber);
        return !!(state.renderedPages[key] && state.pageRenderSignatures[key] === computePageRenderSignature());
    }

    function restoreScrollAfterTheatreLayoutIfPossible() {
        var pending = state.restorePositionPending;
        if (!pending) {
            return;
        }
        var viewer = viewerEl();
        var pageEl = getPageElement(pending.page);
        if (!viewer || !pageEl) {
            return;
        }
        var targetTop;
        if (Number.isFinite(pending.ratio)) {
            targetTop = pageEl.offsetTop + (Math.max(0, Math.min(1, pending.ratio)) * Math.max(1, pageEl.offsetHeight || 1));
        } else {
            targetTop = Number.isFinite(pending.scrollTop) ? pending.scrollTop : pageEl.offsetTop;
        }
        var maxScroll = Math.max(0, viewer.scrollHeight - viewer.clientHeight);
        viewer.scrollTop = Math.max(0, Math.min(maxScroll, Math.round(targetTop)));
        state.restorePositionPending = null;
        state.savedPosition = null;
    }

    var ajaxDedupeInflight = {};
    var ajaxSlotActive = 0;
    var ajaxSlotWaitQueue = [];
    var AJAX_MAX_PARALLEL = 8;
    var AJAX_TIMEOUT_MS = 90000;

    function ajaxDedupeKey(action, payload) {
        try {
            return String(action) + '|' + JSON.stringify(payload || {});
        } catch (e) {
            return String(action) + '|';
        }
    }

    function ajaxIsIdempotentRead(action) {
        var idempotent = ['read', 'readbatch', 'readsingle', 'getInformation', 'getComments', 'getQuestions',
            'getCommentsToPrint', 'searchComments', 'listRecycle'];
        return idempotent.indexOf(action) !== -1;
    }

    function ajaxAcquireSlot() {
        return new Promise(function (resolve) {
            if (ajaxSlotActive < AJAX_MAX_PARALLEL) {
                ajaxSlotActive += 1;
                resolve();
            } else {
                ajaxSlotWaitQueue.push(function () {
                    ajaxSlotActive += 1;
                    resolve();
                });
            }
        });
    }

    function ajaxReleaseSlot() {
        ajaxSlotActive -= 1;
        if (ajaxSlotActive < 0) {
            ajaxSlotActive = 0;
        }
        var next = ajaxSlotWaitQueue.shift();
        if (next) {
            next();
        }
    }

    function ajaxFetchOnce(action, payload, method) {
        var base = ((window.M && M.cfg && M.cfg.wwwroot) ? M.cfg.wwwroot : '') + '/mod/pdfannotator/action.php';
        state.ajaxNonce += 1;
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

        var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var tid = null;
        if (controller) {
            tid = setTimeout(function () {
                try {
                    controller.abort();
                } catch (e) {}
            }, AJAX_TIMEOUT_MS);
        }

        var fetchOpts = {
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
        };
        if (controller) {
            fetchOpts.signal = controller.signal;
        }

        return fetch(url, fetchOpts).then(function (response) {
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
                var firstObj = trimmed.indexOf('{');
                var lastObj = trimmed.lastIndexOf('}');
                if (firstObj != -1 && lastObj > firstObj) {
                    try {
                        return JSON.parse(trimmed.slice(firstObj, lastObj + 1));
                    } catch (err2) {
                    }
                }
                var firstArr = trimmed.indexOf('[');
                var lastArr = trimmed.lastIndexOf(']');
                if (firstArr != -1 && lastArr > firstArr) {
                    try {
                        return JSON.parse(trimmed.slice(firstArr, lastArr + 1));
                    } catch (err3) {
                    }
                }
                return { __parseError: true, __rawLen: trimmed.length, __rawHead: trimmed.slice(0, 200) };
            }
        }).finally(function () {
            if (tid) {
                clearTimeout(tid);
            }
        });
    }

    function ajaxExecuteWithRetries(action, payload, method) {
        function attempt(n) {
            return ajaxFetchOnce(action, payload, method).catch(function (err) {
                if (!ajaxIsIdempotentRead(action) || n >= 2) {
                    throw err;
                }
                var msg = String(err && err.message ? err.message : err);
                var retryable =
                    msg.indexOf('Failed to fetch') !== -1 ||
                    msg.indexOf('NetworkError') !== -1 ||
                    msg.indexOf('AbortError') !== -1 ||
                    msg.indexOf('aborted') !== -1 ||
                    /AJAX failed: (408|429|502|503|504)/.test(msg);
                if (!retryable) {
                    throw err;
                }
                var delayMs = 350 * (n + 1);
                return new Promise(function (resolve) {
                    setTimeout(function () {
                        resolve(attempt(n + 1));
                    }, delayMs);
                });
            });
        }
        return attempt(0);
    }

    function ajax(action, payload, method) {
        var dk = ajaxDedupeKey(action, payload || {});
        if (ajaxIsIdempotentRead(action) && ajaxDedupeInflight[dk]) {
            return ajaxDedupeInflight[dk];
        }

        var chain = ajaxAcquireSlot().then(function () {
            return ajaxExecuteWithRetries(action, payload, method);
        }).finally(function () {
            ajaxReleaseSlot();
        });

        if (ajaxIsIdempotentRead(action)) {
            ajaxDedupeInflight[dk] = chain;
            return chain.finally(function () {
                if (ajaxDedupeInflight[dk] === chain) {
                    delete ajaxDedupeInflight[dk];
                }
            });
        }
        return chain;
    }


    function moodlePdfStr(key, def) {
        try {
            if (window.M && M.util && typeof M.util.get_string === 'function') {
                return M.util.get_string(key, 'pdfannotator');
            }
        } catch (e) { }
        return def || key;
    }

    function appendSameQuestionVoteUi(actionRow, item) {
        var isQ = item._posttype === 'question' || item.isquestion === 1 || item.isquestion === true;
        if (!isQ || !item.usevotes || item.isdeleted) {
            return;
        }
        var slot = actionRow.querySelector('.tl-vote-slot');
        if (!slot) {
            return;
        }
        var caps = state.capabilities || {};
        var uid = parseInt(state.userId, 10) || 0;
        var wrap = document.createElement('span');
        wrap.className = 'tl-same-question-vote';
        wrap.style.cssText = 'display:inline-flex;align-items:center;gap:2px;margin:0;vertical-align:middle;';
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'comment-like-a tl-comment-like';
        btn.style.cssText = 'border:none;background:transparent;padding:0 1px;margin:0;box-shadow:none;outline:none;cursor:pointer;line-height:1;';
        var icon = document.createElement('i');
        icon.className = 'icon fa fa-thumbs-up fa-fw';
        icon.setAttribute('aria-hidden', 'true');
        btn.appendChild(icon);
        var countSpan = document.createElement('span');
        countSpan.className = 'tl-vote-count countVotes';
        countSpan.style.cssText = 'margin:0;padding:0 0 0 1px;font-size:0.95em;';
        var votes = parseInt(item.votes, 10);
        if (isNaN(votes)) {
            votes = 0;
        }
        countSpan.textContent = String(votes);
        var own = parseInt(item.userid, 10) === uid;
        var userVoted = item.isvoted === true || item.isvoted === 1 || item.isvoted === '1';
        var canToggle = !!caps.vote && !own;

        var tipOwn = moodlePdfStr('likeOwnComment', 'Your own question');
        var tipRemove = moodlePdfStr('likeQuestionRemoveVote', 'Click to remove your vote');
        var tipVote = moodlePdfStr('likeQuestion', 'I have the same question');
        var countTip = String(votes) + ' ' + moodlePdfStr('likeCountQuestion', 'people have the same question');

        function applyLikeIconState() {
            if (own || !caps.vote) {
                icon.style.color = '#6a6a6a';
                return;
            }
            icon.style.color = userVoted ? '#c4c4c4' : '#334155';
        }

        applyLikeIconState();

        if (own) {
            btn.setAttribute('data-tl-tooltip', tipOwn);
            btn.disabled = true;
            btn.style.cursor = 'default';
        } else if (!caps.vote) {
            btn.style.display = 'none';
        } else if (userVoted) {
            btn.setAttribute('data-tl-tooltip', tipRemove);
        } else {
            btn.setAttribute('data-tl-tooltip', tipVote);
        }
        countSpan.setAttribute('data-tl-tooltip', countTip);

        wrap.appendChild(btn);
        wrap.appendChild(countSpan);
        slot.appendChild(wrap);

        if (btn.style.display !== 'none') {
            bindTlToolbarTooltip(btn);
        }
        bindTlToolbarTooltip(countSpan);

        if (!canToggle) {
            return;
        }

        var pending = false;
        btn.addEventListener('click', function () {
            if (pending) {
                return;
            }
            pending = true;
            var cid = String(item.id || item.uuid || '');
            var act = userVoted ? 'unvoteComment' : 'voteComment';
            ajax(act, { commentid: cid })
                .then(function (data) {
                    if (data && data.status === 'success') {
                        var nv = data.numberVotes;
                        votes = nv != null ? parseInt(nv, 10) : votes;
                        if (isNaN(votes)) {
                            votes = 0;
                        }
                        userVoted = act === 'voteComment';
                        countSpan.textContent = String(votes);
                        countSpan.setAttribute(
                            'data-tl-tooltip',
                            String(votes) + ' ' + moodlePdfStr('likeCountQuestion', 'people have the same question')
                        );
                        btn.setAttribute('data-tl-tooltip', userVoted ? tipRemove : tipVote);
                        applyLikeIconState();
                    } else {
                        var msg = moodlePdfStr('error:voteComment', 'Vote failed');
                        if (data && data.reason === 'vote_question_only') {
                            msg = moodlePdfStr('error:votequestiononly', msg);
                        } else if (data && data.reason === 'unvote_failed') {
                            msg = moodlePdfStr('error:voteComment', 'Could not remove vote');
                        }
                        window.alert(msg);
                    }
                })
                .catch(function () {
                    window.alert(moodlePdfStr('error:voteComment', 'Vote failed'));
                })
                .then(function () {
                    pending = false;
                });
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
        syncViewerPanCursorClass();
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
        state.annotationsCache = {};
        state.annotationsHashByPage = {};
        state.annotationsInFlight = {};
        state.renderQueue = [];
        state.renderQueueMap = {};
        state.renderInFlight = 0;
        state.renderingPages = {};
        state.renderedPages = {};
        state.pageRenderSignatures = {};
        cancelAllPdfRenderTasks();
        state.renderSchedulePending = false;
        if (state.pendingUnifiedReflowTimer) {
            clearTimeout(state.pendingUnifiedReflowTimer);
            state.pendingUnifiedReflowTimer = null;
        }
        state.pendingUnifiedReflowOpts = null;
        if (state._viewerPanSession) {
            state._viewerPanSession = null;
            detachViewerPanListeners();
            var vx = viewerEl();
            if (vx) {
                vx.classList.remove('tl-pdf-panning');
            }
        }
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
            scaleSelect.value = String(state.zoomUser);
            scaleSelect.addEventListener('change', function () {
                var val = parseFloat(scaleSelect.value);
                if (!Number.isFinite(val) || val <= 0) {
                    return;
                }
                state.zoomUser = val;
                triggerUnifiedReflow({ delayMs: 90, gentle: isTheaterModeActive(), ignoreTheatreBusy: true });
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
        var idx = supported.indexOf(state.zoomUser);
        if (idx < 0) {
            idx = 2;
        }
        var next = idx + direction;
        if (next < 0 || next >= supported.length) {
            return;
        }
        state.zoomUser = supported[next];
        var scaleSelect = document.querySelector('select.scale');
        if (scaleSelect) {
            scaleSelect.value = String(state.zoomUser);
        }
        triggerUnifiedReflow({ delayMs: 90, gentle: isTheaterModeActive(), ignoreTheatreBusy: true });
    }

    function getCurrentPage(forceRecalc) {
        var viewer = viewerEl();
        if (!viewer) {
            return 1;
        }
        var now = Date.now();
        if (!forceRecalc && Number.isFinite(state.currentPageCache) && state.currentPageCacheTs && (now - state.currentPageCacheTs) < 90) {
            return state.currentPageCache;
        }
        var pages = viewer.querySelectorAll('.page');
        var top = viewer.scrollTop;
        var candidate = 1;
        pages.forEach(function (page) {
            if (page.offsetTop - 20 <= top) {
                candidate = parseInt(page.getAttribute('data-page-number') || '1', 10);
            }
        });
        state.currentPageCache = candidate;
        state.currentPageCacheTs = now;
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
            var now = Date.now();
            var topNow = viewer.scrollTop;
            var dt = state.lastScrollTs ? (now - state.lastScrollTs) : 0;
            var delta = Math.abs(topNow - (state.lastScrollTop || 0));
            if (dt > 0 && dt < 140 && delta > Math.max(180, viewer.clientHeight * 0.6)) {
                state.fastScrollUntilTs = now + 700;
            }
            state.lastScrollTop = topNow;
            state.lastScrollTs = now;

            var current = getCurrentPage(true);
            var currentPageInput = document.getElementById('currentPage');
            if (currentPageInput) {
                currentPageInput.value = String(current);
            }
            if (current !== state._lastQuestionsPage && !state.commentTarget && !state.showAllComments && typeof refreshQuestionsList === 'function') {
                state._lastQuestionsPage = current;
                refreshQuestionsList();
            }
            updatePageCounter(current);
            updateDeleteButtonPosition();
            updateAllCommentBadgePositions();
            scheduleRenderWindowUpdate(false);
            if (savePosTimer) clearTimeout(savePosTimer);
            savePosTimer = setTimeout(function () {
                var key = 'pdfannotator_pos_' + state.contextId;
                if (state.contextId != null) {
                    var p = getCurrentPage(true);
                    var top = viewer.scrollTop;
                    var saved = buildSavedPosition(p, top);
                    saved.v = 2;
                    try { localStorage.setItem(key, JSON.stringify(saved)); } catch (e) {}
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

    function scrollViewerToAnnotationVerticalCenter(pageNumber, group) {
        var viewer = viewerEl();
        var pageState = getPageState(pageNumber);
        var pageEl = getPageElement(pageNumber);
        if (!viewer || !pageState || !pageState.stage || !pageEl || !group) {
            return;
        }
        var stage = pageState.stage;
        var rect = group.getClientRect();
        var t = group.getAbsoluteTransform().copy();
        var p1 = t.point({ x: rect.x, y: rect.y });
        var p2 = t.point({ x: rect.x + rect.width, y: rect.y + rect.height });
        var centerY = (p1.y + p2.y) / 2;
        if (!isFinite(centerY)) {
            return;
        }
        var pageRect = pageEl.getBoundingClientRect();
        var viewerRect = viewer.getBoundingClientRect();
        var annCenterClientY = pageRect.top + centerY;
        var viewerMidY = viewerRect.top + viewer.clientHeight / 2;
        var delta = annCenterClientY - viewerMidY;
        var newScrollTop = viewer.scrollTop + delta;
        var maxScroll = Math.max(0, viewer.scrollHeight - viewer.clientHeight);
        viewer.scrollTop = Math.max(0, Math.min(maxScroll, newScrollTop));
    }

    function ensureCommentPanelVisible() {
        var wrapper = document.getElementById('comment-wrapper');
        if (!wrapper) {
            return;
        }
        setCommentsOpen(true);
        var toggleIcon = document.querySelector('[data-proxy-action="toggle-comments"] i');
        if (toggleIcon) toggleIcon.className = 'fa fa-comments';
        var toggleLabel = document.querySelector('[data-proxy-action="toggle-comments"] .tl-comments-label');
        if (toggleLabel) toggleLabel.textContent = 'Close';
        var btn = document.getElementById('tl-toggle-comments');
        if (btn) btn.innerHTML = '<i class="fa fa-chevron-right"></i> Close';
    }

    function openCommentsPanelForGroup(pageNumber, group) {
        if (!group) {
            return;
        }
        var aid = getStableAnnotationIdForGroup(group);
        var ad = group.getAttr('annotationData') || {};
        var atype = String(ad.type || group.getAttr('annotationType') || '');
        if (!aid) {
            return;
        }
        ensureCommentPanelVisible();
        loadCommentsForAnnotation(aid, atype);
        setTimeout(function () {
            var ta = document.querySelector('#comment-wrapper .tl-comment-input');
            if (ta && !ta.disabled) {
                ta.focus();
            }
        }, 50);
    }

    var theaterState = {
        enabled: false,
        hiddenElements: []
    };

    function rerenderAfterDisplayModeChange(delayMs, options) {
        if (!state.pdf) {
            return;
        }
        var opts = options || {};
        var gentle = !!opts.gentle;
        var delay = Number.isFinite(delayMs) ? delayMs : 220;
        if (state.displayModeRerenderTimer) {
            clearTimeout(state.displayModeRerenderTimer);
            state.displayModeRerenderTimer = null;
        }
        state.displayModeRerenderTimer = setTimeout(function () {
            state.displayModeRerenderTimer = null;
            if (!state.pdf) {
                return;
            }
            var viewer = viewerEl();
            if (viewer) {
                state.savedPosition = buildSavedPosition(getCurrentPage(), viewer.scrollTop);
                state.restorePositionPending = {
                    page: state.savedPosition.page,
                    ratio: state.savedPosition.ratio,
                    scrollTop: state.savedPosition.scrollTop,
                    scale: state.savedPosition.scale
                };
                state.initialPage = state.savedPosition.page;
            }
            reflowPdfForScaleChange();
            setTimeout(function () {
                if (state.pdf) {
                    scheduleRenderWindowUpdate(!gentle);
                }
            }, gentle ? 120 : 220);
        }, delay);
    }

    function softReflowPdfLayoutAfterTheaterToggle(options) {
        if (!state.pdf) {
            syncZoomUiState();
            return;
        }
        var opts = options || {};
        var delay = Number.isFinite(opts.delayMs) ? opts.delayMs : 220;
        /* Block resize/zoom reflow + aggressive recovery while layout settles (no PDF re-raster). */
        markTheatreLayoutTransition(delay + 220);
        if (state.displayModeRerenderTimer) {
            clearTimeout(state.displayModeRerenderTimer);
            state.displayModeRerenderTimer = null;
        }
        state.displayModeRerenderTimer = setTimeout(function () {
            state.displayModeRerenderTimer = null;
            if (!state.pdf) {
                return;
            }
            var ensureRasterRefresh = opts.ensureRasterRefresh !== false;
            var viewer = viewerEl();
            var saved = viewer ? buildSavedPosition(getCurrentPage(), viewer.scrollTop) : null;
            updateEffectiveScale();
            syncZoomUiState();
            var sigAfterFirst = computePageRenderSignature();
            if (saved) {
                state.restorePositionPending = {
                    page: saved.page,
                    ratio: saved.ratio,
                    scrollTop: saved.scrollTop,
                    scale: state.scale
                };
                state.initialPage = saved.page;
                state.savedPosition = {
                    page: saved.page,
                    ratio: saved.ratio,
                    scrollTop: saved.scrollTop,
                    scale: state.scale
                };
            }
            function finishTheatreSoftReflow() {
                if (!state.pdf) {
                    return;
                }
                updateEffectiveScale();
                syncZoomUiState();
                var sigAfterSettle = computePageRenderSignature();
                if (sigAfterFirst !== sigAfterSettle || ensureRasterRefresh) {
                    scheduleRenderWindowUpdate(false);
                }
            }
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    restoreScrollAfterTheatreLayoutIfPossible();
                    if (state.restorePositionPending) {
                        requestAnimationFrame(function () {
                            restoreScrollAfterTheatreLayoutIfPossible();
                            requestAnimationFrame(function () {
                                finishTheatreSoftReflow();
                            });
                        });
                    } else {
                        requestAnimationFrame(function () {
                            finishTheatreSoftReflow();
                        });
                    }
                });
            });
        }, delay);
    }

    function bindLayoutReflowEvents() {
        var resizeTimer = null;
        window.addEventListener('resize', function () {
            if (resizeTimer) {
                clearTimeout(resizeTimer);
            }
            resizeTimer = setTimeout(function () {
                resizeTimer = null;
                triggerUnifiedReflow({ delayMs: 120, gentle: true });
            }, 120);
        });
    }

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
            var btnOn = document.querySelector('[data-proxy-action="fullscreen"]');
            if (btnOn) { btnOn.innerHTML = '<svg viewBox="0 0 2300 2300" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg"><path stroke="rgb(59,62,62)" stroke-width="200" stroke-linecap="round" stroke-linejoin="round" d="M 825,826 L 825,126 M 125,826 L 825,826 M 825,1474 L 825,2174 M 125,1474 L 825,1474 M 1476,826 L 1476,126 M 2176,826 L 1476,826 M 1476,1474 L 1476,2174 M 2176,1474 L 1476,1474"/></svg>'; }
            softReflowPdfLayoutAfterTheaterToggle({ delayMs: 320, gentle: false });
            syncLayoutDocumentState();
            return;
        }
        theaterState.hiddenElements.forEach(function (entry) {
            entry.node.style.display = entry.display;
        });
        theaterState.hiddenElements = [];
        document.body.classList.remove('tl-pdf-fullscreen');
        theaterState.enabled = false;
        var btnOff = document.querySelector('[data-proxy-action="fullscreen"]');
        if (btnOff) { btnOff.innerHTML = '<svg viewBox="0 0 2300 2300" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg"><path stroke="rgb(59,62,62)" stroke-width="200" stroke-linecap="round" stroke-linejoin="round" d="M 125,126 L 125,826 M 825,126 L 125,126 M 125,2174 L 125,1474 M 825,2174 L 125,2174 M 2176,126 L 2176,826 M 1476,126 L 2176,126 M 2176,2174 L 2176,1474 M 1476,2174 L 2176,2174"/></svg>'; }
        softReflowPdfLayoutAfterTheaterToggle({ delayMs: 360, gentle: true });
        syncLayoutDocumentState();
    }
    window.tlToggleTheaterMode = toggleTheaterMode;


    document.addEventListener('keydown', function(e) {
        if (e.key !== 'Escape') return;
        if (isBrowserFullscreen()) return;
        if (theaterState.enabled) { toggleTheaterMode(); }
    });

    function isBrowserFullscreen() {
        return !!(document.fullscreenElement || document.webkitFullscreenElement ||
            document.mozFullScreenElement || document.msFullscreenElement);
    }

    function syncLayoutDocumentState() {
        try {
            document.documentElement.setAttribute('data-tl-theatre', theaterState.enabled ? '1' : '0');
            document.documentElement.setAttribute('data-tl-browser-fs', isBrowserFullscreen() ? '1' : '0');
        } catch (eSync) {}
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
            '<option value="1" selected>100%</option>',
            '<option value="1.33">133%</option>',
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
            '<button type="button" data-proxy-action="toggle-comments" title="Comments" style="font-family: \'Open Sans\', Arial, sans-serif; font-weight: 300; display: inline-flex; align-items: center; gap: 6px;"><i class="fa fa-comments-o"></i><span class="tl-comments-label">Open</span></button>',
            '<button type="button" data-proxy-action="fullscreen" title="Full screen (ESC to exit)"><svg viewBox="0 0 2300 2300" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg"><path stroke="rgb(59,62,62)" stroke-width="200" stroke-linecap="round" stroke-linejoin="round" d="M 125,126 L 125,826 M 825,126 L 125,126 M 125,2174 L 125,1474 M 825,2174 L 125,2174 M 2176,126 L 2176,826 M 1476,126 L 2176,126 M 2176,2174 L 2176,1474 M 1476,2174 L 2176,2174"/></svg></button>',
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
                select.value = String(state.zoomUser);
            }
        });
        shell.querySelector('[data-proxy-action="zoom-out"]').addEventListener('click', function () {
            zoomBy(-1);
            var select = shell.querySelector('[data-proxy-action="zoom-select"]');
            if (select) {
                select.value = String(state.zoomUser);
            }
        });
        shell.querySelector('[data-proxy-action="zoom-select"]').addEventListener('change', function (event) {
            var val = parseFloat(event.target.value);
            if (!Number.isFinite(val) || val <= 0) {
                return;
            }
            state.zoomUser = val;
            var oldSelect = document.querySelector('select.scale');
            if (oldSelect) {
                oldSelect.value = String(val);
            }
            triggerUnifiedReflow({ delayMs: 90, gentle: isTheaterModeActive(), ignoreTheatreBusy: true });
        });
        shell.querySelector('[data-proxy-action="prev-page"]').addEventListener('click', function () {
            scrollToPage(Math.max(1, getCurrentPage() - 1));
        });
        shell.querySelector('[data-proxy-action="next-page"]').addEventListener('click', function () {
            scrollToPage(Math.min(state.pdf ? state.pdf.numPages : 1, getCurrentPage() + 1));
        });
        shell.querySelector('[data-proxy-action="fullscreen"]').addEventListener('click', function () {
            toggleTheaterMode();
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
            var toggleIcon = shell.querySelector('[data-proxy-action="toggle-comments"] i');
            var toggleLabel = shell.querySelector('[data-proxy-action="toggle-comments"] .tl-comments-label');
            var nextOpen = !isCommentsOpen();
            setCommentsOpen(nextOpen);
            if (toggleIcon) toggleIcon.className = nextOpen ? 'fa fa-comments' : 'fa fa-comments-o';
            if (toggleLabel) toggleLabel.textContent = nextOpen ? 'Close' : 'Open';
            if (nextOpen) {
                ensureRestoreControls();
            }
        });
    }

    function initPdf() {
        if (!window.pdfjsLib) {
            return Promise.reject(new Error('pdfjsLib is not available'));
        }
        try {
            pdfjsLib.GlobalWorkerOptions.workerSrc = ((window.M && M.cfg && M.cfg.wwwroot) ? M.cfg.wwwroot : '') + '/mod/pdfannotator/lib/pdfjs/pdf.worker.min.js?ver=00004';
            return pdfjsLib.getDocument({
                url: state.documentObject.fullurl,
                withCredentials: true
            }).promise.then(function (pdfDoc) {
                state.pdf = pdfDoc;
                var sumPages = document.getElementById('sumPages');
                if (sumPages) {
                    sumPages.textContent = String(pdfDoc.numPages);
                }
                updatePageCounter(1);
                return pdfDoc.getPage(1).then(function (page1) {
                    var vp = page1.getViewport({ scale: 1 });
                    state.defaultViewport = { width: vp.width, height: vp.height };
                    return pdfDoc;
                }).catch(function () {
                    state.defaultViewport = { width: 900, height: 1200 };
                    return pdfDoc;
                });
            });
        } catch (e) {
            return Promise.reject(e);
        }
    }

    function ensurePageShell(pageNumber, viewport) {
        var viewer = viewerEl();
        if (!viewer) {
            return null;
        }
        var pageContainer = getPageElement(pageNumber);
        if (!pageContainer) {
            pageContainer = document.createElement('div');
            pageContainer.className = 'page tl-page tl-page-shell';
            pageContainer.setAttribute('data-page-number', String(pageNumber));
            viewer.appendChild(pageContainer);
        }

        var vp = viewport || state.defaultViewport || { width: 900, height: 1200 };
        var cssWidth = Math.max(1, Math.round(Number(vp.width || 0)));
        var cssHeight = Math.max(1, Math.round(Number(vp.height || 0)));
        pageContainer.style.width = cssWidth + 'px';
        pageContainer.style.height = cssHeight + 'px';

        var canvas = pageContainer.querySelector('canvas.tl-pdf-canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.className = 'tl-pdf-canvas';
            pageContainer.appendChild(canvas);
        }

        var overlayHost = pageContainer.querySelector('.tl-konva-host');
        if (!overlayHost) {
            overlayHost = document.createElement('div');
            overlayHost.className = 'tl-konva-host';
            pageContainer.appendChild(overlayHost);
        }

        canvas.style.width = cssWidth + 'px';
        canvas.style.height = cssHeight + 'px';
        overlayHost.style.width = cssWidth + 'px';
        overlayHost.style.height = cssHeight + 'px';

        return {
            container: pageContainer,
            canvas: canvas,
            overlayHost: overlayHost,
            viewport: {
                width: cssWidth,
                height: cssHeight
            }
        };
    }

    function buildPageSkeletons() {
        if (!state.pdf) {
            return;
        }
        var baseVp = state.defaultViewport || { width: 900, height: 1200 };
        var vp = {
            width: Math.max(1, Number(baseVp.width || 900) * (state.scale || 1)),
            height: Math.max(1, Number(baseVp.height || 1200) * (state.scale || 1))
        };
        for (var pageNumber = 1; pageNumber <= state.pdf.numPages; pageNumber++) {
            ensurePageShell(pageNumber, vp);
        }
    }

    function getVisiblePageRange() {
        var viewer = viewerEl();
        var total = state.pdf ? state.pdf.numPages : 1;
        if (!viewer || total <= 1) {
            return { from: 1, to: total };
        }
        var top = viewer.scrollTop;
        var bottom = top + viewer.clientHeight;
        if (isFastScrollingNow() && total > 24) {
            var c = getCurrentPage();
            return { from: c, to: c };
        }
        var pages = viewer.querySelectorAll('.page');
        var first = 0;
        var last = 0;
        pages.forEach(function (pageEl) {
            var p = parseInt(pageEl.getAttribute('data-page-number') || '0', 10);
            if (!p) {
                return;
            }
            var pageTop = pageEl.offsetTop;
            var pageBottom = pageTop + pageEl.offsetHeight;
            if (pageBottom >= top && pageTop <= bottom) {
                if (!first || p < first) {
                    first = p;
                }
                if (!last || p > last) {
                    last = p;
                }
            }
        });
        if (!first || !last) {
            var current = getCurrentPage();
            first = current;
            last = current;
        }
        return { from: first, to: last };
    }

    function queueRenderPage(pageNumber, priority) {
        if (!state.pdf || pageNumber < 1 || pageNumber > state.pdf.numPages) {
            return;
        }
        var key = String(pageNumber);
        if (state.renderQueueMap[key] || isPageRenderedForCurrentSignature(pageNumber) || state.renderingPages[key]) {
            return;
        }
        state.renderQueueMap[key] = true;
        state.renderQueue.push({ page: pageNumber, priority: priority || 0 });
        state.metrics.queuedPages += 1;
        state.renderQueue.sort(function (a, b) {
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            return a.page - b.page;
        });
    }

    function pruneFarPages(keepFrom, keepTo) {
        if (isTheatreLayoutTransitionBusy()) {
            return;
        }
        var keys = Object.keys(state.pages || {});
        keys.forEach(function (key) {
            var pageNo = parseInt(key, 10);
            if (!Number.isFinite(pageNo)) {
                return;
            }
            if (pageNo >= keepFrom && pageNo <= keepTo) {
                return;
            }
            if (state.renderingPages[String(pageNo)]) {
                return;
            }
            var pageState = state.pages[pageNo];
            if (!pageState) {
                return;
            }
            var __rtKey = String(pageNo);
            var __rt = state.pageRenderTasks && state.pageRenderTasks[__rtKey];
            if (__rt && typeof __rt.cancel === 'function') {
                try {
                    __rt.cancel();
                } catch (__e0) {}
                delete state.pageRenderTasks[__rtKey];
            }
            try {
                if (pageState.stage && typeof pageState.stage.destroy === 'function') {
                    pageState.stage.destroy();
                }
            } catch (e) {}
            delete state.pages[pageNo];
            delete state.renderedPages[String(pageNo)];
            delete state.pageRenderSignatures[String(pageNo)];
            state.metrics.prunedPages += 1;

            var shell = getPageElement(pageNo);
            if (shell) {
                var host = shell.querySelector('.tl-konva-host');
                if (host) {
                    host.innerHTML = '';
                }
                var canvas = shell.querySelector('canvas.tl-pdf-canvas');
                if (canvas) {
                    try {
                        canvas.width = Math.max(1, Math.ceil((shell.clientWidth || 1) * rasterPixelRatioForLayout()));
                        canvas.height = Math.max(1, Math.ceil((shell.clientHeight || 1) * rasterPixelRatioForLayout()));
                        var pctx = canvas.getContext('2d', { alpha: false });
                        if (pctx) {
                            pctx.setTransform(1, 0, 0, 1, 0, 0);
                            pctx.fillStyle = '#ffffff';
                            pctx.fillRect(0, 0, canvas.width, canvas.height);
                        }
                    } catch (e2) {}
                }
            }
        });
    }

    function processRenderQueue() {
        if (!state.pdf) {
            return;
        }
        var maxConcurrent = getRenderConcurrency();
        while (state.renderInFlight < maxConcurrent && state.renderQueue.length) {
            var next = state.renderQueue.shift();
            var pageNo = next.page;
            var key = String(pageNo);
            delete state.renderQueueMap[key];
            if (isPageRenderedForCurrentSignature(pageNo) || state.renderingPages[key]) {
                continue;
            }
            (function (capturedPageNo) {
                var capturedKey = String(capturedPageNo);
                state.renderInFlight += 1;
                state.renderingPages[capturedKey] = true;
                renderPage(capturedPageNo).catch(function (error) {
                    console.error('Render page failed', error);
                }).finally(function () {
                    delete state.renderingPages[capturedKey];
                    state.renderInFlight = Math.max(0, state.renderInFlight - 1);
                    processRenderQueue();
                });
            })(pageNo);
        }
    }

    function maybeBatchPrefetchAnnotations(pageNumbers) {
        if (!state.perfFlags.batchRead || !Array.isArray(pageNumbers) || !pageNumbers.length) {
            return;
        }
        var missing = [];
        pageNumbers.forEach(function (pageNo) {
            var key = String(pageNo);
            if (!state.annotationsCache[key] && !state.annotationsInFlight[key]) {
                missing.push(pageNo);
            }
        });
        if (!missing.length) {
            return;
        }
        state.metrics.readBatchRequests += 1;
        var inflight = ajax('readbatch', {
            pages: JSON.stringify(missing)
        }).then(function (payload) {
            var grouped = (payload && payload.pages) ? payload.pages : {};
            missing.forEach(function (pageNo) {
                var key = String(pageNo);
                var arr = Array.isArray(grouped[key]) ? grouped[key] : [];
                state.annotationsCache[key] = arr;
                state.annotationsHashByPage[key] = JSON.stringify(arr);
            });
            state.annotationsLoadedOnce = true;
        }).catch(function () {
        }).finally(function () {
            missing.forEach(function (pageNo) {
                delete state.annotationsInFlight[String(pageNo)];
            });
        });
        missing.forEach(function (pageNo) {
            state.annotationsInFlight[String(pageNo)] = inflight;
        });
    }


    function ensureVisiblePagesQueued(from, to) {
        if (!state.pdf) {
            return;
        }
        var current = getCurrentPage();
        for (var pageNo = from; pageNo <= to; pageNo++) {
            var key = String(pageNo);
            var pageEl = getPageElement(pageNo);
            var canvas = pageEl ? pageEl.querySelector('canvas.tl-pdf-canvas') : null;
            var hasBitmap = !!(canvas && canvas.width > 8 && canvas.height > 8);
            var hasState = !!getPageState(pageNo);
            var signatureOk = isPageRenderedForCurrentSignature(pageNo);
            if (!hasBitmap || !hasState || !signatureOk) {
                state.metrics.visibleWithoutBitmap += 1;
                queueRenderPage(pageNo, -900 + Math.abs(pageNo - current));
            }
        }
    }

    function scheduleRenderWindowUpdate(forceRefreshVisibleAnnotations) {
        if (!state.pdf) {
            return;
        }
        if (state.renderSchedulePending) {
            return;
        }
        state.renderSchedulePending = true;
        requestAnimationFrame(function () {
            state.renderSchedulePending = false;
            var visible = getVisiblePageRange();
            var fastScrolling = isFastScrollingNow();
            var before = state.perfFlags.virtualizedRender ? (fastScrolling ? 1 : 2) : state.pdf.numPages;
            var after = state.perfFlags.virtualizedRender ? (fastScrolling ? 1 : 3) : state.pdf.numPages;
            var from = state.perfFlags.virtualizedRender ? Math.max(1, visible.from - before) : 1;
            var to = state.perfFlags.virtualizedRender ? Math.min(state.pdf.numPages, visible.to + after) : state.pdf.numPages;

            var list = [];
            for (var p = from; p <= to; p++) {
                list.push(p);
            }
            if (!fastScrolling) {
                maybeBatchPrefetchAnnotations(list);
            }

            var current = getCurrentPage();
            for (var pageNo = from; pageNo <= to; pageNo++) {
                queueRenderPage(pageNo, Math.abs(pageNo - current));
            }
            ensureVisiblePagesQueued(visible.from, visible.to);
            processRenderQueue();

            if (state.perfFlags.aggressivePrune && !fastScrolling) {
                var keepFrom = Math.max(1, from - 2);
                var keepTo = Math.min(state.pdf.numPages, to + 2);
                pruneFarPages(keepFrom, keepTo);
            }

            if (forceRefreshVisibleAnnotations) {
                for (var refreshPage = visible.from; refreshPage <= visible.to; refreshPage++) {
                    loadAndRenderAnnotations(refreshPage, { forceNetwork: true, forceDraw: true });
                }
            }
        });
    }


    function reflowPdfForScaleChange() {
        if (!state.pdf) {
            return;
        }
        updateEffectiveScale();
        syncZoomUiState();

        state.layoutRev = (state.layoutRev || 0) + 1;
        cancelAllPdfRenderTasks();

        state.renderQueue = [];
        state.renderQueueMap = {};
        state.renderSchedulePending = false;

        state.renderedPages = {};
        state.pageRenderSignatures = {};

        Object.keys(state.pages || {}).forEach(function (key) {
            var pageNo = parseInt(key, 10);
            if (!Number.isFinite(pageNo)) {
                return;
            }
            var ps = state.pages[pageNo];
            if (ps && ps.stage && typeof ps.stage.destroy === 'function') {
                try {
                    ps.stage.destroy();
                } catch (e) {}
            }
            delete state.pages[pageNo];
        });

        buildPageSkeletons();

        state.metrics.renderStartTs = Date.now();
        state.metrics.firstPageRenderMs = null;
        state.metrics.fullRenderMs = null;

        var viewer = viewerEl();
        var targetPage = Math.max(1, Math.min(state.pdf.numPages, parseInt(state.initialPage || 1, 10) || 1));
        if (state.savedPosition && Number.isFinite(state.savedPosition.page)) {
            targetPage = Math.max(1, Math.min(state.pdf.numPages, parseInt(state.savedPosition.page, 10) || 1));
            state.restorePositionPending = {
                page: targetPage,
                ratio: Number.isFinite(state.savedPosition.ratio) ? state.savedPosition.ratio : null,
                scrollTop: Number.isFinite(state.savedPosition.scrollTop) ? state.savedPosition.scrollTop : 0,
                scale: Number.isFinite(state.savedPosition.scale) ? state.savedPosition.scale : state.scale
            };
        }
        if (viewer) {
            var targetEl = getPageElement(targetPage);
            viewer.scrollTop = targetEl ? Math.max(0, targetEl.offsetTop) : 0;
        }

        scheduleRenderWindowUpdate(false);
        startAnnotationWarmup();
    }

    function renderDocument() {
        if (!state.pdf) {
            return;
        }
        updateEffectiveScale();
        syncZoomUiState();
        clearViewer();
        buildPageSkeletons();

        state.metrics.renderStartTs = Date.now();
        state.metrics.firstPageRenderMs = null;
        state.metrics.fullRenderMs = null;

        var viewer = viewerEl();
        var targetPage = Math.max(1, Math.min(state.pdf.numPages, parseInt(state.initialPage || 1, 10) || 1));
        if (state.savedPosition && Number.isFinite(state.savedPosition.page)) {
            targetPage = Math.max(1, Math.min(state.pdf.numPages, parseInt(state.savedPosition.page, 10) || 1));
            state.restorePositionPending = {
                page: targetPage,
                ratio: Number.isFinite(state.savedPosition.ratio) ? state.savedPosition.ratio : null,
                scrollTop: Number.isFinite(state.savedPosition.scrollTop) ? state.savedPosition.scrollTop : 0,
                scale: Number.isFinite(state.savedPosition.scale) ? state.savedPosition.scale : state.scale
            };
        }
        if (viewer) {
            var targetEl = getPageElement(targetPage);
            viewer.scrollTop = targetEl ? Math.max(0, targetEl.offsetTop) : 0;
        }

        scheduleRenderWindowUpdate(false);
        startAnnotationWarmup();
    }

    function startAnnotationWarmup() {
        if (!state.pdf) {
            return;
        }
        if (state.annotationWarmupTimer) {
            clearTimeout(state.annotationWarmupTimer);
            state.annotationWarmupTimer = null;
        }
        state.annotationWarmupTimer = setTimeout(function () {
            scheduleRenderWindowUpdate(false);
        }, 180);
    }


    function drawAnnotationsForPage(pageNumber, annotations, forceDraw) {
        var pageState = getPageState(pageNumber);
        if (!pageState) {
            queueRenderPage(pageNumber, -850);
            processRenderQueue();
            state.metrics.visibleWithoutBitmap += 1;
            return;
        }
        var key = String(pageNumber);
        var normalized = Array.isArray(annotations) ? annotations.slice() : [];
        normalized = normalized.filter(function (annotation) {
            return !state.pendingDeletedAnnotations[String((annotation && annotation.uuid) || '')];
        });

        var hash = JSON.stringify(normalized);
        if (!forceDraw && state.annotationsHashByPage[key] === hash) {
            return;
        }
        state.annotationsHashByPage[key] = hash;
        state.annotationsCache[key] = normalized;

        var selectedId = (state.activeAnnotation && state.activeAnnotation.pageNumber === pageNumber)
            ? String(state.activeAnnotation.annotationId || '') : null;

        var pageEl = getPageElement(pageNumber);
        if (pageEl) {
            pageEl.querySelectorAll('.tl-textbox-label').forEach(function (el) {
                el.remove();
            });
            pageEl.querySelectorAll('.tl-annotation-comment-badge').forEach(function (el) {
                el.remove();
            });
        }

        pageState.annotationLayer.destroyChildren();
        pageState.annotationsById = {};
        normalized.forEach(function (annotation) {
            drawAnnotation(pageNumber, annotation);
        });
        pageState.annotationLayer.draw();

        var restoredGroup = selectedId ? pageState.annotationsById[selectedId] : null;
        if (selectedId && !restoredGroup) {
            var sk;
            for (sk in pageState.annotationsById) {
                if (Object.prototype.hasOwnProperty.call(pageState.annotationsById, sk)) {
                    if (annotationIdsMatch(sk, selectedId)) {
                        restoredGroup = pageState.annotationsById[sk];
                        break;
                    }
                }
            }
        }
        if (selectedId && restoredGroup) {
            var group = restoredGroup;
            state.activeAnnotation = {
                pageNumber: pageNumber,
                group: group,
                annotationId: getStableAnnotationIdForGroup(group)
            };
            pageState.transformer.nodes([group]);
            pageState.transformer.visible(true);
            pageState.overlayLayer.draw();
            showDeleteButton();
        }

        state.annotationsLoadedOnce = true;
    }

    function loadAndRenderAnnotations(pageNumber, opts) {
        var options = opts;
        if (opts === true || opts === false) {
            options = { forceNetwork: !!opts };
        }
        options = options || {};

        var key = String(pageNumber);
        var preferCache = !options.forceNetwork;

        if (preferCache && state.annotationsCache[key]) {
            drawAnnotationsForPage(pageNumber, state.annotationsCache[key], !!options.forceDraw);
            return Promise.resolve();
        }

        var existing = state.annotationsInFlight[key];
        if (existing) {
            return existing.then(function () {
                if (state.annotationsCache[key]) {
                    drawAnnotationsForPage(pageNumber, state.annotationsCache[key], !!options.forceDraw);
                }
            });
        }

        state.metrics.readRequests += 1;
        var request = ajax('read', {
            page_Number: String(pageNumber),
            _cb: String(Date.now()) + '-' + String(pageNumber)
        }).then(function (data) {
            var annotations = Array.isArray(data && data.annotations) ? data.annotations : [];
            state.annotationsCache[key] = annotations;
            state.annotationsHashByPage[key] = JSON.stringify(annotations);
            drawAnnotationsForPage(pageNumber, annotations, true);
        }).catch(function (error) {
            console.error('Loading annotations failed for page', pageNumber, error);
        }).finally(function () {
            delete state.annotationsInFlight[key];
        });

        state.annotationsInFlight[key] = request;
        return request;
    }


    function cancelAllPdfRenderTasks() {
        try {
            var m = state.pageRenderTasks || {};
            Object.keys(m).forEach(function (pk) {
                var t = m[pk];
                if (t && typeof t.cancel === 'function') {
                    try {
                        t.cancel();
                    } catch (e0) {}
                }
            });
        } catch (e2) {}
        state.pageRenderTasks = {};
    }

    function renderPage(pageNumber) {
        var key = String(pageNumber);
        if (!state.pdf) {
            return Promise.resolve();
        }
        var currentSig = computePageRenderSignature();
        if (state.renderedPages[key] && state.pageRenderSignatures[key] === currentSig) {
            return Promise.resolve();
        }
        delete state.renderedPages[key];
        delete state.pageRenderSignatures[key];
        return state.pdf.getPage(pageNumber).then(function (page) {
            var layoutCapture = state.layoutRev || 0;
            var paintSig = computePageRenderSignature();
            var cssViewport = page.getViewport({ scale: state.scale });
            var shell = ensurePageShell(pageNumber, cssViewport);
            if (!shell) {
                return;
            }
            if ((state.layoutRev || 0) !== layoutCapture) {
                return Promise.resolve();
            }

            var pixelRatio = rasterPixelRatioForLayout();
            var canvas = shell.canvas;
            var overlayHost = shell.overlayHost;
            var cssWidth = Math.max(1, Math.round(Number(cssViewport.width || 0)));
            var cssHeight = Math.max(1, Math.round(Number(cssViewport.height || 0)));
            var vw = Math.max(1, Number(cssViewport.width || 1));
            var vh = Math.max(1, Number(cssViewport.height || 1));
            /* HiDPI: backing store = ceil(CSSpx * DPR) so the bitmap is never upscaled soft; map PDF space with cssViewport + transform (PDF.js HiDPI pattern). */
            var canvasBackingW = Math.max(1, Math.ceil(cssWidth * pixelRatio));
            var canvasBackingH = Math.max(1, Math.ceil(cssHeight * pixelRatio));
            canvas.width = canvasBackingW;
            canvas.height = canvasBackingH;
            canvas.style.width = cssWidth + 'px';
            canvas.style.height = cssHeight + 'px';
            overlayHost.style.width = cssWidth + 'px';
            overlayHost.style.height = cssHeight + 'px';

            var oldState = getPageState(pageNumber);
            if (oldState && oldState.stage && typeof oldState.stage.destroy === 'function') {
                oldState.stage.destroy();
                delete state.pages[pageNumber];
            }
            overlayHost.innerHTML = '';

            var canvasContext = canvas.getContext('2d', { alpha: false });
            if (!canvasContext) {
                return;
            }
            canvasContext.setTransform(1, 0, 0, 1, 0, 0);
            canvasContext.fillStyle = '#ffffff';
            canvasContext.fillRect(0, 0, canvas.width, canvas.height);
            canvasContext.imageSmoothingEnabled = false;
            var renderContext = {
                canvasContext: canvasContext,
                viewport: cssViewport,
                transform: [canvas.width / vw, 0, 0, canvas.height / vh, 0, 0]
            };

            if ((state.layoutRev || 0) !== layoutCapture) {
                return Promise.resolve();
            }

            var pdfRenderTask = page.render(renderContext);
            state.pageRenderTasks[key] = pdfRenderTask;
            return pdfRenderTask.promise.then(function () {
                if ((state.layoutRev || 0) !== layoutCapture) {
                    return;
                }
                if (computePageRenderSignature() !== paintSig) {
                    delete state.renderedPages[key];
                    delete state.pageRenderSignatures[key];
                    queueRenderPage(pageNumber, -950);
                    processRenderQueue();
                    return;
                }
                initKonvaForPage(pageNumber, { width: cssWidth, height: cssHeight }, overlayHost);
                state.renderedPages[key] = true;
                state.pageRenderSignatures[key] = paintSig;
                state.metrics.renderedPagesCount += 1;
                applyPendingSavedPosition(pageNumber);

                var elapsed = Date.now() - state.metrics.renderStartTs;
                if (state.metrics.firstPageRenderMs == null) {
                    state.metrics.firstPageRenderMs = elapsed;
                }
                if (Object.keys(state.renderedPages).length >= state.pdf.numPages && state.metrics.fullRenderMs == null) {
                    state.metrics.fullRenderMs = elapsed;
                }

                return loadAndRenderAnnotations(pageNumber, { forceNetwork: false, forceDraw: true });
            }).finally(function () {
                if (state.pageRenderTasks && state.pageRenderTasks[key] === pdfRenderTask) {
                    delete state.pageRenderTasks[key];
                }
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
            pixelRatio: rasterPixelRatioForLayout()
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

        var konvaDpr = rasterPixelRatioForLayout();
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
                var canPan = getRequestedZoom() > 1.0001;
                var tgt = event && event.target;
                if (canPan && tgt === stage && event.evt) {
                    var ev0 = event.evt;
                    var isTouch = ev0.type && ev0.type.indexOf('touch') === 0;
                    var btn = 0;
                    var clientX = 0;
                    var clientY = 0;
                    if (isTouch) {
                        if (!ev0.touches || !ev0.touches[0]) {
                            return;
                        }
                        clientX = ev0.touches[0].clientX;
                        clientY = ev0.touches[0].clientY;
                    } else {
                        if (ev0.button !== 0) {
                            if (event.target === stage) {
                                clearSelection();
                            }
                            return;
                        }
                        clientX = ev0.clientX;
                        clientY = ev0.clientY;
                    }
                    state._viewerPanSession = {
                        startClientX: clientX,
                        startClientY: clientY,
                        lastClientX: clientX,
                        lastClientY: clientY,
                        moved: false
                    };
                    var vPan = viewerEl();
                    if (vPan) {
                        state._viewerPanSession.startScrollLeft = vPan.scrollLeft;
                        state._viewerPanSession.startScrollTop = vPan.scrollTop;
                        vPan.classList.add('tl-pdf-panning');
                        vPan.style.cursor = 'grabbing';
                    }
                    if (isTouch) {
                        document.addEventListener('touchmove', onViewerPanTouchMove, { passive: false, capture: true });
                        document.addEventListener('touchend', onViewerPanTouchEnd, true);
                        document.addEventListener('touchcancel', onViewerPanTouchEnd, true);
                    } else {
                        document.addEventListener('mousemove', onViewerPanMouseMove, true);
                        document.addEventListener('mouseup', onViewerPanMouseUp, true);
                    }
                    return;
                }
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
                    openCommentsPanelForGroup(pageNumber, hitGroup);
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
                    openCommentsPanelForGroup(pageNumber, hitGroupDraw);
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
                        openCommentsPanelForGroup(pageNumber, hitGroupRect);
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
                        openCommentsPanelForGroup(pageNumber, hitGroup);
                        return;
                    }
                    if (data && data.type !== 'textbox') {
                        selectAnnotation(pageNumber, hitGroup);
                        setTool('cursor');
                        openCommentsPanelForGroup(pageNumber, hitGroup);
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

    function invalidateAnnotationCache(pageNumber) {
        if (pageNumber == null) {
            state.annotationsCache = {};
            state.annotationsHashByPage = {};
            return;
        }
        var key = String(pageNumber);
        delete state.annotationsCache[key];
        delete state.annotationsHashByPage[key];
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
                posttype: item.posttype || (item.isquestion ? 'question' : 'comment'),
                parentid: item.parentid || 0
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
            ensureCommentNavControls();
            ensureRestoreControls();
            ensureSearchFormControls();
        });
        state.commentNavObserver.observe(nav, { childList: true, subtree: true });
    }

    var TL_TOGGLE_ALL_TOOLTIP_DELAY = 570;

    function getOrCreateToggleAllToolbarTooltip() {
        var tip = document.getElementById('tl-toggle-all-toolbar-tooltip');
        if (!tip) {
            tip = document.createElement('div');
            tip.id = 'tl-toggle-all-toolbar-tooltip';
            tip.className = 'tl-toolbar-tooltip';
            tip.innerHTML = '<div style="text-align:center;font-size:1em;font-weight:400"></div>';
            tip.style.cssText = 'display:none;position:fixed;z-index:1000010;background:#333;color:#e6e6e6;padding:6px 10px;border-radius:4px;white-space:normal;pointer-events:none;font-family:"Open Sans",Arial,sans-serif;';
            document.body.appendChild(tip);
        }
        return tip;
    }

    function bindTlToolbarTooltip(btn) {
        if (!btn || btn.dataset.tlToolbarTooltipBound === '1') {
            return;
        }
        btn.dataset.tlToolbarTooltipBound = '1';
        if (!btn.getAttribute('data-tl-tooltip') && btn.getAttribute('title')) {
            btn.setAttribute('data-tl-tooltip', btn.getAttribute('title'));
        }
        btn.removeAttribute('title');
        var tip = getOrCreateToggleAllToolbarTooltip();
        var showTimer;
        btn.addEventListener('mouseenter', function () {
            if (showTimer) clearTimeout(showTimer);
            showTimer = setTimeout(function () {
                showTimer = null;
                var text = btn.getAttribute('data-tl-tooltip') || '';
                if (!text) {
                    return;
                }
                tip.firstChild.textContent = text;
                var r = btn.getBoundingClientRect();
                tip.style.left = r.left + 'px';
                tip.style.top = (r.bottom + 8) + 'px';
                tip.style.display = 'block';
            }, TL_TOGGLE_ALL_TOOLTIP_DELAY);
        });
        btn.addEventListener('mouseleave', function () {
            if (showTimer) { clearTimeout(showTimer); showTimer = null; }
            tip.style.display = 'none';
        });
    }

    function bindToggleAllCommentsToolbarTooltip(btn) {
        bindTlToolbarTooltip(btn);
    }

    function ensureCommentNavControls() {
        var nav = document.getElementById('comment-nav');
        if (!nav) {
            return;
        }
        var toggleBtn = nav.querySelector('#toggleAllCommentsList');
        if (!toggleBtn) {
            toggleBtn = document.createElement('button');
            toggleBtn.id = 'toggleAllCommentsList';
            toggleBtn.className = 'btn-link';
            toggleBtn.setAttribute('data-tl-tooltip', state.showAllComments ? 'Hide all comments' : 'Show all comments');
            toggleBtn.innerHTML = '<i class="icon fa fa-comment-o fa-fw"></i>';
            nav.prepend(toggleBtn);
        }

        var searchBtn = nav.querySelector('#searchButton');
        if (!searchBtn) {
            searchBtn = document.createElement('button');
            searchBtn.id = 'searchButton';
            searchBtn.className = 'btn-link';
            searchBtn.title = 'Search';
            searchBtn.innerHTML = '<i class="icon fa fa-search fa-fw"></i>';
            if (toggleBtn.nextSibling) {
                nav.insertBefore(searchBtn, toggleBtn.nextSibling);
            } else {
                nav.appendChild(searchBtn);
            }
        }

        toggleBtn.style.display = 'inline-flex';
        toggleBtn.style.visibility = 'visible';
        toggleBtn.style.opacity = '1';
        searchBtn.style.display = 'inline-flex';
        searchBtn.style.visibility = 'visible';
        searchBtn.style.opacity = '1';

        var restoreWrap = nav.querySelector('.tl-restore-wrap');
        if (restoreWrap) {
            restoreWrap.style.display = 'inline-flex';
            restoreWrap.style.visibility = 'visible';
            restoreWrap.style.opacity = '1';
        }

        var icon = toggleBtn.querySelector('i');
        if (icon) {
            icon.className = state.showAllComments ? 'icon fa fa-comment fa-fw' : 'icon fa fa-comment-o fa-fw';
        }
        var label = toggleBtn.querySelector('.tl-toggle-all-label');
        if (label) {
            var newText = state.showAllComments ? 'Hide all' : 'Show all';
            if (label.textContent !== newText) {
                label.textContent = newText;
            }
        }
        toggleBtn.setAttribute('data-tl-tooltip', state.showAllComments ? 'Hide all comments' : 'Show all comments');
        toggleBtn.removeAttribute('title');
    }
    function getAnnotationGroupFromPage(pageNo, annotationId) {
        var pageState = getPageState(pageNo);
        if (!pageState || !pageState.annotationsById) {
            return null;
        }
        return pageState.annotationsById[String(annotationId || '')] || null;
    }

    function ensurePageReady(pageNo, annotationId) {
        var id = String(annotationId || '');
        var maxWaitMs = state.perfFlags.strictEnsurePageReady ? 3200 : 1800;
        var startedAt = Date.now();
        var requestedNetwork = false;

        return new Promise(function (resolve) {
            function step() {
                if (!state.pdf) {
                    resolve(null);
                    return;
                }

                queueRenderPage(pageNo, -1000);
                processRenderQueue();
                scheduleRenderWindowUpdate(false);

                var viewer = viewerEl();
                var pageEl = getPageElement(pageNo);
                if (viewer && pageEl) {
                    viewer.scrollTop = Math.max(0, pageEl.offsetTop - 24);
                }

                var pageState = getPageState(pageNo);
                if (!pageState) {
                    if ((Date.now() - startedAt) >= maxWaitMs) {
                        resolve(null);
                        return;
                    }
                    state.metrics.ensurePageReadyRetries += 1;
                    setTimeout(step, 110);
                    return;
                }

                var existing = getAnnotationGroupFromPage(pageNo, id);
                if (!id || existing) {
                    resolve(existing || null);
                    return;
                }

                var opts = requestedNetwork
                    ? { forceNetwork: false, forceDraw: true }
                    : { forceNetwork: true, forceDraw: true };
                requestedNetwork = true;

                loadAndRenderAnnotations(pageNo, opts).finally(function () {
                    var group = getAnnotationGroupFromPage(pageNo, id);
                    if (group) {
                        resolve(group);
                        return;
                    }
                    if ((Date.now() - startedAt) >= maxWaitMs) {
                        resolve(null);
                        return;
                    }
                    state.metrics.ensurePageReadyRetries += 1;
                    setTimeout(step, 110);
                });
            }
            step();
        });
    }

    function navigateToAnnotation(annotationId, annotationType, page) {
        ensureCommentPanelVisible();
        var idStr = String(annotationId || '');
        var pageNo = parseInt(page, 10) || 1;

        function afterSelectScroll(group) {
            if (!group) {
                return;
            }
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    scrollViewerToAnnotationVerticalCenter(pageNo, group);
                    var currentPageInput = document.getElementById('currentPage');
                    if (currentPageInput) {
                        currentPageInput.value = String(pageNo);
                    }
                    updatePageCounter(pageNo);
                    updateDeleteButtonPosition();
                    updateAllCommentBadgePositions();
                });
            });
        }

        ensurePageReady(pageNo, idStr).then(function (readyGroup) {
            var group = readyGroup || getAnnotationGroupFromPage(pageNo, idStr);
            if (group) {
                selectAnnotationFromNavigator(pageNo, group);
                afterSelectScroll(group);
            } else {
                var viewer = viewerEl();
                var pageEl = getPageElement(pageNo);
                if (viewer && pageEl) {
                    viewer.scrollTop = Math.max(0, pageEl.offsetTop - 24);
                    updatePageCounter(pageNo);
                }
            }
            loadCommentsForAnnotation(annotationId, annotationType);
        }).catch(function () {
            loadCommentsForAnnotation(annotationId, annotationType);
        });
    }

    function renderQuestionRows(list, entries) {
        list.innerHTML = '';
        list.classList.add('tl-q-overview');
        if (!Array.isArray(entries) || entries.length === 0) {
            list.innerHTML = '<div class="tl-comment-empty">No questions.</div>';
            return;
        }

        entries.forEach(function (q) {
            var article = document.createElement('article');
            article.className = 'tl-comment-item tl-question-item';
            var body = document.createElement('div');
            body.className = 'tl-comment-body';
            body.innerHTML = q && q.content ? q.content : '';
            article.appendChild(body);

            if (q && q.annotationid && q.page) {
                article.style.cursor = 'pointer';
                article.addEventListener('click', function () {
                    navigateToAnnotation(q.annotationid, String(q.annotationtype || ''), q.page);
                });
            }

            list.appendChild(article);
        });
    }

    function filterBySearchPattern(arr) {
        if (!state.searchPattern) { return arr; }
        return arr.filter(function (q) {
            var text = String(q.content || '').replace(/<[^>]+>/g, ' ').toLowerCase();
            return text.indexOf(state.searchPattern) !== -1;
        });
    }

    function refreshQuestionsList() {
        if (state.commentTarget) {
            return;
        }
        var list = document.querySelector('#comment-wrapper .comment-list-container');
        if (!list) {
            return;
        }

        if (state.showAllComments) {
            ajax('getQuestions', { page_Number: -1 }).then(function (data) {
                if (state.commentTarget) return;
                var grouped = (data && data.questions) ? data.questions : {};
                var flat = [];
                Object.keys(grouped).forEach(function (pg) {
                    (grouped[pg] || []).forEach(function (q) {
                        q.page = q.page || pg;
                        flat.push(q);
                    });
                });
                state._questionsCache = flat;
                renderQuestionRows(list, filterBySearchPattern(flat));
            });
            return;
        }

        var p = document.getElementById('currentPage');
        var pg = (p && p.value) ? p.value : 1;
        ajax('getQuestions', { page_Number: pg }).then(function (questions) {
            if (state.commentTarget) return;
            var arr = Array.isArray(questions) ? questions : [];
            state._questionsCache = arr;
        renderQuestionRows(list, filterBySearchPattern(arr));
        });
    }


    function bindFullscreenCommentNavRecovery() {
        var recover = function () {
            syncLayoutDocumentState();
            setTimeout(function () {
                ensureCommentNavControls();
                ensureRestoreControls();
                ensureToggleAllComments();
                ensureSearchFormControls();
            }, 120);
        };
        document.addEventListener('fullscreenchange', recover);
        document.addEventListener('webkitfullscreenchange', recover);
        document.addEventListener('mozfullscreenchange', recover);
        document.addEventListener('msfullscreenchange', recover);
    }

    function ensureToggleAllComments() {
        ensureCommentNavControls();
        var btn = document.getElementById('toggleAllCommentsList');
        if (!btn || btn.dataset.bound === '1') {
            return;
        }
        btn.dataset.bound = '1';
        bindToggleAllCommentsToolbarTooltip(btn);
        btn.classList.add('tl-toggle-all-comments-btn');
        if (!btn.querySelector('.tl-toggle-all-label')) {
            var lbl = document.createElement('span');
            lbl.className = 'tl-toggle-all-label';
            lbl.textContent = state.showAllComments ? 'Hide all' : 'Show all';
            btn.appendChild(lbl);
        }
        btn.addEventListener('click', function () {
            if (state.commentTarget) {
                clearCommentTarget();
                ensureCommentNavControls();
                return;
            }
            state.showAllComments = !state.showAllComments;
            state._lastQuestionsPage = null;
            ensureCommentNavControls();
            refreshQuestionsList();
        });
        setTimeout(function () {
            ensureCommentNavControls();
            refreshQuestionsList();
        }, 250);
    }

    function renderSearchResults(results) {
        var list = document.querySelector('#comment-wrapper .comment-list-container');
        if (!list) { return; }
        list.classList.add('tl-q-overview');
        if (!Array.isArray(results) || results.length === 0) {
            list.innerHTML = '<div class="tl-comment-empty">No results.</div>';
            return;
        }
        list.innerHTML = results.map(function (item) {
            var pt = String(item.posttype || '').toLowerCase();
            var badge = item.isquestion ? 'Q' : (pt === 'answer' ? 'A' : 'C');
            var page = Number(item.page) || 1;
            var plain = String(item.content || '').replace(/<[^>]+>/g, ' ').trim();
            return '<button type="button" class="tl-search-result-item"'
                + ' data-annotation-id="' + escapeHtml(String(item.annotationid)) + '"'
                + ' data-annotation-type="' + escapeHtml(String(item.annotationtype)) + '"'
                + ' data-page="' + page + '">'
                + '<span class="tl-search-badge">' + badge + '</span>'
                + '<span class="tl-search-page"> page ' + page + ': </span>'
                + '<span class="tl-search-content">' + escapeHtml(plain.slice(0, 120)) + '</span>'
                + '</button>';
        }).join('');
        list.querySelectorAll('.tl-search-result-item').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var annotationId   = btn.getAttribute('data-annotation-id');
                var annotationType = btn.getAttribute('data-annotation-type');
                var page           = parseInt(btn.getAttribute('data-page'), 10) || 1;
                navigateToAnnotation(annotationId, annotationType, page);
                return;
                ensureCommentPanelVisible();
                function finish() {
                    loadCommentsForAnnotation(annotationId, annotationType);
                }
                var idStr = String(annotationId || '');
                function afterSelectScroll(group) {
                    if (!group) {
                        return;
                    }
                    requestAnimationFrame(function () {
                        requestAnimationFrame(function () {
                            scrollViewerToAnnotationVerticalCenter(page, group);
                            var currentPageInput = document.getElementById('currentPage');
                            if (currentPageInput) {
                                currentPageInput.value = String(page);
                            }
                            updatePageCounter(page);
                            updateDeleteButtonPosition();
                            updateAllCommentBadgePositions();
                        });
                    });
                }
                function trySelect() {
                    var pageState = getPageState(page);
                    var group = pageState && pageState.annotationsById && pageState.annotationsById[idStr];
                    if (group) {
                        selectAnnotationFromNavigator(page, group);
                        return group;
                    }
                    return null;
                }
                var selected = trySelect();
                if (selected) {
                    afterSelectScroll(selected);
                    finish();
                    return;
                }
                var loadPromise = loadAndRenderAnnotations(page, true);
                if (loadPromise && typeof loadPromise.then === 'function') {
                    loadPromise.then(function () {
                        var g = trySelect();
                        afterSelectScroll(g);
                        finish();
                    }).catch(function () {
                        finish();
                    });
                } else {
                    finish();
                }
            });
        });
    }

    function ensureSearchFormControls() {
        var form = document.getElementById('searchForm');
        if (!form) { return; }
        form.style.display = 'flex';
        if (form.dataset.boundSearch === '1') { return; }
        form.dataset.boundSearch = '1';
        var input = document.getElementById('searchPattern');
        var clearBtn = document.getElementById('searchClear');
        var debounceTimer = null;
        var lastQuery = '';

        function doSearch() {
            var q = (input ? input.value : '').trim();
            if (q === lastQuery) { return; }
            lastQuery = q;
            if (q.length < 2) {
                state.searchPattern = '';
                state._lastQuestionsPage = null;
                refreshQuestionsList();
                return;
            }
            if (state.commentTarget) {
                state.commentTarget = null;
                var _composerClear = ensureCommentComposer();
                if (_composerClear && _composerClear.syncState) {
                    _composerClear.syncState();
                }
            }
            state.searchPattern = q;
            var requestQ = q;
            ajax('searchComments', { q: requestQ }).then(function (data) {
                // Ignore stale responses.
                if (state.searchPattern !== requestQ) { return; }
                var results = Array.isArray(data) ? data : (data.results || []);
                renderSearchResults(results);
            }).catch(function () {
                renderSearchResults([]);
            });
        }

        if (input) {
            input.addEventListener('keyup', function () {
                if (debounceTimer) { clearTimeout(debounceTimer); }
                debounceTimer = setTimeout(doSearch, 300);
            });
            input.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (debounceTimer) { clearTimeout(debounceTimer); }
                    doSearch();
                }
            });
        }
        if (clearBtn) {
            clearBtn.addEventListener('click', function () {
                if (input) { input.value = ''; }
                lastQuery = '';
                state.searchPattern = '';
                state._lastQuestionsPage = null;
                refreshQuestionsList();
            });
        }
        form.addEventListener('submit', function (e) { e.preventDefault(); });
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
            if (!list.hidden) {
                fetchRecycleList();
            } else {
                renderRestoreList();
            }
        });
        document.addEventListener('click', function (event) {
            if (!wrap.contains(event.target)) {
                list.hidden = true;
            }
        });
        fetchRecycleList();
    }

    function fetchRecycleList() {
        ajax('listRecycle', { _cb: String(Date.now()) })
            .then(function (data) {
                state.recycleItems = (data && Array.isArray(data.items)) ? data.items : [];
                renderRestoreList();
            })
            .catch(function () {
                state.recycleItems = [];
                renderRestoreList();
            });
    }

    function renderRestoreList() {
        var list = document.querySelector('#comment-nav .tl-restore-list');
        if (!list) {
            return;
        }
        state.commentNavMuting = true;
        if (!state.recycleItems.length) {
            list.innerHTML = '<div class="tl-restore-empty">No items to restore.</div>';
            setTimeout(function () {
                state.commentNavMuting = false;
            }, 0);
            return;
        }
        list.innerHTML = state.recycleItems.map(function (entry, index) {
            var lbl = escapeHtml(entry.label || ('#' + String(entry.serverId || index)));
            return '<button type="button" class="tl-restore-item" data-restore-index="' + String(index) + '">'
                + lbl + '</button>';
        }).join('');
        list.querySelectorAll('.tl-restore-item').forEach(function (button) {
            button.addEventListener('click', function () {
                var idx = parseInt(button.getAttribute('data-restore-index') || '-1', 10);
                if (idx >= 0) {
                    restoreRecycleEntry(idx);
                }
            });
        });
        setTimeout(function () {
            state.commentNavMuting = false;
        }, 0);
    }

    function pushDeletedAnnotation(entry) {
        fetchRecycleList();
    }

    function restoreRecycleEntry(index) {
        var entry = state.recycleItems[index];
        if (!entry || !entry.serverId) {
            return;
        }
        ajax('restoreRecycle', { entryId: String(entry.serverId) })
            .then(function (data) {
                if (!data || data.status !== 'success') {
                    window.alert('Restore failed.');
                    return;
                }
                if (data.reloadCommentsFor) {
                    var rid = String(data.reloadCommentsFor);
                    loadCommentsForAnnotation(rid, state.commentTarget ? state.commentTarget.annotationType : '');
                    fetchRecycleList();
                    return;
                }
                if (data.annotationId != null) {
                    var annId = String(data.annotationId);
                    var pageNo = Number(data.pageNumber) || 1;
                    return loadAndRenderAnnotations(pageNo, true).then(function () {
                        ensureCommentPanelVisible();
                        setCommentTarget(annId, '');
                        loadCommentsForAnnotation(annId, '');
                        fetchRecycleList();
                    });
                }
                fetchRecycleList();
            })
            .catch(function (e) {
                console.error('restoreRecycle', e);
                window.alert('Restore failed.');
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
        if (!panel) return null;
        var composer = panel.querySelector('.tl-comment-composer');
        if (composer) return composer;

        composer = document.createElement('div');
        composer.className = 'tl-comment-composer';
        composer.innerHTML = [
            '<div class="tl-composer-label"></div>',
            '<div class="tl-composer-actions">',
            '<select class="tl-comment-visibility" title="Comment visibility">',
            '<option value="public">Public</option>',
            '<option value="anonymous">Anonymous</option>',
            '<option value="private">Private</option>',
            '<option value="protected">Protected</option>',
            '</select>',
            '<button type="button" class="tl-composer-btn tl-composer-btn-comment">Add comment</button>',
            '<button type="button" class="tl-composer-btn tl-composer-btn-question">Ask question</button>',
            '</div>',
            '<div class="tl-composer-input-wrap" style="display:none">',
            '<textarea class="tl-comment-input" rows="3" placeholder=""></textarea>',
            '<button type="button" class="tl-composer-btn tl-composer-btn-submit">Add comment</button>',
            '</div>'
        ].join('');

        panel.appendChild(composer);
        ensureRestoreControls();

        var label       = composer.querySelector('.tl-composer-label');
        var visibility  = composer.querySelector('.tl-comment-visibility');
        var btnComment  = composer.querySelector('.tl-composer-btn-comment');
        var btnQuestion = composer.querySelector('.tl-composer-btn-question');
        var inputWrap   = composer.querySelector('.tl-composer-input-wrap');
        var input       = composer.querySelector('.tl-comment-input');
        var btnSubmit   = composer.querySelector('.tl-composer-btn-submit');

        var currentPosttype = null;
        var currentAnnotationId = null;

        function syncComposerState() {
            var enabled = !!(state.commentTarget && state.commentTarget.annotationId);
            if (!enabled) {
                label.textContent = '';
                inputWrap.style.display = 'none';
                btnComment.disabled = true;
                btnQuestion.disabled = true;
                visibility.disabled = true;
                currentPosttype = null;
                currentAnnotationId = null;
                input.value = '';
                btnSubmit.textContent = 'Add comment';
                return;
            }
            var newId = state.commentTarget.annotationId;
            if (newId !== currentAnnotationId) {
                currentPosttype = null;
                input.value = '';
                inputWrap.style.display = 'none';
                btnSubmit.textContent = 'Add comment';
                currentAnnotationId = newId;
            }
            label.textContent = 'Annotation #' + newId;
            btnComment.disabled = false;
            btnQuestion.disabled = false;
            visibility.disabled = false;
        }

        function choosePosttype(type) {
            currentPosttype = type;
            inputWrap.style.display = 'block';
            input.placeholder = (type === 'question') ? 'Type a question' : 'Type a comment';
            btnSubmit.textContent = (type === 'question') ? 'Ask question' : 'Add comment';
            input.focus();
        }

        btnComment.addEventListener('click', function () {
            if (!state.commentTarget || !state.commentTarget.annotationId) return;
            choosePosttype('comment');
        });

        btnQuestion.addEventListener('click', function () {
            if (!state.commentTarget || !state.commentTarget.annotationId) return;
            choosePosttype('question');
        });

        btnSubmit.addEventListener('click', function () {
            if (!state.commentTarget || !state.commentTarget.annotationId || !currentPosttype) return;
            var content = (input.value || '').trim();
            if (!content) { input.focus(); return; }
            btnSubmit.disabled = true;
            ajax('addComment', {
                annotationId: String(state.commentTarget.annotationId),
                content: content,
                visibility: visibility.value || 'public',
                posttype: currentPosttype,
                parentid: 0,
                pdfannotator_addcomment_editoritemid: '0'
            }).then(function () {
                var submittedContent = content;
                input.value = '';
                currentPosttype = null;
                inputWrap.style.display = 'none';
                if (state.commentTarget && state.commentTarget.annotationId) {
                    var targetId   = state.commentTarget.annotationId;
                    var targetType = state.commentTarget.annotationType;
                    var list = document.querySelector('#comment-wrapper .comment-list-container');
                    if (list) {
                        var empty = list.querySelector('.tl-comment-empty');
                        if (empty) empty.remove();
                        var preview = document.createElement('article');
                        preview.className = 'tl-comment-item tl-comment-item--pending';
                        preview.innerHTML = '<div class="tl-comment-meta"><strong>You</strong><span>Now</span></div>'
                            + '<div class="tl-comment-body">' + escapeHtml(submittedContent) + '</div>';
                        list.appendChild(preview);
                    }
                    var gPost = findAnnotationGroupById(String(targetId));
                    if (gPost) {
                        setAnnotationGroupHasComments(gPost, true);
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
                btnSubmit.disabled = false;
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
        refreshQuestionsList();
    }

    function renderCommentsPanel(commentsPayload) {
        var list = document.querySelector('#comment-wrapper .comment-list-container');
        if (!list) return;
        list.classList.remove('tl-q-overview');
        function canShowDeleteComment(item) {
            var c = state.capabilities || {};
            return !!(!item.isdeleted && (c.deleteany || (c.deleteown && item.owner)));
        }
        function isCommentSolved(item) {
            var s = item && item.solved;
            return s === true || s === 1 || (typeof s === 'number' && s > 0) || s === '1';
        }
        var comments = (commentsPayload && Array.isArray(commentsPayload.comments)) ? commentsPayload.comments : [];
        if (!comments.length) {
            if (list.querySelector('.tl-comment-item--pending')) return;
            list.innerHTML = '<div class="tl-comment-empty">No comments for this annotation.</div>';
            return;
        }

        function hasParentId(p) {
            var n = parseInt(p, 10);
            return !isNaN(n) && n > 0;
        }

        function normalizePosttype(item) {
            var pt = item.posttype;
            if (!pt) {
                if (item.isquestion) {
                    pt = 'question';
                } else if (hasParentId(item.parentid)) {
                    pt = 'answer';
                } else {
                    pt = 'comment';
                }
            }
            return pt;
        }

        var idSet = {};
        var commentsById = {};
        comments.forEach(function (item) {
            var pt = normalizePosttype(item);
            item._posttype = pt;
            var cid = String(item.id || item.uuid || '');
            if (cid) {
                idSet[cid] = true;
                commentsById[cid] = item;
            }
        });

        var roots = [];
        comments.forEach(function (item) {
            var pkey = hasParentId(item.parentid) ? String(item.parentid) : '';
            if (pkey && idSet[pkey]) {
                return;
            }
            roots.push(item);
        });

        var rootIdSet = {};
        roots.forEach(function (r) {
            rootIdSet[String(r.id || r.uuid)] = true;
        });

        function threadRootIdFor(item) {
            var cur = item;
            var guard = 0;
            while (cur && guard++ < 150) {
                var cid = String(cur.id || cur.uuid);
                var pid = hasParentId(cur.parentid) ? String(cur.parentid) : '';
                if (!pid || !idSet[pid]) {
                    return cid;
                }
                cur = commentsById[pid];
                if (!cur) {
                    return cid;
                }
            }
            return String(item.id || item.uuid);
        }

        var flatByRoot = {};
        roots.forEach(function (r) {
            flatByRoot[String(r.id || r.uuid)] = [];
        });
        comments.forEach(function (item) {
            var iid = String(item.id || item.uuid);
            if (rootIdSet[iid]) {
                return;
            }
            var tr = threadRootIdFor(item);
            if (!flatByRoot[tr]) {
                flatByRoot[tr] = [];
            }
            flatByRoot[tr].push(item);
        });

        function sortByTime(a, b) {
            var ta = (a.timecreatedts != null) ? parseInt(a.timecreatedts, 10) : 0;
            var tb = (b.timecreatedts != null) ? parseInt(b.timecreatedts, 10) : 0;
            if (ta !== tb) {
                return ta - tb;
            }
            var ia = parseInt(a.id || a.uuid || 0, 10) || 0;
            var ib = parseInt(b.id || b.uuid || 0, 10) || 0;
            return ia - ib;
        }

        roots.sort(sortByTime);
        Object.keys(flatByRoot).forEach(function (k) {
            flatByRoot[k].sort(sortByTime);
        });

        list.innerHTML = '';

        function buildInlineForm(placeholder, submitLabel) {
            var div = document.createElement('div');
            div.className = 'tl-inline-form';
            div.style.display = 'none';
            div.innerHTML = '<textarea class="tl-inline-input" rows="2" placeholder="'
                + escapeHtml(placeholder) + '"></textarea>'
                + '<button type="button" class="tl-inline-submit">' + escapeHtml(submitLabel) + '</button>';
            return div;
        }

        function bindSubmit(form, visEl, posttype, parentId) {
            var input     = form.querySelector('.tl-inline-input');
            var submitBtn = form.querySelector('.tl-inline-submit');
            submitBtn.addEventListener('click', function () {
                var content = (input.value || '').trim();
                if (!content) { input.focus(); return; }
                if (!state.commentTarget || !state.commentTarget.annotationId) return;
                submitBtn.disabled = true;
                var pid = parseInt(parentId, 10) || 0;
                ajax('addComment', {
                    annotationId: String(state.commentTarget.annotationId),
                    content: content,
                    visibility: visEl.value || 'public',
                    posttype: posttype,
                    parentid: pid,
                    pdfannotator_addcomment_editoritemid: '0'
                }).then(function () {
                    input.value = '';
                    form.style.display = 'none';
                    if (state.commentTarget && state.commentTarget.annotationId) {
                        loadCommentsForAnnotation(state.commentTarget.annotationId, state.commentTarget.annotationType);
                    }
                }).catch(function (error) {
                    console.error('Submit failed', error);
                }).finally(function () {
                    submitBtn.disabled = false;
                });
            });
        }

        function buildActionRow() {
            var div = document.createElement('div');
            div.className = 'tl-item-actions';
            div.innerHTML = '<select class="tl-item-visibility">'
                + '<option value="public">Public</option>'
                + '<option value="anonymous">Anonymous</option>'
                + '<option value="private">Private</option>'
                + '<option value="protected">Protected</option>'
                + '</select>'
                + '<span class="tl-vote-slot"></span>'
                + '<button type="button" class="tl-action-btn tl-action-add-comment">Add comment</button>'
                + '<button type="button" class="tl-action-btn tl-action-reply">Reply</button>';
            return div;
        }

        function bindActionRow(container, actionRow, nodeIdStr) {
            var visEl      = actionRow.querySelector('.tl-item-visibility');
            var btnComment = actionRow.querySelector('.tl-action-add-comment');
            var btnReply   = actionRow.querySelector('.tl-action-reply');

            var commentForm = buildInlineForm('Type a comment', 'Add comment');
            var replyForm   = buildInlineForm('Type a reply',   'Add reply');
            container.appendChild(commentForm);
            container.appendChild(replyForm);

            function toggle(form) {
                var other = (form === commentForm) ? replyForm : commentForm;
                var shown = form.style.display !== 'none';
                form.style.display  = shown ? 'none' : 'block';
                other.style.display = 'none';
                if (!shown) {
                    form.querySelector('.tl-inline-input').focus();
                }
            }

            btnComment.addEventListener('click', function () { toggle(commentForm); });
            btnReply.addEventListener('click',   function () { toggle(replyForm); });

            bindSubmit(commentForm, visEl, 'comment', nodeIdStr);
            bindSubmit(replyForm,   visEl, 'answer',  nodeIdStr);
        }

        function renderFlatThreadRow(item, childrenDiv, threadHasQuestionRoot, questionAuthorId) {
            var nodeDbId  = String(item.uuid || item.id || '');
            var nodeIdStr = String(item.id   || item.uuid || '');
            var pt        = item._posttype;
            var badgeLabel = pt === 'question' ? 'Q' : (pt === 'answer' ? 'A' : 'C');
            var badgeTitle = pt === 'question' ? 'Question' : (pt === 'answer' ? 'Answer' : 'Comment');
            var user   = escapeHtml(item.username || 'Użytkownik');
            var time   = escapeHtml(formatPolishTimestamp(item.timecreatedts, item.timecreated || '') || item.timecreated || '');
            var body   = item.displaycontent || escapeHtml(item.content || '');

            var article = document.createElement('article');
            article.className = 'tl-comment-item tl-comment-answer';
            if (pt === 'answer' && isCommentSolved(item)) {
                article.classList.add('tl-answer-is-solution');
            }
            article.id = 'tl-cmt-' + nodeDbId;
            article.setAttribute('data-comment-id', nodeDbId);

            var metaTop = '<div class="tl-comment-meta-top">'
                + '<span class="tl-comment-badge tl-badge-' + (pt === 'answer' ? 'answer' : 'comment')
                + '" title="' + badgeTitle + '">' + badgeLabel + '</span>'
                + '<span class="tl-comment-meta-end">'
                + '<span class="tl-comment-time">' + time + '</span>'
                + (canShowDeleteComment(item)
                    ? '<button type="button" class="tl-comment-delete" data-comment-id="' + escapeHtml(nodeDbId)
                    + '" title="Delete"><i class="fa fa-trash"></i></button>' : '')
                + '</span>'
                + '</div>';

            article.innerHTML = metaTop
                + '<div class="tl-comment-author"><strong>' + user + '</strong></div>'
                + '<div class="tl-comment-body-wrap"><div class="tl-comment-body tl-comment-body-collapsible">' + body + '</div></div>';

            var badgeElFlat = article.querySelector('.tl-comment-badge');
            if (pt === 'question' && isCommentSolved(item) && badgeElFlat) {
                var okq = document.createElement('i');
                okq.className = 'icon fa fa-check tl-q-solved-check';
                okq.setAttribute('title', 'Solved');
                okq.setAttribute('aria-hidden', 'true');
                badgeElFlat.after(okq);
                var solvedPillFlat = document.createElement('span');
                solvedPillFlat.className = 'tl-comment-badge tl-badge-answer tl-badge-solution-pill';
                solvedPillFlat.setAttribute('title', 'Solved');
                solvedPillFlat.textContent = 'SOLVED';
                okq.after(solvedPillFlat);
            }

            function canShowMarkSolution() {
                var caps = state.capabilities || {};
                var uid = parseInt(state.userId, 10) || 0;
                if (!threadHasQuestionRoot || pt !== 'answer' || isCommentSolved(item)) {
                    return false;
                }
                if (caps.markcorrectanswer) {
                    return true;
                }
                var qid = parseInt(questionAuthorId, 10) || 0;
                return qid > 0 && uid === qid;
            }

            if (canShowMarkSolution()) {
                var msBtn = document.createElement('button');
                msBtn.type = 'button';
                msBtn.className = 'tl-mark-solution-btn';
                msBtn.textContent = 'Mark as solution';
                msBtn.addEventListener('click', function () {
                    msBtn.disabled = true;
                    ajax('markSolved', { commentid: nodeIdStr })
                        .then(function (res) {
                            if (res && res.status === 'error') {
                                window.alert('Could not mark as solution.');
                                return;
                            }
                            if (state.commentTarget && state.commentTarget.annotationId) {
                                loadCommentsForAnnotation(state.commentTarget.annotationId, state.commentTarget.annotationType);
                            }
                        })
                        .catch(function (err) {
                            console.error('markSolved failed', err);
                            window.alert('Could not mark as solution.');
                        })
                        .finally(function () {
                            msBtn.disabled = false;
                        });
                });
                var metaTopEl = article.querySelector('.tl-comment-meta-top');
                var metaEndEl = article.querySelector('.tl-comment-meta-end');
                if (metaTopEl && metaEndEl) {
                    metaTopEl.insertBefore(msBtn, metaEndEl);
                } else {
                    article.appendChild(msBtn);
                }
            }

            if (pt === 'answer' && isCommentSolved(item)) {
                var solutionPill = document.createElement('span');
                solutionPill.className = 'tl-comment-badge tl-badge-answer tl-badge-solution-pill';
                solutionPill.setAttribute('title', 'Solution');
                solutionPill.textContent = 'SOLUTION';
                var metaTopElSol = article.querySelector('.tl-comment-meta-top');
                var metaEndElSol = article.querySelector('.tl-comment-meta-end');
                if (metaTopElSol && metaEndElSol) {
                    metaTopElSol.insertBefore(solutionPill, metaEndElSol);
                }
            }

            var actionRow = buildActionRow();
            appendSameQuestionVoteUi(actionRow, item);
            article.appendChild(actionRow);
            bindActionRow(article, actionRow, nodeIdStr);

            childrenDiv.appendChild(article);
        }

        function renderRoot(root) {
            var rootDbId  = String(root.uuid || root.id || '');
            var rootIdStr = String(root.id   || root.uuid || '');
            var pt        = root._posttype;
            var badgeLabel = pt === 'question' ? 'Q' : 'C';
            var badgeTitle = pt === 'question' ? 'Question' : 'Comment';
            var user   = escapeHtml(root.username || 'Użytkownik');
            var time   = escapeHtml(formatPolishTimestamp(root.timecreatedts, root.timecreated || '') || root.timecreated || '');
            var body   = root.displaycontent || escapeHtml(root.content || '');

            var article = document.createElement('article');
            article.className = 'tl-comment-item tl-comment-root';
            article.id = 'tl-cmt-' + rootDbId;
            article.setAttribute('data-comment-id', rootDbId);
            article.innerHTML =
                '<div class="tl-comment-meta-top">'
                + '<span class="tl-comment-badge tl-badge-' + pt + '" title="' + badgeTitle + '">' + badgeLabel + '</span>'
                + '<span class="tl-comment-meta-end">'
                + '<span class="tl-comment-time">' + time + '</span>'
                + (canShowDeleteComment(root) ? '<button type="button" class="tl-comment-delete" data-comment-id="' + escapeHtml(rootDbId) + '" title="Delete"><i class="fa fa-trash"></i></button>' : '')
                + '</span>'
                + '</div>'
                + '<div class="tl-comment-author"><strong>' + user + '</strong></div>'
                + '<div class="tl-comment-body-wrap"><div class="tl-comment-body tl-comment-body-collapsible">' + body + '</div></div>';

            var actionRow = buildActionRow();
            appendSameQuestionVoteUi(actionRow, root);
            article.appendChild(actionRow);
            bindActionRow(article, actionRow, rootIdStr);

            var toggleRow = document.createElement('div');
            toggleRow.className = 'tl-thread-toggle-row';
            toggleRow.innerHTML = '<div class="tl-thread-toggle-gutter" aria-hidden="true"></div>'
                + '<div class="tl-thread-toggle-inner">'
                + '<button type="button" class="tl-thread-toggle">'
                + '<i class="icon fa fa-minus tl-thread-toggle-icon" aria-hidden="true"></i>'
                + '<span class="tl-thread-toggle-label">Collapse thread</span>'
                + '</button></div>';
            article.appendChild(toggleRow);

            var childrenDiv = document.createElement('div');
            childrenDiv.className = 'tl-comment-children';
            article.appendChild(childrenDiv);

            var toggleBtn = toggleRow.querySelector('.tl-thread-toggle');
            function syncThreadToggleUi(collapsed) {
                var iconEl = toggleBtn.querySelector('.tl-thread-toggle-icon');
                var labelEl = toggleBtn.querySelector('.tl-thread-toggle-label');
                if (iconEl) {
                    iconEl.className = 'icon tl-thread-toggle-icon fa ' + (collapsed ? 'fa-plus' : 'fa-minus');
                }
                if (labelEl) {
                    labelEl.textContent = collapsed ? 'Expand thread' : 'Collapse thread';
                }
            }
            toggleBtn.addEventListener('click', function () {
                var collapsed = childrenDiv.classList.toggle('tl-collapsed');
                syncThreadToggleUi(collapsed);
            });

            list.appendChild(article);

            var flat = flatByRoot[rootIdStr] || [];
            var qInThread = null;
            if (pt === 'question') {
                qInThread = root;
            } else {
                for (var qx = 0; qx < flat.length; qx++) {
                    if (flat[qx]._posttype === 'question') {
                        qInThread = flat[qx];
                        break;
                    }
                }
            }
            var threadHasQuestionRoot = !!qInThread;
            var questionAuthorId = qInThread ? qInThread.userid : null;

            if (pt === 'question' && isCommentSolved(root)) {
                var badgeEl = article.querySelector('.tl-comment-badge');
                if (badgeEl) {
                    var ok = document.createElement('i');
                    ok.className = 'icon fa fa-check tl-q-solved-check';
                    ok.setAttribute('title', 'Solved');
                    ok.setAttribute('aria-hidden', 'true');
                    badgeEl.after(ok);
                    var solvedPillRoot = document.createElement('span');
                    solvedPillRoot.className = 'tl-comment-badge tl-badge-answer tl-badge-solution-pill';
                    solvedPillRoot.setAttribute('title', 'Solved');
                    solvedPillRoot.textContent = 'SOLVED';
                    ok.after(solvedPillRoot);
                }
            }

            flat.forEach(function (row) {
                renderFlatThreadRow(row, childrenDiv, threadHasQuestionRoot, questionAuthorId);
            });
        }

        roots.forEach(function (root) {
            renderRoot(root);
        });

        list.querySelectorAll('.tl-comment-body-collapsible').forEach(function (bodyEl) {
            var lh   = parseFloat(window.getComputedStyle(bodyEl).lineHeight) || 20;
            var maxH = lh * 3;
            if (bodyEl.scrollHeight > maxH + 4) {
                bodyEl.style.maxHeight = maxH + 'px';
                bodyEl.style.overflow  = 'hidden';
                var wrap = bodyEl.parentNode;
                var btn  = document.createElement('button');
                btn.type = 'button';
                btn.className = 'tl-show-more';
                btn.textContent = 'Show more...';
                wrap.appendChild(btn);
                btn.addEventListener('click', function () {
                    if (bodyEl.style.maxHeight) {
                        bodyEl.style.maxHeight = '';
                        bodyEl.style.overflow  = '';
                        btn.textContent = 'Show less';
                    } else {
                        bodyEl.style.maxHeight = maxH + 'px';
                        bodyEl.style.overflow  = 'hidden';
                        btn.textContent = 'Show more...';
                    }
                });
            }
        });

        list.querySelectorAll('.tl-comment-delete').forEach(function (button) {
            button.addEventListener('click', function (event) {
                event.preventDefault();
                var commentId = button.getAttribute('data-comment-id');
                if (!commentId) return;
                button.disabled = true;
                ajax('deleteComment', { commentId: String(commentId) })
                    .then(function (data) {
                        if (data && data.status === 'error') {
                            button.disabled = false;
                            var msg = (data.message && String(data.message)) || '';
                            if (!msg && data.errorcode) {
                                msg = String(data.errorcode);
                            }
                            if (!msg) {
                                msg = 'Could not delete this comment.';
                            }
                            window.alert(msg);
                            return;
                        }
                        if (state.commentTarget && state.commentTarget.annotationId) {
                            loadCommentsForAnnotation(state.commentTarget.annotationId, state.commentTarget.annotationType);
                        }
                    })
                    .catch(function (error) {
                        button.disabled = false;
                        console.error('Delete comment failed', error);
                        try {
                            window.alert('Could not delete this comment.');
                        } catch (e) { }
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
                var g = findAnnotationGroupById(annotationIdStr);
                if (g) {
                    setAnnotationGroupHasComments(g, comments.length > 0);
                }
                updateAllCommentBadgePositions();
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

    function textboxUnscaledXAlignEditorText(editor, fontSizeUnscaled, scale) {
        var s = scale || 1;
        var fsPx = Math.max(10, Math.round(fontSizeUnscaled * s));
        var padLpx = Math.round(0.4 * fsPx);
        var edPad = 0;
        try {
            edPad = parseFloat(window.getComputedStyle(editor).paddingLeft) || 0;
        } catch (e1) {
            edPad = Math.round(0.4 * fsPx);
        }
        var textLeftPx = (editor.offsetLeft || 0) + edPad;
        var boxLeftPx = textLeftPx - padLpx;
        return boxLeftPx / s;
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
        var padRight = padX;

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
        labelEl.style.display = 'flex';
        labelEl.style.alignItems = 'flex-start';
        labelEl.style.justifyContent = 'flex-start';
        labelEl.style.textAlign = 'left';
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
        var paddingRight = paddingLeft;
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
            var scale = state.scale || 1;
            fitTextboxAroundContent(annotationData);
            var _tbLines = (annotationData.content || '').split('\n').length;
            if (_tbLines === 1) {
                annotationData.x = textboxUnscaledXAlignEditorText(editor, editorFontSize, scale);
            } else {
                annotationData.x = _anchorX;
            }
            annotationData.y = _anchorY;
            var wrappedH = annotationData.height;
            (function () {
                var wrapEl = document.createElement('div');
                wrapEl.setAttribute('aria-hidden', 'true');
                wrapEl.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre-wrap;word-wrap:break-word;margin:0;border:none;pointer-events:none;padding:6px;box-sizing:border-box;';
                wrapEl.style.width = ((_tbLines === 1) ? Math.ceil(annotationData.width * scale) : editor.offsetWidth) + 'px';
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
            var _tbLines2 = content.split('\n').length;
            var wrappedHeightUnscaled = measure.height;
            (function () {
                var wrapEl = document.createElement('div');
                wrapEl.setAttribute('aria-hidden', 'true');
                wrapEl.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre-wrap;word-wrap:break-word;margin:0;border:none;pointer-events:none;padding:6px;box-sizing:border-box;';
                wrapEl.style.width = ((_tbLines2 === 1) ? Math.ceil(measure.width * scale) : editor.offsetWidth) + 'px';
                wrapEl.style.fontSize = displayFontSize + 'px';
                wrapEl.style.fontFamily = editorFontFamily + ', sans-serif';
                wrapEl.style.lineHeight = '1.25';
                wrapEl.textContent = content;
                pageElement.appendChild(wrapEl);
                wrappedHeightUnscaled = wrapEl.offsetHeight / scale;
                if (wrapEl.parentNode) { wrapEl.parentNode.removeChild(wrapEl); }
            })();
            var _annX = (_tbLines2 === 1)
                ? textboxUnscaledXAlignEditorText(editor, editorFontSize, scale)
                : unscaledBoxX;
            var _annW = (_tbLines2 === 1) ? measure.width : Math.max(measure.width, editor.offsetWidth / scale);
            var annotation = {
                type: 'textbox',
                x: _annX,
                y: unscaledBoxY,
                width: _annW,
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
        var stableAnnoKey = (annotation.uuid != null && String(annotation.uuid) !== '') ? annotation.uuid : annotation.id;
        group.setAttr('annotationId', stableAnnoKey != null ? stableAnnoKey : '');
        group.setAttr('annotationType', annotation.type);
        group.setAttr('annotationData', clone(annotation));
        group.setAttr('hasComments', !!annotation.hasComments);

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
            var _labelColor = (annotation.color === '#1f2937' || !annotation.color) ? '#111827' : annotation.color;
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
            openCommentsPanelForGroup(pageNumber, group);
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
                    updateAllCommentBadgePositions();
                }
            });
            group.on('dragend', function () {
                onAnnotationDragged(pageNumber, group);
            });
        }

        pageState.annotationLayer.add(group);
        var mapKeyGuess = String(stableAnnoKey != null ? stableAnnoKey : (annotation.uuid != null ? annotation.uuid : (annotation.id || '')));
        pageState.annotationsById[mapKeyGuess] = group;
        var sidFinal = getStableAnnotationIdForGroup(group);
        if (sidFinal !== '') {
            var curAid = group.getAttr('annotationId');
            if (curAid == null || normalizeAnnotationIdCandidate(curAid) === '' || !annotationIdsMatch(curAid, sidFinal)) {
                group.setAttr('annotationId', sidFinal);
            }
            var canon = String(sidFinal);
            if (mapKeyGuess !== canon && pageState.annotationsById[mapKeyGuess] === group) {
                delete pageState.annotationsById[mapKeyGuess];
            }
            pageState.annotationsById[canon] = group;
        }
        ensureCommentBadgeForAnnotation(pageNumber, group);
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

    function clearActiveAnnotationVisual() {
        if (state.activeAnnotation) {
            var prevPs = getPageState(state.activeAnnotation.pageNumber);
            if (prevPs && prevPs.transformer) {
                prevPs.transformer.nodes([]);
                prevPs.transformer.visible(false);
                prevPs.overlayLayer.draw();
            }
        }
        state.activeAnnotation = null;
        if (state.deleteButton) {
            state.deleteButton.style.display = 'none';
        }
        state.deleteButtonPage = null;
    }

    function selectAnnotationFromNavigator(pageNumber, group) {
        clearActiveAnnotationVisual();
        var pageState = getPageState(pageNumber);
        if (!pageState || !group) {
            return;
        }
        state.activeAnnotation = {
            pageNumber: pageNumber,
            group: group,
            annotationId: getStableAnnotationIdForGroup(group)
        };
        setCommentTarget(state.activeAnnotation.annotationId, String(group.getAttr('annotationType') || ''));
        if (group.draggable()) {
            pageState.transformer.nodes([group]);
            pageState.transformer.visible(true);
            pageState.overlayLayer.draw();
        } else {
            try {
                group.opacity(0.9);
                pageState.annotationLayer.draw();
                setTimeout(function () {
                    if (group && group.getLayer()) {
                        group.opacity(1);
                        pageState.annotationLayer.draw();
                    }
                }, 260);
            } catch (e) {}
        }
        showDeleteButton();
        syncAllAnnotationCommentBadges();
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
            annotationId: getStableAnnotationIdForGroup(group)
        };
        setCommentTarget(state.activeAnnotation.annotationId, String(group.getAttr('annotationType') || ''));

        if (group.draggable()) {
            pageState.transformer.nodes([group]);
            pageState.transformer.visible(true);
            pageState.overlayLayer.draw();
        }
        showDeleteButton();
        syncAllAnnotationCommentBadges();
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
        syncAllAnnotationCommentBadges();
    }

    function canDeleteAnnotationOnCanvas(data) {
        var c = state.capabilities || {};
        return !!(c.deleteany || (c.deleteown && data && data.owner === true));
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

        var selGroup = state.activeAnnotation.group;
        var selData = selGroup && selGroup.getAttr('annotationData');
        if (!canDeleteAnnotationOnCanvas(selData || {})) {
            if (state.deleteButton) {
                state.deleteButton.style.display = 'none';
            }
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
        updateAllCommentBadgePositions();
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

    function syncAllAnnotationCommentBadges() {
        Object.keys(state.pages || {}).forEach(function (k) {
            var pn = parseInt(k, 10);
            var ps = state.pages[pn];
            if (!ps || !ps.annotationsById) {
                return;
            }
            Object.keys(ps.annotationsById).forEach(function (aid) {
                syncCommentBadgeForGroup(ps.annotationsById[aid]);
            });
        });
        syncOrphanCommentBadgesForSelection();
        Object.keys(state.pages || {}).forEach(function (k2) {
            var pnum = parseInt(k2, 10);
            dedupeCommentBadgeElements(pnum);
        });
    }

    function findAnnotationGroupById(idStr) {
        var keys = Object.keys(state.pages || {});
        for (var i = 0; i < keys.length; i++) {
            var pn = parseInt(keys[i], 10);
            var ps = state.pages[pn];
            if (ps && ps.annotationsById && ps.annotationsById[idStr]) {
                return ps.annotationsById[idStr];
            }
        }
        return null;
    }

    function setAnnotationGroupHasComments(group, has) {
        if (!group) {
            return;
        }
        var h = !!has;
        group.setAttr('hasComments', h);
        var ad = group.getAttr('annotationData') || {};
        ad.hasComments = h;
        group.setAttr('annotationData', ad);
        var pnFound = null;
        Object.keys(state.pages || {}).forEach(function (k) {
            var pn = parseInt(k, 10);
            var ps = state.pages[pn];
            var aid = getStableAnnotationIdForGroup(group);
            if (ps && ps.annotationsById && ps.annotationsById[aid] === group) {
                pnFound = pn;
            }
        });
        if (!h) {
            var el = group.getAttr('commentBadgeEl');
            if (el && el.parentNode) {
                el.parentNode.removeChild(el);
            }
            group.setAttr('commentBadgeEl', null);
        } else if (pnFound != null && !group.getAttr('commentBadgeEl')) {
            ensureCommentBadgeForAnnotation(pnFound, group);
            return;
        }
        syncCommentBadgeForGroup(group);
    }

    function updateCommentBadgePosition(group) {
        var el = group && group.getAttr('commentBadgeEl');
        if (!el || el.style.display === 'none') {
            return;
        }
        var pageNo = null;
        var aid = getStableAnnotationIdForGroup(group);
        Object.keys(state.pages || {}).forEach(function (k) {
            var pn = parseInt(k, 10);
            var ps = state.pages[pn];
            if (ps && ps.annotationsById && ps.annotationsById[aid] === group) {
                pageNo = pn;
            }
        });
        if (pageNo == null) {
            return;
        }
        var pageElement = viewerEl().querySelector('.page[data-page-number="' + pageNo + '"]');
        if (!group || !pageElement) {
            return;
        }
        var box = group.getClientRect({ skipTransform: false, skipShadow: true });
        var left = box.x + box.width + 4;
        var top = box.y;
        el.style.left = Math.max(0, left) + 'px';
        el.style.top = Math.max(0, top) + 'px';
    }

    function updateAllCommentBadgePositions() {
        Object.keys(state.pages || {}).forEach(function (k) {
            var pn = parseInt(k, 10);
            var ps = state.pages[pn];
            if (!ps || !ps.annotationsById) {
                return;
            }
            Object.keys(ps.annotationsById).forEach(function (aid) {
                updateCommentBadgePosition(ps.annotationsById[aid]);
            });
        });
    }

    function normalizeAnnotationIdCandidate(v) {
        if (v == null) {
            return '';
        }
        return String(v).trim();
    }

    function annotationIdsMatch(a, b) {
        var sa = normalizeAnnotationIdCandidate(a);
        var sb = normalizeAnnotationIdCandidate(b);
        if (!sa || !sb) {
            return false;
        }
        if (sa === sb) {
            return true;
        }
        var na = parseInt(sa, 10);
        var nb = parseInt(sb, 10);
        if (!isNaN(na) && !isNaN(nb) && na === nb) {
            return true;
        }
        return false;
    }

    function getStableAnnotationIdForGroup(group) {
        if (!group || !group.getAttr) {
            return '';
        }
        var raw = group.getAttr('annotationId');
        var s = normalizeAnnotationIdCandidate(raw);
        if (s !== '') {
            return s;
        }
        var ad = group.getAttr('annotationData') || {};
        var candidates = [
            ad.uuid,
            ad.id,
            ad.UUID,
            ad.annotationid,
            ad.annotationId,
            ad.annotation_id,
            ad.AnnotationId
        ];
        var i;
        for (i = 0; i < candidates.length; i++) {
            s = normalizeAnnotationIdCandidate(candidates[i]);
            if (s !== '') {
                return s;
            }
        }
        return '';
    }

    function syncCommentBadgeForGroup(group) {
        if (!group) {
            return;
        }
        var el = group.getAttr('commentBadgeEl');
        var has = !!group.getAttr('hasComments');
        var aid = getStableAnnotationIdForGroup(group);
        if (el && aid) {
            el.setAttribute('data-tl-annotation-id', aid);
        }
        var selected = state.activeAnnotation && (
            state.activeAnnotation.group === group ||
            annotationIdsMatch(state.activeAnnotation.annotationId, aid)
        );
        if (!has) {
            if (el) {
                el.style.display = 'none';
            }
            return;
        }
        if (!el) {
            return;
        }
        if (selected) {
            el.style.display = 'none';
        } else {
            el.style.display = '';
            updateCommentBadgePosition(group);
        }
    }


    function dedupeCommentBadgeElements(pageNumber) {
        var pageEl = getPageElement(pageNumber);
        if (!pageEl) {
            return;
        }
        var keep = [];
        var ps = state.pages[pageNumber];
        if (ps && ps.annotationsById) {
            Object.keys(ps.annotationsById).forEach(function (aidk) {
                var g = ps.annotationsById[aidk];
                var bel = g.getAttr('commentBadgeEl');
                if (bel) {
                    keep.push(bel);
                }
            });
        }
        pageEl.querySelectorAll('.tl-annotation-comment-badge').forEach(function (badge) {
            if (keep.indexOf(badge) === -1 && badge.parentNode) {
                badge.parentNode.removeChild(badge);
            }
        });
    }

    function syncOrphanCommentBadgesForSelection() {
        var active = state.activeAnnotation;
        var activeSid = '';
        var activePage = null;
        var activeExpectedLeft = null;
        var activeExpectedTop = null;
        if (active) {
            activeSid = normalizeAnnotationIdCandidate(getStableAnnotationIdForGroup(active.group));
            if (!activeSid) {
                activeSid = normalizeAnnotationIdCandidate(active.annotationId);
            }
            activePage = parseInt(active.pageNumber, 10);
            if (active.group && active.group.getClientRect) {
                var activeBox = active.group.getClientRect({ skipTransform: false, skipShadow: true });
                activeExpectedLeft = Math.max(0, activeBox.x + activeBox.width + 4);
                activeExpectedTop = Math.max(0, activeBox.y);
            }
        }
        Object.keys(state.pages || {}).forEach(function (k) {
            var pn = parseInt(k, 10);
            var pageEl = viewerEl().querySelector('.page[data-page-number="' + pn + '"]');
            if (!pageEl) {
                return;
            }
            var badges = pageEl.querySelectorAll('.tl-annotation-comment-badge');
            var bi;
            for (bi = 0; bi < badges.length; bi++) {
                var badge = badges[bi];
                var bid = normalizeAnnotationIdCandidate(badge.getAttribute('data-tl-annotation-id'));
                if (bid !== '') {
                    if (activeSid !== '' && annotationIdsMatch(bid, activeSid)) {
                        badge.style.display = 'none';
                    } else {
                        badge.style.display = '';
                    }
                    continue;
                }

                if (!active || pn !== activePage || activeExpectedLeft == null || activeExpectedTop == null) {
                    badge.style.display = '';
                    continue;
                }

                var badgeLeft = parseFloat(badge.style.left || '');
                var badgeTop = parseFloat(badge.style.top || '');
                if (!isNaN(badgeLeft) && !isNaN(badgeTop)
                    && Math.abs(badgeLeft - activeExpectedLeft) <= 14
                    && Math.abs(badgeTop - activeExpectedTop) <= 14) {
                    badge.style.display = 'none';
                } else {
                    badge.style.display = '';
                }
            }
        });
    }

    function ensureCommentBadgeForAnnotation(pageNumber, group) {
        var has = !!group.getAttr('hasComments');
        var pageEl = getPageElement(pageNumber);
        if (!pageEl || !has) {
            return;
        }
        var existing = group.getAttr('commentBadgeEl');
        if (existing && existing.parentNode) {
            existing.parentNode.removeChild(existing);
            group.setAttr('commentBadgeEl', null);
        }
        var badge = document.createElement('button');
        badge.type = 'button';
        badge.className = 'tl-annotation-comment-badge';
        badge.setAttribute('aria-label', 'This annotation has a comment or question');
        badge.innerHTML = '<i class="icon fa fa-comment fa-fw" aria-hidden="true"></i>';
        badge.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            selectAnnotation(pageNumber, group);
            openCommentsPanelForGroup(pageNumber, group);
        });
        badge.addEventListener('mousedown', function (e) {
            e.stopPropagation();
        });
        pageEl.appendChild(badge);
        group.setAttr('commentBadgeEl', badge);
        var sidBadge = getStableAnnotationIdForGroup(group);
        if (sidBadge) {
            badge.setAttribute('data-tl-annotation-id', sidBadge);
        }
        syncCommentBadgeForGroup(group);
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
        if (!canDeleteAnnotationOnCanvas(group.getAttr('annotationData') || {})) {
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
            var badgeEl = group.getAttr('commentBadgeEl');
            if (badgeEl && badgeEl.parentNode) {
                badgeEl.parentNode.removeChild(badgeEl);
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
                    invalidateAnnotationCache(pageNumber);
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
            var cb = current.getAttr('commentBadgeEl');
            if (cb && cb.parentNode) {
                cb.parentNode.removeChild(cb);
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
        }).then(function () {
            invalidateAnnotationCache(annotation.page || (state.activeAnnotation ? state.activeAnnotation.pageNumber : null));
        }).catch(function (error) {
            console.error('Update annotation failed', error);
        });
    }

    function createAnnotation(pageNumber, annotation) {
        ajax('create', {
            page_Number: String(pageNumber),
            annotation: JSON.stringify(annotation)
        }).then(function (created) {
            invalidateAnnotationCache(pageNumber);
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
        function runAnnotationRecovery() {
            state.recoveryTimer = null;
            if (!state.pdf) {
                return;
            }
            if (isTheatreLayoutTransitionBusy()) {
                state.recoveryTimer = setTimeout(runAnnotationRecovery, 160);
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

            scheduleRenderWindowUpdate(false);
        }
        state.recoveryTimer = setTimeout(runAnnotationRecovery, delay);
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
        var tabbar = document.querySelector('#pdfannotator-tabbar .nav.nav-tabs');
        if (tabbar) tabbar.classList.add('pdfannotatornavbar');

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
            state.savedPosition = {
                page: state.initialPage,
                ratio: 0,
                scrollTop: 0,
                scale: state.scale
            };
        } else {
            try {
                var raw = typeof localStorage !== 'undefined' && localStorage.getItem(posKey);
                if (raw) { stored = JSON.parse(raw); }
            } catch (e) {}
            if (stored && typeof stored.page === 'number' && stored.page >= 1) {
                state.initialPage = stored.page;
                state.savedPosition = {
                    page: state.initialPage,
                    ratio: Number.isFinite(stored.ratio) ? clampNumber(stored.ratio, 0, 1) : null,
                    scrollTop: Number.isFinite(stored.scrollTop) ? stored.scrollTop : 0,
                    scale: state.scale
                };
            } else {
                state.initialPage = 1;
                state.savedPosition = null;
            }
        }
        state.restorePositionPending = state.savedPosition ? {
            page: state.savedPosition.page,
            ratio: state.savedPosition.ratio,
            scrollTop: state.savedPosition.scrollTop,
            scale: state.savedPosition.scale
        } : null;
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

        var restoredZoom = 1;
        state.zoomUser = restoredZoom;
        updateEffectiveScale();
        var defaultScale = document.querySelector('select.scale');
        if (defaultScale) {
            defaultScale.value = String(restoredZoom);
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
        bindLayoutReflowEvents();
        buildShoelaceToolbar();
        setCommentsOpen(isCommentsOpen());
        syncZoomUiState();
        observeCommentNav();
        ensureCommentNavControls();
        ensureToggleAllComments();
        ensureRestoreControls();
        ensureSearchFormControls();
        bindFullscreenCommentNavRecovery();
        syncLayoutDocumentState();
        setTimeout(ensureRestoreControls, 400);
        setTimeout(ensureRestoreControls, 1200);
        setTimeout(ensureToggleAllComments, 400);
        initKeyboardShortcuts();
        setTool('cursor');
        bindVisibilityRecovery();


        try {
            var __pdfInit = initPdf();
            if (!__pdfInit || typeof __pdfInit.then !== 'function') {
                throw new Error('initPdf did not return a promise');
            }
            __pdfInit.then(function () {
                renderDocument();
                setTimeout(function () {
                    scheduleRenderWindowUpdate(false);
                }, 450);
            }).catch(function (error) {
                console.error('PDF initialization failed', error);
                var viewer = viewerEl();
                if (viewer) {
                    viewer.innerHTML = '<div class="alert alert-danger">PDF.js/Konva initialization failed. Check console.</div>';
                }
            });
        } catch (error) {
            console.error('PDF initialization failed (sync)', error);
            var viewer = viewerEl();
            if (viewer) {
                viewer.innerHTML = '<div class="alert alert-danger">PDF initialization failed.</div>';
            }
        }
    }

    function startIndexCompat() {

    window.tlPdfRuntimeStats = function () {
        return JSON.parse(JSON.stringify(state.metrics || {}));
    };

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
