# Zasady pracy – PDF Annotator (Moodle)

**Zakres stosowania:** Ten dokument dotyczy wyłącznie projektu **PDF Annotator** (plugin Moodle `mod/pdfannotator`). Zasad tych nie stosować automatycznie w innych workspace’ach ani projektach.

---

## 1. Cel dokumentu

- Jedno miejsce z zasadami pracy przy tym projekcie.
- Minimalizacja tokenów: AI i człowiek odwołują się do tego pliku zamiast do wielu źródeł.

---

## 2. Zakres zmian

- Nie zmieniać kodu poza pluginem `mod/pdfannotator/`.
- Pliki objęte workflow: `shared/index.js` (chroniony), opcjonalnie `view.php`, `styles.css`, `fullscreen_enhanced.js` – w zależności od skryptu i backupu.
- **Tylko to, o co poproszono:** realizować wyłącznie elementy wyraźnie opisane w poleceniu użytkownika. Bez dodawania „ulepszeń”, domyślnych interpretacji ani zmian w parametrach, których użytkownik nie wymienił. Przykład: jeśli podano nową wartość paddingu w jednym wymiarze lub ogólnie „ciaśniejszy pion”, należy zachować istniejący padding poziomy (np. `12px`), o ile użytkownik go nie zmienił — skrót `padding: 0.17em` dla wszystkich boków **nie jest** równoważny „zmniejsz tylko pion”.

---

## 3. Edycja kodu (jak się robi zmiany – bash/skrypt)

## 3.1 Jeden bash na jeden prompt

- **Jeden prompt użytkownika** = **jedna odpowiedź** z **jednym bashem** (jednym wywołaniem `edit-with-maintenance.sh`).
- Wszystkie zmiany kodu wynikające z tego promptu muszą być zawarte w tym jednym wywołaniu (np. łańcuch poleceń w jednym `--cmd`, lub jeden skrypt w heredoc).
- Niedopuszczalne jest wielokrotne włączanie i wyłączanie trybu konserwacji w ramach jednego przejścia — użytkownicy nie mogą wielokrotnie widzieć niedostępnego serwera.
- Po wykonaniu tego jednego bashu asystent może podać użytkownikowi **kroki smoke testów** (instrukcje do ręcznego sprawdzenia); nie jest to kolejna zmiana kodu ani kolejne wywołanie skryptu.
- Od momentu, gdy użytkownik nakazuje „wdrożenie”, asystent wykonuje pracę w całości samodzielnie: nie pokazuje okienek do zatwierdzania i nie wymaga kliknięcia „Run” ani „akceptacji” po stronie użytkownika. SMOKE na końcu ma mieć charakter informacyjny (bez przerywania procesu w trakcie wdrożenia).


- **Edycja plików w `mod/pdfannotator/` (w tym chronionego pliku): wyłącznie przez skrypt.**  
  Skrypt: `mod/pdfannotator/edit-with-maintenance.sh`, uruchamiany z katalogu głównego Moodle (np. `/var/www/html/moodle`).
- **Wyjątek (bez maintenance):** pliki pomocnicze w katalogu pluginu, które **nie są używane w runtime** przez Moodle / PDF Annotator, np. logi, notatki, dokumentacja techniczna: `*.log`, `*.txt`, `*.md`.  
  - Te pliki można edytować bez trybu maintenance i bez `edit-with-maintenance.sh` (np. zwykłą edycją w Cursorrze).  
  - Nie wolno jednak do tego wyjątku zaliczać plików `.php`, `.js`, `.css`, plików językowych, konfiguracyjnych ani żadnych innych, które są ładowane przez Moodle lub front-end pluginu.
- **Zabronione:** StrReplace, Write, EditNotebook do plików w `mod/pdfannotator/` poza powyższym wyjątkiem dla czysto pomocniczych plików `*.log` / `*.txt` / `*.md`.
- **Dozwolone wyłącznie:**
  - Restore z backupu: `./mod/pdfannotator/edit-with-maintenance.sh --restore`
  - Dowolna edycja: `./mod/pdfannotator/edit-with-maintenance.sh --cmd '...'` (np. `sed`, `python3 << EOF ... EOF`).
