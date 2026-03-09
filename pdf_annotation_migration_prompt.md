# SUPERPROMPT: Migracja PDF Annotator — Moodle → PDF.js + Konva.js

## 1. KONTEKST PROJEKTU

### Środowisko
- Serwer: Proxmox VM, Ubuntu
- Moodle: 4.5.8+
- Ścieżka bazowa: `/var/www/html/moodle`
- Plugin: `/var/www/html/moodle/mod/pdfannotator/`
- URL: https://opole.trinitylab.pl/moodle
- Backupy: `~/trinity_lab_backup/`
- Aktualny stan backupu: `v97_FS_overlay_fixed_clickability_OK`

### Kluczowe pliki pluginu (obecne)
- `shared/index.js` — cała logika adnotacji (~11 000 linii, jeden plik, brak AMD/require)
- `fullscreen_enhanced.js` — logika fullscreen (Trinity Lab custom)
- `styles.css` — style CSS
- `view.php` — ładowanie JS

### Ważne ograniczenie: BRAK AMD
Moodle normalnie używa AMD/RequireJS do ładowania modułów JS. Ten plugin **nie używa AMD** — pliki JS są ładowane bezpośrednio przez `$PAGE->requires->js()` w `view.php`. Każda nowa biblioteka musi być dołączona jako zwykły plik JS (nie moduł AMD), albo jako bundle.

---

## 2. OBECNY STACK (do zastąpienia)

- **pdf-annotate.js** — stara biblioteka adnotacji (fork, silnie zmodyfikowany)
- **PDF.js** (wbudowany w Firefox) — renderowanie PDF
- Renderowanie: SVG overlay na canvas PDF.js
- Typy adnotacji: `point` (pinezka), `area` (prostokąt), `drawing` (rysunek odręczny), `textbox`, `text` (zaznaczenie tekstu), `highlight`, `strikeout`

### Znane, nierozwiązane bugi obecnego stacku
1. **FF + drawing + nearEdge**: ramka edycji (overlay) za mała przy krawędziach strony
2. **Podwójne skalowanie path**: `transform="scale(X)"` na elemencie + `scaleUp()` w kodzie = błędne wymiary `rect`
3. **Trzy układy współrzędnych** mieszane w jednym miejscu (SVG, viewport, page) — główna przyczyna wszystkich bugów pozycjonowania
4. **calcDelta drawing**: skomplikowana logika delta przy przeciąganiu, częściowo naprawiona
5. **getAnnotationRect dla path**: parsowanie atrybutu `d` zamiast `getBBox()` — niedokładne dla krzywych

---

## 3. CEL: NOWY STACK

### Biblioteki
- **PDF.js** (pdfjs-dist) — renderowanie PDF na canvas
  - Licencja: Apache 2.0 ✓
  - https://github.com/mozilla/pdf.js
- **Konva.js** — warstwa adnotacji (canvas 2D)
  - Licencja: MIT ✓
  - https://github.com/konvajs/konva

### Dlaczego ten wybór
- PDF.js: jedyny sprawdzony renderer PDF w przeglądarce, aktywnie rozwijany
- Konva.js: wbudowany poprawny hit-testing uwzględniający stroke, transformacje, drag — eliminuje całą klasę bugów pozycjonowania
- Oba działają bez modułów AMD jako standalone bundle

### Wymagana funkcjonalność (zachować z obecnego pluginu)
1. Renderowanie PDF (wielostronicowe, zoom, scroll)
2. Adnotacje: pinezka, prostokąt zaznaczenia, rysunek odręczny, pole tekstowe, zaznaczenie tekstu, podkreślenie, przekreślenie
3. Zapis/odczyt adnotacji przez istniejące API PHP (AJAX, format JSON)
4. Panel komentarzy (prawy panel) — otwiera się po kliknięciu adnotacji
5. Fullscreen mode (istniejący `fullscreen_enhanced.js` — zachować lub przepisać)
6. Tryby: widok, edycja, komentarz
7. Wielostronicowy scroll z lazy loading stron
8. Zoom (100%, 133%, 150%, 200%)
9. Toolbar z narzędziami
10. Drag adnotacji po zaznaczeniu
11. Usuwanie adnotacji (przycisk X na overlay)
12. Overlay edycji (ramka wokół zaznaczonej adnotacji) — pozycja i rozmiar muszą być precyzyjne

