# Bug 8: Szary tekst w fullscreen – techniczny opis (pełny prompt)

## 1. Objaw

W trybie **fullscreen** PDF Annotatora (przycisk fullscreen lub F11) tekst w polu tekstowym (textbox) jest wyświetlany w **szarym** kolorze zamiast w czytelnym, ciemnym kolorze. W widoku normalnym (bez fullscreen) kolor tekstu jest prawidłowy.

Dotyczą:
- **Etykieta textboxa po zapisie** – div z klasą `.tl-textbox-label` (tekst wyświetlany na stronie PDF).
- **Pole edycji (textarea)** – element z klasą `.tl-inline-text-editor` (podczas edycji textboxa).

Oczekiwane zachowanie: w fullscreen tekst w obu tych elementach ma być w tym samym, czytelnym (ciemnym) kolorze co w widoku normalnym.

---

## 2. Kontekst techniczny

- **Wejście w fullscreen:** W głównym JS pluginu (`pdfannotator_new.v00054.js`) po aktywacji trybu „theater” na `document.body` jest dodawana klasa `tl-pdf-fullscreen` (linia ~408). Klasa jest usuwana przy wyjściu z fullscreen (linia ~416). Dodatkowo używany jest moduł `fullscreen_enhanced.js`, który m.in. obsługuje przycisk fullscreen i stan ikony.
- **Stylowanie fullscreen:** W `styles.css` reguły dla fullscreen są pod selektorem `body.tl-pdf-fullscreen …`. Dla textboxa istnieje blok (linie ~2385–2389):
  ```css
  body.tl-pdf-fullscreen .tl-inline-text-editor,
  body.tl-pdf-fullscreen .tl-textbox-label {
      color: #111827 !important;
      -webkit-text-fill-color: #111827 !important;
  }
  ```
- **Kolor ustawiany w JS:** Przy tworzeniu/otwieraniu edytora textboxa w `pdfannotator_new.v00054.js` ustawiane są inline: `editor.style.color = _c` oraz `editor.style.webkitTextFillColor = _c`, gdzie `_c` pochodzi z koloru adnotacji (np. `annotationData.color || '#111827'`). Dla nowego textboxa (showNewTextboxEditor) ustawiane jest `editor.style.color` i `editor.style.webkitTextFillColor` z `state.textColor` lub domyślnie `#111827`.
- **Co już próbowano:** Wprowadzono w CSS `-webkit-text-fill-color: #111827 !important` oraz w JS `editor.style.webkitTextFillColor = _c`, żeby wymusić kolor wypełnienia tekstu. Mimo to użytkownik raportował, że w fullscreen tekst nadal jest szary (hotfix oznaczony jako NOK).

---

## 3. Możliwe przyczyny (kierunki do weryfikacji)