- Skrypt sam wykonuje: maintenance on → odblokowanie pliku → polecenie → purge cache → maintenance off → blokada pliku.
- Opcjonalnie: `--lock` / `--unlock` (np. `sudo ... --lock` ustawia plik na 444).
- Jedna zmiana = jeden blok (maintenance + zmiana + purge w jednym wywołaniu skryptu). Rollback tylko przez jeden `--restore`.

### 3.2 Bezpieczeństwo trybu konserwacji (MUST)

- Skrypt `edit-with-maintenance.sh` **może zostawić Moodle w trybie konserwacji**, jeśli komenda w `--cmd` zakończy się błędem (exit != 0). **ABSOLUTNY ZAKAZ** kończenia promptu, gdy serwer mógł pozostać w maintenance.
- **Każde** wywołanie skryptu z `--cmd` musi być w bashu z **wymuszonym wyjściem z maintenance na końcu**:
  ```bash
  cd /var/www/html/moodle && \
    ./mod/pdfannotator/edit-with-maintenance.sh --cmd '...' || true; \
    php admin/cli/maintenance.php --disable
  ```
  (`|| true` tylko po to, żeby przy błędzie w `--cmd` bash nie zatrzymał się przed `maintenance.php --disable`; błąd skryptu = zmiany w stanie niepewnym, raportować użytkownikowi).
- Czas trwania maintenance (od `--enable` do `--disable`) ma być minimalny; docelowo **≤ 1–1,5 s**. Cały kod zmiany (sed/patch/python) musi być przygotowany i sprawdzony **przed** wywołaniem `edit-with-maintenance.sh` – wewnątrz maintenance wykonujemy tylko gotowy, krótki patch.
- W odpowiedzi **zawsze** raportować: czy skrypt zakończył się sukcesem (exit 0) czy błędem; że wykonano `php admin/cli/maintenance.php --disable`; **nie kończyć promptu** bez pewności, że maintenance jest wyłączony.

---

## 4. Backup

- Po każdej udanej zmianie: pełny backup wszystkich plików, które mogły być zmieniane (w katalogu pluginu oraz np. `~/trinity_lab_backup/` / `/root/trinity_lab_backup/`) z nazwą wersji (np. `vXX_opis`). Użytkownikowi można podać gotowy bash do wykonania kopii.
- W skrypcie `edit-with-maintenance.sh` ścieżka backupu do restore jest stała (np. `v85_Rectangle_clickable_area_3px_centered`).
- **Nie wolno przywracać starszych backupów bez zgody użytkownika** — przywracać wyłącznie najnowszy backup lub wersję wskazaną przez użytkownika.
- Po backupie: diff do weryfikacji.

### 4.0 Stała procedura backupu (MUST)

- **Zawsze dwa poziomy backupu:**
  1. **Lokalny snapshot w pluginie** – pełna kopia `mod/pdfannotator` w `mod/pdfannotator/_backups/vXX_opis_TIMESTAMP/…`, wykonana przez `edit-with-maintenance.sh --cmd '...'` (np. `tar` lub `cp` do `_backups`). Ten snapshot musi być widoczny z konta użytkownika (np. `piotrad`).
  2. **Kopia dla roota** – po utworzeniu lokalnego snapshotu asystent **zawsze** podaje gotowe polecenie bash, które z konta `root` kopiuje **właśnie ten** snapshot z `_backups` do `/root/trinity_lab_backup/`.
     - Asystent **nie wykonuje** tej kopii automatycznie — to ma wykonać użytkownik (po prostu skopiujesz/wkleisz podaną komendę).
- **Asystent nigdy nie robi tylko backupu „na root‑cie” z pominięciem `_backups`.** Zawsze najpierw snapshot w `_backups`, potem bash do skopiowania go na konto `root`.

### 4.1 Wszystko gotowe – zero kroków ręcznych (MUST)