### Czego NIE zmieniamy
- Backend PHP (kontrolery, baza danych, API AJAX)
- Format JSON adnotacji zapisywanych w bazie
- HTML struktura strony (Moodle layout)
- `view.php` — minimalne zmiany (tylko ładowanie nowych JS)

---

## 4. ARCHITEKTURA NOWEGO ROZWIĄZANIA

### Struktura plików
```
mod/pdfannotator/
  lib/
    pdfjs/          — pdfjs-dist bundle (pdf.min.js + pdf.worker.min.js)
    konva/          — konva.min.js
  js/
    pdfannotator_core.js   — główny plik: inicjalizacja, renderowanie, API
    annotation_layer.js    — warstwa Konva: tworzenie, edycja, drag adnotacji
    toolbar.js             — logika toolbar
    comments_panel.js      — panel komentarzy
  fullscreen_enhanced.js   — zachowany lub przepisany
  styles.css
  view.php
```

### Zasada jednego układu współrzędnych
Wszystkie adnotacje zapisywane i obliczane w **znormalizowanych współrzędnych PDF** (0-1 lub punkty PDF 72dpi), konwertowane do viewport tylko do wyświetlenia. Eliminuje problem trzech układów współrzędnych.

### Hit-testing
Konva.js obsługuje hit-testing natywnie, włącznie z:
- strokeWidth (klikalność na linii, nie tylko na geometrii)
- transformacje (scale, rotate)
- padding hit area

---

## 5. ZASADY PRACY — WORKFLOW

### Komunikacja
- Instrukcje słowne i kod do skopiowania **zawsze w osobnych blokach**
- Jedna zmiana = jedno zadanie, czekaj na potwierdzenie przed następnym
- Zadania numerowane: Z1, Z2, Z3... — obie strony odnoszą się do tego samego numeru
- Bez gadulstwa, bez pochwał ("Doskonała uwaga!")
- Krótko i na temat
- Nie powtarzaj operacji, które już były testowane i dały złe wyniki — prowadź mentalną listę przetestowanych podejść
- Jeśli coś nie wiadomo — zapytaj jedno konkretne pytanie

### Bash — format obowiązkowy
```bash
# MAINTENANCE ON
php /var/www/html/moodle/admin/cli/maintenance.php --enable

# ZMIANA
...

# MAINTENANCE OFF
php /var/www/html/moodle/admin/cli/maintenance.php --disable

# PURGE CACHE
php /var/www/html/moodle/admin/cli/purge_caches.php

# WERYFIKACJA (grep lub diff)
grep -n "..." /ścieżka/do/pliku
```

### Kiedy używać maintenance mode
- **ZAWSZE** przy modyfikacji JS/CSS/PHP
- **NIGDY** przy samym czytaniu plików (cat, grep, diff, ls)

### Modyfikacje kodu JS — Python, nie sed
```bash
python3 << 'PYEOF'
path = '/var/www/html/moodle/mod/pdfannotator/...'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = """dokładny fragment do zastąpienia"""
new = """nowy fragment"""

if old not in content:
    print("ERROR: nie znaleziono"); exit(1)
content = content.replace(old, new, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("OK")
PYEOF
```
Zawsze sprawdzaj `if old not in content` — jeśli ERROR, zatrzymaj się i sprawdź aktualny stan pliku.

### Backupy — format nazwy
```
v{numer}_{opis_co_działa}
```
Przykład: `v97_FS_overlay_fixed_clickability_OK`

