# Pełny backup snapshot pluginu – kursory ideal (v114)

Uruchomić **jako root** (np. `sudo bash -c "..."` lub po `sudo su`).

## Jedno polecenie (bash dla roota)

```bash
sudo bash -c 'V="v114_cursors_ideal"; T=$(date +%Y%m%d_%H%M%S); D="/root/trinity_lab_backup/${V}_${T}/mod"; mkdir -p "$D"; cp -a /var/www/html/moodle/mod/pdfannotator "$D/"; echo "Backup: $D/pdfannotator"; ls -la "$D/pdfannotator" | head -5'
```

- **Wersja / nazwa:** `v114_cursors_ideal`
- **Ścieżka snapshotu:** `/root/trinity_lab_backup/v114_cursors_ideal_YYYYMMDD_HHMMSS/mod/pdfannotator/`
- **Zawartość:** pełna kopia katalogu `mod/pdfannotator` (wszystkie pliki i podkatalogi).

Po wykonaniu w terminalu zobaczysz ścieżkę backupu i krótką listę zawartości.
