Wdrożenie Textbox UX – staging
==============================

Zawartość:
- textbox-ux.patch       – unified diff (referencyjnie; do aplikacji używaj apply_textbox_ux.py)
- apply_textbox_ux.py    – skrypt Pythona aplikujący zmiany (dokładne replace w JS i CSS)
- apply-textbox-ux.sh    – skrypt bash: maintenance + Python + wyłączenie maintenance
- README.txt             – ten plik

Użycie:
1. Z katalogu głównego Moodle uruchom (gdy chcesz wdrożyć):
   bash mod/pdfannotator/_staging/apply-textbox-ux.sh

2. Skrypt wywołuje edit-with-maintenance.sh --cmd 'python3 mod/pdfannotator/_staging/apply_textbox_ux.py',
   potem zawsze: php admin/cli/maintenance.php --disable.

3. Opcjonalnie test suchy (bez zapisu): python3 mod/pdfannotator/_staging/apply_textbox_ux.py
   – jeśli któryś fragment nie zostanie znaleziony, skrypt wypisze ostrzeżenie i nie nadpisze pliku
   (obecna wersja skryptu nadpisuje; przy błędzie sprawdź dopasowanie stringów).

Po wdrożeniu: testy REGRES/SMOKE (textbox: klik → pisz → zapisz, kursor I-beam, przezroczystość).