### Bash tworzenia backupu (obowiązkowy format)
```bash
mkdir -p ~/trinity_lab_backup/v{NR}_{OPIS}/shared
cp /var/www/html/moodle/mod/pdfannotator/shared/index.js ~/trinity_lab_backup/v{NR}_{OPIS}/shared/
cp /var/www/html/moodle/mod/pdfannotator/fullscreen_enhanced.js ~/trinity_lab_backup/v{NR}_{OPIS}/
cp /var/www/html/moodle/mod/pdfannotator/styles.css ~/trinity_lab_backup/v{NR}_{OPIS}/
cp /var/www/html/moodle/mod/pdfannotator/view.php ~/trinity_lab_backup/v{NR}_{OPIS}/

diff ~/trinity_lab_backup/v{NR}_{OPIS}/shared/index.js /var/www/html/moodle/mod/pdfannotator/shared/index.js && echo "OK" || echo "DIFF"
diff ~/trinity_lab_backup/v{NR}_{OPIS}/fullscreen_enhanced.js /var/www/html/moodle/mod/pdfannotator/fullscreen_enhanced.js && echo "OK" || echo "DIFF"
diff ~/trinity_lab_backup/v{NR}_{OPIS}/styles.css /var/www/html/moodle/mod/pdfannotator/styles.css && echo "OK" || echo "DIFF"
diff ~/trinity_lab_backup/v{NR}_{OPIS}/view.php /var/www/html/moodle/mod/pdfannotator/view.php && echo "OK" || echo "DIFF"
```
Backup tworzony **przed każdą zmianą** gdy jest wyraźnie poproszony lub przed większym blokiem pracy.

### Rollback (pełny)
```bash
php /var/www/html/moodle/admin/cli/maintenance.php --enable

cp ~/trinity_lab_backup/v{NR}_{OPIS}/fullscreen_enhanced.js /var/www/html/moodle/mod/pdfannotator/
cp ~/trinity_lab_backup/v{NR}_{OPIS}/styles.css /var/www/html/moodle/mod/pdfannotator/
cp ~/trinity_lab_backup/v{NR}_{OPIS}/view.php /var/www/html/moodle/mod/pdfannotator/
cp ~/trinity_lab_backup/v{NR}_{OPIS}/shared/index.js /var/www/html/moodle/mod/pdfannotator/shared/

php /var/www/html/moodle/admin/cli/purge_caches.php
php /var/www/html/moodle/admin/cli/maintenance.php --disable
```

### Weryfikacja po zmianie
Zawsze grep potwierdzający że zmiana weszła. Nigdy nie zakładaj że Python zadziałał bez weryfikacji.

### Testy po każdej zmianie (SMOKE TEST)
1. Chrome normal: pinezka, prostokąt, rysunek, textbox — tworzenie, klikanie, drag
2. Chrome fullscreen: to samo
3. FF normal: to samo
4. FF fullscreen: to samo
Zgłaszaj regresje natychmiast, nie czekaj na koniec testów.

### Testy syntax PHP (przy zmianach PHP)
```bash
php -l /var/www/html/moodle/mod/pdfannotator/view.php && php -l /var/www/html/moodle/mod/pdfannotator/lib.php
```

---

## 6. WARUNKI BRZEGOWE I ZAKAZY

1. **Zakaz zmian w Chrome** — żadna zmiana nie może powodować regresji w Chrome
2. **Zakaz zmian w adnotacjach innych niż drawing** — jeśli pracujemy nad drawing, nie ruszamy point/area/textbox/text
3. **Zakaz rollbacku bez pytania** — jeśli użytkownik mówi "nie rób rollbacku", nie rób go
4. **Nie numeruj backupów z głowy** — zawsze zapytaj o aktualny numer lub sprawdź `ls ~/trinity_lab_backup/`
5. **Nie zakładaj że plik na serwerze = plik który analizujesz** — zawsze weryfikuj grep/md5sum
6. **Nie mieszaj instrukcji z kodem** w jednym bloku do skopiowania