- **Kaskada / specyficzność:** Inna reguła (motyw Moodle, Bootstrap, lub inny plik CSS) może nadpisywać kolor dla `textarea`, `input` lub elementów wewnątrz `#viewer` z wyższą specyficznością lub później w kaskadzie – także w kontekście `body.tl-pdf-fullscreen`. Warto sprawdzić w DevTools, która reguła faktycznie nadaje `color` i `-webkit-text-fill-color` w fullscreen.
- **Kolejność ładowania CSS:** Jeśli arkusz motywu ładuje się po arkuszu pluginu, reguły motywu mogą nadpisywać kolory. Sprawdzić kolejność arkuszy na stronie i ewentualnie podnieść specyficzność lub dodać reguły w pliku pluginu tak, aby były ładowane po stylach motywu (np. przez Moodle).
- **Inline style vs CSS:** W fullscreen inline `editor.style.webkitTextFillColor` jest ustawiane w JS na kolor adnotacji. Teoretycznie `!important` w CSS powinno wygrać; w niektórych przeglądarkach lub w specyficznym kontekście (np. wewnątrz kontenera z określonym `color`) może to działać inaczej – warto zweryfikować w przeglądarce, która wartość jest zastosowana.
- **Fullscreen API a `body`:** Klasa `tl-pdf-fullscreen` jest na `document.body`. Gdy używane jest Fullscreen API (np. `element.requestFullscreen()`), pełnoekranowy może być inny element (np. `#viewer`). Sprawdzić, czy w momencie problemu `body` faktycznie ma klasę `tl-pdf-fullscreen` i czy selektor `body.tl-pdf-fullscreen .tl-inline-text-editor` / `.tl-textbox-label` trafia w te same węzły DOM co w widoku normalnym (np. czy edytor nie jest przenoszony do innego kontenera w fullscreen).
- **fullscreen_enhanced.js:** Sprawdzić, czy ten skrypt nie zmienia DOM (np. klonowanie, przenoszenie #viewer do innego kontenera, iframe), co mogłoby zmienić kontekst stylów lub to, który `body` jest rodzicem edytora/etykiety.

---

## 4. Pliki do przejrzenia (pełne ścieżki)

Poniżej **pełne ścieżki** plików w repozytorium pluginu, które są istotne do zdiagnozowania i naprawy buga „szary tekst w fullscreen” (bug 8):

1. **mod/pdfannotator/styles.css**  
   – Reguły dla `.tl-inline-text-editor`, `.tl-textbox-label` oraz blok `body.tl-pdf-fullscreen .tl-inline-text-editor, body.tl-pdf-fullscreen .tl-textbox-label`; ewentualne inne reguły `body.tl-pdf-fullscreen` wpływające na kolor tekstu.

2. **mod/pdfannotator/js_new/pdfannotator_new.v00054.js**  
   – Dodawanie/usuwanie klasy `tl-pdf-fullscreen` na `document.body` (okolice linii 408 i 416); tworzenie i stylowanie elementu edytora textboxa (klasa `.tl-inline-text-editor`) – ustawianie `editor.style.color` i `editor.style.webkitTextFillColor`; tworzenie/aktualizacja etykiety textboxa (`.tl-textbox-label`) – np. w `drawAnnotation` i `applyTextboxLabelLayout`. Warto przeszukać po: `tl-pdf-fullscreen`, `tl-inline-text-editor`, `tl-textbox-label`, `editor.style.color`, `webkitTextFillColor`.

3. **mod/pdfannotator/fullscreen_enhanced.js**  
   – Logika wejścia/wyjścia z fullscreen, ewentualna zmiana DOM (np. przenoszenie kontenera, obsługa Fullscreen API); sprawdzenie, czy gdzieś ustawiane są style koloru lub czy edytor/etykieta są w innym drzewie DOM w fullscreen.

4. **mod/pdfannotator/view.php** (lub plik widoku, który ładuje CSS/JS pluginu)  
   – Kolejność dołączania arkuszy CSS i skryptów (np. `$PAGE->requires->css`, `$PAGE->requires->js`), żeby ustalić, czy style pluginu mogą być nadpisywane przez motyw.

5. **mod/pdfannotator/locallib.php**  
   – Miejsce rejestracji/ładowania `pdfannotator_new.v00054.js` (i ewentualnie innych JS/CSS), żeby potwierdzić, które pliki są ładowane na stronie z PDF Annotatorem.

Dodatkowo warto (po stronie Moodle/motywu):

6. **Sprawdzenie w przeglądarce (DevTools):** W trybie fullscreen, dla widocznego szarego tekstu w `.tl-inline-text-editor` lub `.tl-textbox-label` – sprawdzić w zakładce „Computed” / „Styles”, skąd pochodzi `color` i `-webkit-text-fill-color` oraz czy `body` ma klasę `tl-pdf-fullscreen`. To nie jest plik w pluginie, ale niezbędne do potwierdzenia przyczyny.

---

## 5. Sformułowanie zadania (pełny prompt do naprawy)

**Zadanie:** Napraw bug 8 (szary tekst w fullscreen) w pluginie PDF Annotator dla Moodle.

**Objaw:** W trybie fullscreen tekst w polu tekstowym (textbox) – zarówno w etykiecie po zapisie (`.tl-textbox-label`), jak i w polu edycji (`.tl-inline-text-editor`) – wyświetla się w szarym kolorze. W widoku normalnym kolor jest prawidłowy (ciemny, czytelny).

**Wymaganie:** Po wejściu w fullscreen tekst w obu tych elementach ma mieć ten sam, czytelny (ciemny) kolor co w widoku normalnym.

**Kontekst:** Na `body` jest ustawiana klasa `tl-pdf-fullscreen`; w CSS jest blok wymuszający `color: #111827 !important` i `-webkit-text-fill-color: #111827 !important` dla `body.tl-pdf-fullscreen .tl-inline-text-editor` i `body.tl-pdf-fullscreen .tl-textbox-label`. W JS przy tworzeniu edytora ustawiane są inline `color` i `webkitTextFillColor`. Mimo to w fullscreen użytkownik nadal widzi szary tekst – należy zlokalizować przyczynę (kaskada, specyficzność, kolejność CSS, ewentualnie zachowanie fullscreen/DOM) i wprowadzić minimalną, trwałą poprawkę.

**Pliki do przejrzenia i ewentualnej modyfikacji:**  
`mod/pdfannotator/styles.css`,  
`mod/pdfannotator/js_new/pdfannotator_new.v00054.js`,  
`mod/pdfannotator/fullscreen_enhanced.js`,  
oraz (dla kontekstu ładowania) `mod/pdfannotator/view.php`,  
`mod/pdfannotator/locallib.php`.

**Zasady projektu:** Zmiany w plikach pluginu wyłącznie przez skrypt `edit-with-maintenance.sh` (jedno wywołanie na prompt, na końcu `php admin/cli/maintenance.php --disable`). Przed wdrożeniem: SANITY, SYNTAX; po wdrożeniu: SMOKE (w tym wejście w fullscreen i sprawdzenie koloru tekstu w textboxie).
