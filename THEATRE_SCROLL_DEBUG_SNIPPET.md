# Theatre ↔ normal — debug geometrii scrolla (dryf)

Zgodnie z planem **TheatreScrollDebug**: zbieramy metryki DOM **bez zmiany kodu wtyczki** (wklejka konsoli). Opcjonalnie log serwerowy: `action.php?action=debugLog` → `<dataroot>/pdfannotator_runtime/runtime.log`.

> **Ważne:** endpoint `debugLog` akceptuje `tag` jako `PARAM_ALPHANUMEXT` (litery, cyfry, `_`, `-`). **Nie używaj** `dbg:before` — używaj np. `dbgBefore`, `dbgAfterEnter`, `dbgAfterLeave`, `dbgDelta`.

## Wymagania

- Otwarta strona modułu PDF Annotator (załadowany bundle).
- W konsoli dostępne: `window.M.cfg.sesskey`, `window.M.cfg.wwwroot`.
- Przełącznik teatru: `window.tlToggleTheaterMode` (już eksponowany w bundle).

## 1) Wklejka — jednorazowo wklej w DevTools → Console

```javascript
(function () {
    'use strict';

    function $(sel) { return document.querySelector(sel); }

    function pageEls() {
        var viewer = $('#viewer');
        if (!viewer) return [];
        return Array.prototype.slice.call(viewer.querySelectorAll('.page'));
    }

    function pageMetrics(pageEl) {
        if (!pageEl) return null;
        var canvas = pageEl.querySelector('canvas.tl-pdf-canvas');
        var cs = window.getComputedStyle(pageEl);
        return {
            offsetTop: pageEl.offsetTop,
            offsetHeight: pageEl.offsetHeight,
            canvasOffsetTop: canvas ? canvas.offsetTop : null,
            canvasOffsetHeight: canvas ? canvas.offsetHeight : null,
            marginTop: cs.marginTop,
            marginBottom: cs.marginBottom,
            paddingTop: cs.paddingTop,
            paddingBottom: cs.paddingBottom
        };
    }

    function pickPages(pages) {
        var n = pages.length;
        var last = n;
        var idx20 = Math.min(20, last);
        var idx50 = Math.min(50, last);
        var out = {};
        if (n >= 1) out.p1 = pageMetrics(pages[0]);
        if (n >= idx20) out.p20 = pageMetrics(pages[idx20 - 1]);
        if (n >= idx50 && idx50 !== idx20) out.p50 = pageMetrics(pages[idx50 - 1]);
        if (n >= 1) out.pLast = pageMetrics(pages[last - 1]);
        return out;
    }

    function containerBox(el) {
        if (!el) return null;
        return {
            offsetWidth: el.offsetWidth,
            offsetHeight: el.offsetHeight,
            scrollHeight: el.scrollHeight,
            clientHeight: el.clientHeight,
            clientWidth: el.clientWidth
        };
    }

    function snapshot(label) {
        var viewer = $('#viewer');
        var root = $('#pdfannotator_index');
        var pages = pageEls();
        var body = document.body;
        var snap = {
            label: label,
            t: Date.now(),
            href: String(location.href || ''),
            classes: {
                body: body ? body.className : '',
                tlPdfFullscreen: body && body.classList.contains('tl-pdf-fullscreen'),
                tlLayoutV4: root && root.classList.contains('tl-layout-v4'),
                zoom200: root && root.classList.contains('zoom-200'),
                theatreState: root ? root.getAttribute('data-tl-theatre') : null,
                commentsState: root ? root.getAttribute('data-comments-state') : null
            },
            zoomSelect: (function () {
                var sel = $('select.scale');
                return sel ? sel.value : null;
            })(),
            viewer: viewer ? {
                scrollTop: viewer.scrollTop,
                scrollHeight: viewer.scrollHeight,
                clientHeight: viewer.clientHeight,
                offsetWidth: viewer.offsetWidth,
                clientWidth: viewer.clientWidth
            } : null,
            pageCount: pages.length,
            pages: pickPages(pages),
            contentWrapper: containerBox($('#content-wrapper')),
            bodyWrapper: containerBox($('#body-wrapper')),
            bodyBg: body ? window.getComputedStyle(body).backgroundColor : null
        };
        return snap;
    }

    function sendDebug(tag, msg, extra) {
        if (!window.M || !M.cfg || !M.cfg.wwwroot || !M.cfg.sesskey) {
            console.warn('tlTheatreScrollDbg: brak M.cfg — brak zapisu serwerowego');
            return Promise.resolve(false);
        }
        var body = new URLSearchParams();
        body.append('action', 'debugLog');
        body.append('sesskey', M.cfg.sesskey);
        body.append('tag', String(tag || 'dbg').slice(0, 80));
        body.append('msg', String(msg || '').slice(0, 500));
        body.append('href', String(location.href || '').slice(0, 500));
        try {
            body.append('extra', JSON.stringify(extra).slice(0, 12000));
        } catch (e) {
            body.append('extra', String(extra).slice(0, 2000));
        }
        return fetch(M.cfg.wwwroot + '/mod/pdfannotator/action.php?_ts=' + Date.now(), {
            method: 'POST',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Cache-Control': 'no-cache'
            },
            body: body.toString()
        }).then(function () { return true; }).catch(function () { return false; });
    }

    function delta(a, b) {
        if (!a || !b || !a.viewer || !b.viewer) return { err: 'missing viewer' };
        var out = {
            dScrollHeight: b.viewer.scrollHeight - a.viewer.scrollHeight,
            dClientHeight: b.viewer.clientHeight - a.viewer.clientHeight,
            dScrollTop: b.viewer.scrollTop - a.viewer.scrollTop,
            pages: {}
        };
        ['p1', 'p20', 'p50', 'pLast'].forEach(function (k) {
            if (a.pages[k] && b.pages[k]) {
                out.pages[k] = {
                    dOffsetTop: b.pages[k].offsetTop - a.pages[k].offsetTop,
                    dOffsetHeight: b.pages[k].offsetHeight - a.pages[k].offsetHeight
                };
            }
        });
        return out;
    }

    function sleep(ms) {
        return new Promise(function (r) { setTimeout(r, ms); });
    }

    function logTable(title, snap) {
        console.log('--- ' + title + ' ---');
        console.table({
            scrollTop: snap.viewer && snap.viewer.scrollTop,
            scrollHeight: snap.viewer && snap.viewer.scrollHeight,
            clientHeight: snap.viewer && snap.viewer.clientHeight,
            pageCount: snap.pageCount,
            theatre: snap.classes.tlPdfFullscreen,
            zoom: snap.zoomSelect,
            comments: snap.classes.commentsState
        });
        console.log(JSON.stringify(snap, null, 2));
    }

    /**
     * N cykli: normal → theatre → normal (wykorzystuje tlToggleTheaterMode).
     */
    async function runCycles(count) {
        var n = Math.max(1, parseInt(count, 10) || 3);
        if (typeof window.tlToggleTheaterMode !== 'function') {
            console.error('tlToggleTheaterMode nie znaleziony — załaduj stronę PDF Annotator.');
            return;
        }
        for (var i = 0; i < n; i++) {
            var cycle = i + 1;
            console.log('%c[CYCLE ' + cycle + '/' + n + '] start', 'color:teal;font-weight:bold');

            var before = snapshot('before');
            logTable('before', before);
            await sendDebug('dbgBefore', 'cycle' + cycle, before);

            window.tlToggleTheaterMode();
            await sleep(200);
            var afterEnter = snapshot('afterEnter');
            logTable('afterEnter (theatre)', afterEnter);
            await sendDebug('dbgAfterEnter', 'cycle' + cycle, afterEnter);

            window.tlToggleTheaterMode();
            await sleep(300);
            var afterLeave = snapshot('afterLeave');
            logTable('afterLeave (normal)', afterLeave);
            await sendDebug('dbgAfterLeave', 'cycle' + cycle, afterLeave);

            var d = delta(before, afterLeave);
            console.log('%cDELTA before vs afterLeave', 'color:orange;font-weight:bold', d);
            await sendDebug('dbgDelta', 'cycle' + cycle + ' beforeVsAfterLeave', { delta: d, beforeLabel: before.t, afterLabel: afterLeave.t });

            var dEnter = delta(before, afterEnter);
            await sendDebug('dbgDeltaEnter', 'cycle' + cycle + ' beforeVsTheatre', { delta: dEnter });

            await sleep(150);
        }
        console.log('%c[runCycles] gotowe — sprawdź runtime.log (jeśli włączone)', 'color:green;font-weight:bold');
    }

    /** Ustaw panel komentarzy jak w aplikacji (layout v4). */
    function setCommentsOpen(open) {
        var root = $('#pdfannotator_index');
        var wrap = $('#comment-wrapper');
        if (root && root.classList.contains('tl-layout-v4')) {
            root.setAttribute('data-comments-state', open ? 'open' : 'closed');
        }
        if (wrap) {
            wrap.classList.toggle('tl-comments-hidden', !open);
            wrap.classList.remove('hidden');
        }
    }

    /** Ustaw zoom przez select (jeśli istnieje wartość w opcji). */
    function setZoom(value) {
        var sel = $('select.scale');
        if (!sel) return false;
        var want = String(value);
        var ok = false;
        Array.prototype.forEach.call(sel.options, function (o) {
            if (o.value === want) ok = true;
        });
        if (!ok) {
            console.warn('Brak opcji zoom=' + want + ' w select.scale — ustaw ręcznie z paska.');
            return false;
        }
        sel.value = want;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
    }

    /**
     * Macierz: panel × zoom — po każdej kombinacji jeden cykl teatru.
     * zoomLevels: np. [1, 1.5, 2]
     */
    async function runGapMatrix(options) {
        var opts = options || {};
        var zoomLevels = opts.zoomLevels || [1, 1.5, 2];
        var commentsVariants = opts.commentsVariants !== false ? [false, true] : [true];
        for (var zi = 0; zi < zoomLevels.length; zi++) {
            for (var ci = 0; ci < commentsVariants.length; ci++) {
                var z = zoomLevels[zi];
                var open = commentsVariants[ci];
                console.log('%c[GAP] zoom=' + z + ' commentsOpen=' + open, 'color:#609;font-weight:bold');
                setCommentsOpen(open);
                setZoom(z);
                await sleep(400);
                await runCycles(1);
                await sleep(300);
            }
        }
    }

    window.tlTheatreScrollDbg = {
        snapshot: snapshot,
        sendDebug: sendDebug,
        delta: delta,
        runCycles: runCycles,
        runGapMatrix: runGapMatrix,
        setCommentsOpen: setCommentsOpen,
        setZoom: setZoom
    };

    console.log('%ctlTheatreScrollDbg załadowane: tlTheatreScrollDbg.runCycles(5), .runGapMatrix()', 'background:#222;color:#8f8;font-weight:bold;padding:2px 6px');
})();
```