---

## 7. FORMAT PODAWANIA ZADAŃ

### Dobry przykład:
Z1. Zainstaluj pdfjs-dist na serwerze.

```bash
cd /var/www/html/moodle/mod/pdfannotator
npm install pdfjs-dist --prefix /tmp/pdfjs_install
cp /tmp/pdfjs_install/node_modules/pdfjs-dist/build/pdf.min.js lib/pdfjs/
cp /tmp/pdfjs_install/node_modules/pdfjs-dist/build/pdf.worker.min.js lib/pdfjs/
ls lib/pdfjs/
```

Z2. Wklej wynik.

### Zły przykład:
"Wykonaj te kroki: [instrukcja + kod w jednym bloku]"

---

## 8. HISTORIA PROJEKTU (skrót)

- v85: stabilna baza, fullscreen OK dla wszystkich typów, drawing rozjechane
- v86-v93: naprawy drag, delta, pozycjonowania w różnych trybach
- v94: nearEdge detection dla FF+drawing, calcDelta viewport
- v95: klikalność FF+drawing poprawiona
- v96: klikalność Chrome+drawing poprawiona
- v97: usunięto `styleLeft += 10` w FS (regresja z v93), obecna stabilna baza

### Aktualny stan v97
- Chrome normal/FS: wszystko OK
- FF normal/FS: pinezka, prostokąt, textbox — OK; drawing — klikalność OK, ramka przy krawędzi za mała (nierozwiązany bug)

---

## 9. PLAN MIGRACJI (kolejność kroków)

1. Pobranie i zainstalowanie pdfjs-dist + konva.js jako pliki statyczne
2. Proof of concept: renderowanie pierwszej strony PDF przez nowy PDF.js
3. Warstwa Konva nad PDF — wyświetlenie istniejących adnotacji z bazy
4. Implementacja hit-testing i zaznaczania adnotacji
5. Implementacja overlay edycji (ramka + przycisk X)
6. Drag adnotacji
7. Tworzenie nowych adnotacji (każdy typ osobno)
8. Zapis przez istniejące API PHP
9. Fullscreen
10. Usunięcie starego kodu (shared/index.js → zastąpiony)
11. Testy regresji wszystkich typów, wszystkich przeglądarek

Każdy krok = osobna wersja backup przed i po.

---

## 10. UI/UX — NOWE MENU TOOLBAR

### Wzorzec wizualny
Toolbar ma wyglądać i działać jak PDF.js Express — intuicyjnie, profesjonalnie, przejrzyście.
Implementacja na **Shoelace** (MIT) — własny kod, własne ikony, własny CSS.

### Legalność
Kopiowanie koncepcji UI (układ przycisków, flow) jest legalne.
Zakazane: kopiowanie kodu, grafik i ikon z PDF.js Express (własność PDFTron).
Własne ikony (np. z biblioteki Lucide — MIT) + własny CSS = brak naruszenia praw autorskich.

### Wymagania UI
- Toolbar poziomy na górze, czytelny
- Narzędzia adnotacji: pinezka, prostokąt, rysunek, textbox, zaznaczenie tekstu
- Zoom: przyciski +/-, dropdown z wartościami (100%, 133%, 150%, 200%)
- Nawigacja stron: poprzednia/następna + pole z numerem strony
- Przycisk fullscreen
- Przycisk ukryj/pokaż panel komentarzy (CC)
- Tooltips na każdym przycisku
- Responsywny — działa w normalnym i fullscreen mode
# Plan migracji — kroki na serwerze
## PDF Annotator: stary stack → PDF.js + Konva.js + Shoelace

---

## ZASADA NADRZĘDNA
- Nowe pliki trafiają TYLKO do `/var/www/html/moodle/mod/pdfannotator/`
- Kod Moodle (poza tym katalogiem) — nienaruszony
- W każdym momencie rollback do v97 przez 4 pliki cp