- **Użytkownik ma mieć wszystko gotowe** – żadnych list poleceń do ręcznego wpisywania, żadnych skryptów z COPY_BACKUP_SOURCE ani ścieżek do skryptu.
- Backup tworzyć w ścieżce **zapisywalnej bez sudo** (np. `$HOME/trinity_lab_backup/` lub `mod/pdfannotator/_backups/`).
- **Zawsze** dołączyć **jeden bash** do skopiowania backupu do `/root/trinity_lab_backup/` – w **tej samej strukturze** za każdym razem, z **tylko nazwą backupu** zmienioną na aktualną (np. `v106_opis_YYYYMMDD_HHMMSS`). Forma:

  ```bash
  sudo mkdir -p /root/trinity_lab_backup && \
  sudo cp -a /home/piotrad/trinity_lab_backup/NAZWA_BACKUPU /root/trinity_lab_backup/ && \
  sudo chown -R root:root /root/trinity_lab_backup/NAZWA_BACKUPU && \
  echo "OK"
  ```

  (W odpowiedzi wstawić rzeczywistą nazwę katalogu backupu zamiast `NAZWA_BACKUPU`.)

### 4.2 Tryb "backup bez angażowania użytkownika" (MUST)

- Gdy użytkownik prosi o `pełny backup` / `full snapshot`:
  1. Asystent wykonuje całość **samodzielnie** (bez pytań, bez prośby o kliknięcie `Run`).
  2. Asystent używa **jednego krótkiego wywołania** `edit-with-maintenance.sh --cmd '...'` do utworzenia snapshotu w `_backups`.
  3. Po wywołaniu zawsze wymusza `php admin/cli/maintenance.php --disable` w tym samym bashu.
  4. Asystent **nie kopiuje sam** do `/root/trinity_lab_backup`; podaje tylko gotowy bash dla użytkownika.
- Jeśli narzędzie terminalowe zwróci `failed to spawn: Aborted`:
  - asystent wykonuje automatyczny retry (do skutku w bieżącym promptcie, bez angażowania użytkownika),
  - retry ma używać prostszego, krótszego wariantu komendy (bez rozbudowanej logiki w jednej linii),
  - użytkownik dostaje dopiero wynik końcowy.
- Odpowiedź po backupie ma być krótka i zawsze zawierać:
  - nazwę snapshotu `vXX_opis_TIMESTAMP`,
  - informację o statusie maintenance,
  - gotowy bash do kopiowania snapshotu do `/root/trinity_lab_backup`.

---

## 5. Testy przed i po (bramka)

- Przed zmianą: SANITY, SYNTAX, REGRES, SMOKE. Raport: `SANITY: OK/FAIL`, `SYNTAX: OK/FAIL`, `REGRES: OK/FAIL`, `SMOKE: OK/FAIL`.
- **SANITY (CLI), snapshot referencyjny v120:**  
  `cd /var/www/html/moodle && test -f mod/pdfannotator/shared/index.js && test -f mod/pdfannotator/edit-with-maintenance.sh && test -f mod/pdfannotator/_backups/v120_fullscreen_default_better_20260316_035812/mod/pdfannotator/shared/index.js` — kod wyjścia 0.
- **SYNTAX (CLI):**  
  PHP: `php -l mod/pdfannotator/view.php && php -l mod/pdfannotator/lib.php`.  
  JS: `node --check /var/www/html/moodle/mod/pdfannotator/shared/index.js` (jeśli brak node: SYNTAX: SKIPPED).
- **REGRES (ręcznie):** typy adnotacji (point, area, textbox, text), różne zoomy (np. 100%, 133%, 150%, 200%), tryb normalny i fullscreen; tworzenie, przeciąganie, zapis, odświeżenie — zgodność pozycji, brak niepożądanego przesunięcia.
- **SMOKE (ręcznie):** otwarcie PDF, ewentualnie czyszczenie cache przeglądarki i twarde odświeżenie, potem zwykłe F5 — brak błędów blokujących flow. Po wdrożeniu asystent nie prosi o „Run” ani akceptację; jeśli potrzebna jest odpowiedź zwrotna, ma to być wyłącznie krótkie „działa/nie działa”.
- Jeśli którykolwiek test ma FAIL — nie modyfikować kodu; najpierw naprawa.