## 2) Jak uruchomić

| Cel | Komenda |
|-----|--------|
| 3–5 cykli normal ↔ theatre | `tlTheatreScrollDbg.runCycles(5)` |
| Macierz: zoom 100/150/200 % + panel otwarty/zamknięty | `tlTheatreScrollDbg.runGapMatrix({ zoomLevels: [1, 1.5, 2] })` |
| Pojedynczy zrzut | `tlTheatreScrollDbg.snapshot('manual')` → potem `JSON.stringify(...)` lub `sendDebug` |

Po zapisie serwerowym przeglądaj log: **`runtime.log`** w katalogu danych Moodle (`pdfannotator_runtime`).

## 3) Co porównywać (dbg-compare-metrics)

Dla każdego cyklu:

1. **`viewer.scrollHeight`** — jeśli różnica normal vs theatre jest **stała** (niezależna od strony), a **`offsetTop` strony N** rośnie **liniowo z N**, to typowy obraz **akumulacji odstępu na stronę** (margines/gap między `.page`).
2. Jeśli **`dOffsetTop`** dla `p1`, `p20`, `p50`, `pLast` jest **ty sam** (±1 px), dryf nie jest „per-page accumulation” — szukać jednego globalnego offsetu (np. padding kontenera).
3. Jeśli **`scrollHeight`** jest stabilny między trybami, a **`scrollTop`** po cyklu się zmienia przy tym samym „miejscu wizualnym”, podejrzenie: **restore przez `scrollFraction`** przy zmienionym `maxScroll` (patrz kod: `restoreScrollAfterTheatreLayoutIfPossible` mnoży ułamek przez aktualne `maxScroll`).
4. **Panel komentarzy / zoom:** jeśli delta znika przy zamkniętym panelu lub przy konkretnym zoom — izolacja przyczyny do **CSS kolumny** lub gałęzi skali (`computePageRenderSignature` / reflow).