---

## FAZA 0 — PRZYGOTOWANIE ŚRODOWISKA

### K0.1 — Weryfikacja stanu wyjściowego
```bash
md5sum /var/www/html/moodle/mod/pdfannotator/shared/index.js
md5sum ~/trinity_lab_backup/v97_FS_overlay_fixed_clickability_OK/shared/index.js
```
Oba md5 muszą być zgodne.

### K0.2 — Instalacja Node.js na serwerze (do budowania bundle)
```bash
node --version
npm --version
```
Jeśli brak: `apt install nodejs npm`

### K0.3 — Katalogi dla nowych plików
```bash
mkdir -p /var/www/html/moodle/mod/pdfannotator/lib/pdfjs
mkdir -p /var/www/html/moodle/mod/pdfannotator/lib/konva
mkdir -p /var/www/html/moodle/mod/pdfannotator/lib/shoelace
mkdir -p /var/www/html/moodle/mod/pdfannotator/js_new
```

### K0.4 — Pobranie bibliotek (standalone bundle, bez npm w Moodle)
```bash
cd /tmp
npm install pdfjs-dist konva @shoelace-style/shoelace

# PDF.js
cp node_modules/pdfjs-dist/build/pdf.min.js \
   /var/www/html/moodle/mod/pdfannotator/lib/pdfjs/
cp node_modules/pdfjs-dist/build/pdf.worker.min.js \
   /var/www/html/moodle/mod/pdfannotator/lib/pdfjs/

# Konva
cp node_modules/konva/konva.min.js \
   /var/www/html/moodle/mod/pdfannotator/lib/konva/

# Shoelace (CSS + komponenty)
cp -r node_modules/@shoelace-style/shoelace/dist \
   /var/www/html/moodle/mod/pdfannotator/lib/shoelace/
```

### K0.5 — Backup v97 potwierdzony, backup "przed migracją"
```bash
# v97 już istnieje — to jest punkt powrotu
ls ~/trinity_lab_backup/v97_FS_overlay_fixed_clickability_OK/
```

---

## FAZA 1 — NOWY VIEWER (równolegle ze starym)

### Strategia: NOWA strona testowa, stary view.php nienaruszony

Tworzymy `view_new.php` — osobna strona testowa pluginu.
Stary `view.php` — bez zmian przez całą migrację.
Przełączenie następuje dopiero w FAZIE 5, gdy nowy viewer jest kompletny.

### K1.1 — Skopiuj view.php jako bazę
```bash
cp /var/www/html/moodle/mod/pdfannotator/view.php \
   /var/www/html/moodle/mod/pdfannotator/view_new.php
```

### K1.2 — W view_new.php: zamień ładowanie JS
Usuń linię ładującą stary `shared/index.js`.
Dodaj nowe pliki (Cursor pisze kod, serwer tylko odbiera):
```php
// Nowe biblioteki
$PAGE->requires->js('/mod/pdfannotator/lib/pdfjs/pdf.min.js', false);
$PAGE->requires->js('/mod/pdfannotator/lib/konva/konva.min.js', false);
// Nowy główny plik
$PAGE->requires->js('/mod/pdfannotator/js_new/pdfannotator_new.js', false);
```

### K1.3 — Utwórz pusty plik główny
```bash
touch /var/www/html/moodle/mod/pdfannotator/js_new/pdfannotator_new.js
```
Cursor będzie wypełniał ten plik iteracyjnie.

---

## FAZA 2 — RENDEROWANIE PDF (Cursor pisze, serwer uruchamia)

### K2.1 — Wdrożenie każdej iteracji kodu z Cursora
```bash
php /var/www/html/moodle/admin/cli/maintenance.php --enable

# Skopiuj plik z Cursora na serwer (scp lub wklej przez edytor)
scp pdfannotator_new.js root@serwer:/var/www/html/moodle/mod/pdfannotator/js_new/

php /var/www/html/moodle/admin/cli/purge_caches.php
php /var/www/html/moodle/admin/cli/maintenance.php --disable
```