---

## 6. Które pliki analizować

- **Do każdej zmiany:** tylko pliki faktycznie zmieniane (zazwyczaj `shared/index.js`, ewentualnie `view.php`, `lib.php`, `styles.css`, `fullscreen_enhanced.js`).
- **Syntax:** zawsze `view.php`, `lib.php`; dla JS — `shared/index.js` oraz inne zmieniane pliki .js.
- **Główny kod adnotacji/UI:** `mod/pdfannotator/shared/index.js` (duży plik) — analizować fragmenty (SemanticSearch, Grep, Read z limitem), nie cały plik.
- **Wejście PHP:** `view.php`, `lib.php`, `classes/output/index.php` — gdy zmiana dotyczy renderowania lub API.
- Unikać: czytania dużych plików w całości bez potrzeby; preferować wyszukiwanie po symbolu/funkcji i czytanie wycinków.

---

## 7. Minimalizacja tokenów

- Odwoływać się do tego jednego pliku zamiast do wielu (workflow, Zasady, SUPERPROMPT).
- Przed analizą: precyzyjne zapytania (SemanticSearch, Grep) zamiast „przeczytaj cały plik”.
- Instrukcje dla użytkownika: poza blokami kodu; w blokach kodu — tylko kod do skopiowania.
- Krótkie odpowiedzi; ewentualna numeracja zadań (Z1, Z2, …) dla jednoznaczności.
- Jedno zadanie na raz; po wcześniejszej zgodzie użytkownika na dany typ zmian retry wykonuj automatycznie (bez dodatkowej komendy "retry"), o ile mieści się to w pozostałych zasadach tego dokumentu.
- **Nie wymagaj komendy "dalej"** do kontynuacji, jeśli kolejny krok **nie jest rollbackiem**, **nie dotyka core Moodle**, i jest to **niski-risk hotfix/diagnostyka** w obrębie pluginu (bez ryzyka wyłączenia całego serwisu).

---

## 8. Styl komunikacji (dla AI)

- Krótko, bez gadulstwa; nie łączyć instrukcji z kodem w jednym bloku.
- Zakładany odbiorca: nie programista, ale nie zupełny nowicjusz.
- Unikać przesadnych pochwał; zamiast długich opisów — „problem w X / zmiana w Y”.

---

## 9. Zabronione

- **Zostawienie Moodle w trybie konserwacji** po zakończeniu promptu (niezależnie od przyczyny błędu). Po każdym wywołaniu `edit-with-maintenance.sh` w tym samym bashu musi nastąpić `php admin/cli/maintenance.php --disable`.
- W ramach jednego promptu użytkownika: wielokrotne wywołania `edit-with-maintenance.sh` (więcej niż jedno włączenie trybu konserwacji).
- Edycja plików w `mod/pdfannotator/` narzędziami Cursora (StrReplace, Write, EditNotebook) **z wyjątkiem** czysto pomocniczych plików `*.log` / `*.txt` / `*.md`, które nie są używane w runtime przez plugin.
- Dzielenie rollbacku na dwa kroki (tylko jeden `--restore`).
- Wykonywanie zmiany, gdy jakikolwiek test ma FAIL.
- Wykonywanie zmiany w kodzie poza trybem maintenance (skrypt to zapewnia) – nie dotyczy zmian w pomocniczych plikach `*.log` / `*.txt` / `*.md`, które nie są ładowane przez Moodle / front‑end pluginu.

---

## 10. Linki

- Kod źródłowy: <https://github.com/rwthmoodle/moodle-mod_pdfannotator>
- Fork: <https://github.com/Piotr-Fr/moodle-mod_pdfannotator_TL>
- Backup AI w pluginie: `/_ai_backup_TL` (jeśli używane).
