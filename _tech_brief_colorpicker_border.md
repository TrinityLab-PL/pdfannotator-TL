# Opis techniczny: obramowanie / cieniowanie wokół color pickera (Chrome)

## 1. Cel dokumentu

Dla innego asystenta (np. Claude): pełny kontekst problemu wizualnego z color pickerem na pasku narzędzi PDF Annotatora oraz lista plików do analizy. **Oczekiwane zachowanie:** wokół color pickera ma być tylko jedna, kontrolowana ramka (albo brak zewnętrznej ramki/cienia). **Aktualny problem:** w Chrome nadal widać szersze obramowanie lub cieniowanie, którego nie da się usunąć zwykłym CSS ani w DevTools.

---

## 2. Gdzie jest problem

- **Element:** `<input type="color" data-proxy-style="color">` na pasku **tl-express-toolbar** (Konva viewer).
- **HTML:** Budowany w [js_new/pdfannotator_new.v00054.js](js_new/pdfannotator_new.v00054.js) ok. linia 555:  
  `<div class="tl-color-picker-wrapper"><input type="color" data-proxy-style="color" value="#ae090f" /></div>`.
- **Ładowanie skryptu:** [locallib.php](locallib.php) linia 71 ładuje `pdfannotator_new.v00054.js`.
- **Logika:** `shell.querySelector('[data-proxy-style="color"]')` (ok. 688) – zdarzenia `input`/`change`, ustawia `state.drawingStroke`, `state.textColor`, `state.annotationColor`.
- **Style:** [styles.css](styles.css) ok. 2312–2343: `.tl-color-picker-wrapper` oraz `input[type="color"]` (wymiary, overflow, appearance, pseudo-elementy).

---

## 3. Dlaczego w Chrome obramowanie zostaje

- **`<input type="color">`** w Chrome (Chromium/Blink) renderowany jest z **user-agent Shadow DOM**:
  - `#shadow-root (user-agent)`
  - wewnątrz: `<div pseudo="-webkit-color-swatch-wrapper">` oraz `<div pseudo="-webkit-color-swatch" style="background-color: ...">`.
- Style z **user agent stylesheet** (np. `border-width: 1px`, `border-style: solid`, `border-color: buttonborder`, `padding: 1px 2px`, `appearance: auto`) stosują się do wewnętrznej reprezentacji; w DevTools widać je jako „ustawione na sztywno” i trudne do nadpisania z zewnątrz.
- **Pseudo-elementy** `::-webkit-color-swatch-wrapper` i `::-webkit-color-swatch` w naszym CSS (styles.css) mogą w Chrome nadal nie usuwać całego natywnego obramowania/cienia, bo część stylów jest wewnątrz Shadow DOM i poza pełną kontrolą autorowego CSS.
- **Wykonane próby (bez pełnego efektu w Chrome):**
  - `border: none`, `outline: none`, `box-shadow: none` na `input[type="color"]`,
  - `-webkit-appearance: none` / `appearance: none`,
  - stylowanie `::-webkit-color-swatch-wrapper` i `::-webkit-color-swatch`,
  - opakowanie inputa w `.tl-color-picker-wrapper` z `overflow: hidden` i powiększeniem inputa (width/height 120%, margin -10%), żeby obciąć natywne obramowanie – użytkownik raportuje, że obramowanie nadal jest widoczne.

---

## 4. Pliki powiązane z problemem

Jedyna lista – tylko pliki istotne dla obramowania color pickera w express toolbar (Chrome):

| Plik | Opis |
|------|------|
| **mod/pdfannotator/styles.css** | Reguły dla `.tl-color-picker-wrapper` i `input[type="color"]` (ok. 2312–2343) oraz pseudo-elementy `::-webkit-color-swatch-wrapper`, `::-webkit-color-swatch`, `::-moz-color-swatch`. |
| **mod/pdfannotator/js_new/pdfannotator_new.v00054.js** | Budowa HTML wrappera i inputa (ok. linia 555); obsługa zdarzeń input/change (ok. 688–699). |
| **mod/pdfannotator/locallib.php** | Ładowanie v00054 (linia 71). |

---

## 5. Kontekst zasad projektu

- Edycja plików w `mod/pdfannotator/` tylko przez skrypt: `edit-with-maintenance.sh --cmd '...'` (z katalogu Moodle). Nie używać StrReplace/Write bezpośrednio na plikach pluginu poza wyjątkami (np. *.md w katalogu pluginu).
- Po zmianach: SANITY, SYNTAX, ewentualnie REGRES/SMOKE według [PDF_ANNOTATOR_ZASADY_PRACY.md](PDF_ANNOTATOR_ZASADY_PRACY.md).

---

## 6. Propozycje dalszych kroków (dla asystenta)

1. **Sprawdzić w Chrome** aktualny drzewiec DOM i computed styles dla `.tl-color-picker-wrapper` i `input[type="color"]` (w tym #shadow-root) – które reguły ostatecznie dają border/box-shadow.
2. **Przetestować** np.:
   - większe „obcięcie” (np. width/height 150%, margin -25%) przy `.tl-color-picker-wrapper { overflow: hidden }`,
   - albo ukrycie natywnego inputa (opacity: 0 lub position: absolute; left: -9999px) i zastąpienie wizualne jednym `<div>` pokazującym `background-color` z wartości inputa + programowe `input.click()` przy kliknięciu (bez zmiany API state).
3. **Ujednolicić** oczekiwanie: jedna ramka (z wrappera) czy zero ramek – i dopasować CSS/HTML w plikach z sekcji 4.