### K2.2 — Weryfikacja renderowania
Otwórz `view_new.php` w przeglądarce.
Sprawdź: PDF się wyświetla, scroll działa, zoom działa.

### K2.3 — Backup po działającym renderowaniu
```bash
mkdir -p ~/trinity_lab_backup/v98_new_viewer_pdf_renders/js_new
cp /var/www/html/moodle/mod/pdfannotator/js_new/pdfannotator_new.js \
   ~/trinity_lab_backup/v98_new_viewer_pdf_renders/js_new/
cp /var/www/html/moodle/mod/pdfannotator/view_new.php \
   ~/trinity_lab_backup/v98_new_viewer_pdf_renders/
```

---

## FAZA 3 — WARSTWA ADNOTACJI (iteracyjnie)

Każdy typ adnotacji = osobny krok = osobny backup.

### K3.1 — Konva layer nad PDF canvas
Cursor pisze kod, serwer wdraża tak samo jak K2.1.
Weryfikacja: warstwa Konva widoczna, nie zasłania PDF.

### K3.2 — Odczyt adnotacji z API PHP
```
GET /mod/pdfannotator/pdfannotator_ajax.php?action=getAnnotations&...
```
Istniejące API — bez zmian w PHP.
Cursor pisze fetch(), serwer wdraża.

### K3.3 — Wyświetlenie adnotacji (każdy typ)
Kolejność implementacji:
1. `point` (pinezka) — najprostszy
2. `area` (prostokąt)
3. `textbox`
4. `drawing` (rysunek odręczny)
5. `text` / `highlight` / `strikeout`

Po każdym: backup vXX_new_viewer_{typ}_display_ok

### K3.4 — Hit-testing i zaznaczanie
Konva obsługuje natywnie — Cursor konfiguruje `hitStrokeWidth`.
Weryfikacja: kliknięcie w każdy typ adnotacji → zaznaczenie.

### K3.5 — Overlay edycji (ramka + X)
Konva `Transformer` lub custom rect.
Weryfikacja: ramka dokładnie obejmuje adnotację we wszystkich zoomach.

### K3.6 — Drag adnotacji
Konva `draggable: true`.
Weryfikacja: drag działa, pozycja zapisuje się poprawnie.

---

## FAZA 4 — ZAPIS I TOOLBAR

### K4.1 — Zapis przez istniejące API PHP
```
POST /mod/pdfannotator/pdfannotator_ajax.php
action=saveAnnotation / deleteAnnotation / updateAnnotation
```
Cursor pisze logikę zapisu, format JSON musi być identyczny z obecnym.
Weryfikacja: adnotacja zapisana przez nowy viewer widoczna w starym (view.php).

### K4.2 — Toolbar (Shoelace)
Cursor pisze HTML + JS toolbar.
Na serwerze: dodaj do `view_new.php` ładowanie Shoelace CSS:
```php
$PAGE->requires->css('/mod/pdfannotator/lib/shoelace/dist/themes/light.css');
```
Elementy toolbar: zoom, nawigacja stron, narzędzia, fullscreen, CC.

### K4.3 — Panel komentarzy
Istniejący HTML panel (prawy panel) — zachowany bez zmian.
Cursor podpina eventy otwarcia/zamknięcia do nowych kliknięć adnotacji.

---

## FAZA 5 — FULLSCREEN I INTEGRACJA

### K5.1 — Fullscreen
`fullscreen_enhanced.js` — sprawdź czy działa z nowym viewerem.
Jeśli nie: Cursor przepisuje, serwer wdraża.

### K5.2 — Testy kompletne (przed przełączeniem)
Na `view_new.php`:
- Chrome normal/FS: wszystkie typy adnotacji
- FF normal/FS: wszystkie typy adnotacji
- Zoom 100/133/150/200%
- Drag, zapis, usuwanie
- Panel komentarzy