## 4) Węzeł decyzyjny (dbg-decision-node)

| Obserwacja metryk | Rekomendacja kolejnego kroku |
|-------------------|------------------------------|
| Rosnący `dOffsetTop` proporcjonalnie do numeru strony; różnica `scrollHeight` zgodna z \( \Delta_{\text{gap}} \times (\text{pages}-1) \) | Najpierw **CSS/normalizacja odstępów** stron i kontenerów (`#viewer`, `#body-wrapper`, `.page`) tak, aby geometria theatre/normal była **spójna** przed jakimkolwiek restore. |
| `scrollHeight` stabilne, ale po toggle **scrollTop** „ucieka” w stronę początku przy długim dokumencie | Podejrzenie **restore-logiki**: wczesne `viewer.scrollTop = scrollFraction * maxScroll` przy jeszcze nieostatecznym `scrollHeight` (`restoreScrollAfterTheatreLayoutIfPossible`). Rozważyć restore **tylko po** stabilnym reflow lub wyłącznie przez **ratio na stronie** (`applyScrollFromRestorePending`), bez pośredniego `scrollFraction`. |
| Dryf znika przy jednym zoom / jednym stanie panelu | **Warunkowa ścieżka** reflow lub osobny branch w sygnaturze renderu — dopasować miejsce zapisu pozycji do realnej gałęzi layoutu. |

Powiązany kod (referencja): `buildSavedPosition`, `applyScrollFromRestorePending`, `restoreScrollAfterTheatreLayoutIfPossible`, `softReflowPdfLayoutAfterTheaterToggle`, `computePageRenderSignature`, style `body.tl-pdf-fullscreen` / `#pdfannotator_index.tl-layout-v4`.

---

## Checklist smoke po ręcznym teście

1. Otwórz PDF, uruchom `runCycles(3)`.
2. Sprawdź konsolę + ewentualnie `runtime.log`.
3. Zanotuj dla jednego cyklu: `dbgDelta` — `dScrollHeight` oraz `pages.p20.dOffsetTop` (czy ≠ 0).

**SANITY / SYNTAX:** nie dotyczy samej wklejki (brak zmian w plikach kodu). Przy wdrażaniu poprawek produkcyjnych stosuj workflow z `edit-with-maintenance.sh` i testy z `PDF_ANNOTATOR_ZASADY_PRACY.md`.