---

## FAZA 6 — PRZEŁĄCZENIE (dopiero gdy wszystko OK)

### K6.1 — Backup stanu przed przełączeniem
```bash
mkdir -p ~/trinity_lab_backup/v_FINAL_before_switch/shared
cp /var/www/html/moodle/mod/pdfannotator/view.php \
   ~/trinity_lab_backup/v_FINAL_before_switch/
cp /var/www/html/moodle/mod/pdfannotator/shared/index.js \
   ~/trinity_lab_backup/v_FINAL_before_switch/shared/
# ... reszta plików
```

### K6.2 — Podmiana view.php
```bash
php /var/www/html/moodle/admin/cli/maintenance.php --enable

cp /var/www/html/moodle/mod/pdfannotator/view_new.php \
   /var/www/html/moodle/mod/pdfannotator/view.php

php /var/www/html/moodle/admin/cli/purge_caches.php
php /var/www/html/moodle/admin/cli/maintenance.php --disable
```

### K6.3 — Weryfikacja produkcyjna
Pełny smoke test na produkcji.
Stary `shared/index.js` zostaje na serwerze (nie usuwamy) — na wypadek rollbacku.

---

## ROLLBACK W KAŻDEJ CHWILI

```bash
php /var/www/html/moodle/admin/cli/maintenance.php --enable

cp ~/trinity_lab_backup/v97_FS_overlay_fixed_clickability_OK/view.php \
   /var/www/html/moodle/mod/pdfannotator/
cp ~/trinity_lab_backup/v97_FS_overlay_fixed_clickability_OK/shared/index.js \
   /var/www/html/moodle/mod/pdfannotator/shared/
cp ~/trinity_lab_backup/v97_FS_overlay_fixed_clickability_OK/fullscreen_enhanced.js \
   /var/www/html/moodle/mod/pdfannotator/
cp ~/trinity_lab_backup/v97_FS_overlay_fixed_clickability_OK/styles.css \
   /var/www/html/moodle/mod/pdfannotator/

php /var/www/html/moodle/admin/cli/purge_caches.php
php /var/www/html/moodle/admin/cli/maintenance.php --disable
```
Nowe pliki (`js_new/`, `lib/`, `view_new.php`) nie kolidują ze starym kodem — można je zostawić lub usunąć.

---

## PRZEPŁYW PRACY Z CURSOREM

```
Cursor edytuje plik bezpośrednio na serwerze → maintenance on → purge cache → maintenance off → test w przeglądarce → backup jeśli OK
```

Cursor ma dostęp SSH/root do serwera produkcyjnego — może edytować pliki bezpośrednio.

### Zasady dla Cursora
1. Cursor **może** edytować pliki w `/var/www/html/moodle/mod/pdfannotator/`
2. Cursor **nie może** dotykać żadnych innych katalogów Moodle
3. Cursor **zawsze** włącza maintenance przed zmianą i wyłącza po
4. Cursor **zawsze** robi purge cache po zmianie
5. Backup przed większą zmianą robi **człowiek** — nie Cursor — żeby punkt przywrócenia był świadomy i opisany
6. Cursor **nie usuwa** starych plików (`shared/index.js`, `fullscreen_enhanced.js`) aż do Fazy 6

---

## WORKFLOW PRACY (Claude.ai + Cursor)

Brak bezpośredniej integracji Claude API w Cursorze — praca hybrydowa:

1. **Claude.ai** (przeglądarka) — generowanie kodu, bashów, planów, analizy
2. **Cursor** — kopiowanie kodu z Claude.ai, wdrożenie na serwer przez SSH root

```
Claude.ai → kopiuj kod/bash → Cursor → serwer produkcyjny
```

Cursor ma uprawnienia root na serwerze — może edytować pliki bezpośrednio.
Claude.ai nie ma dostępu do serwera — tylko generuje, nie wdraża.
