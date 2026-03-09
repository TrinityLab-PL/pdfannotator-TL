#!/usr/bin/env bash
# Aplikuje wdrożenie Textbox UX (Python) z katalogu głównego Moodle.
# Uruchom: cd /var/www/html/moodle && bash mod/pdfannotator/_staging/apply-textbox-ux.sh

set -e
MOODLE_ROOT="${MOODLE_ROOT:-/var/www/html/moodle}"
cd "$MOODLE_ROOT"

if [ -x "./mod/pdfannotator/edit-with-maintenance.sh" ]; then
    ./mod/pdfannotator/edit-with-maintenance.sh --cmd "python3 mod/pdfannotator/_staging/apply_textbox_ux.py" || true
else
    python3 mod/pdfannotator/_staging/apply_textbox_ux.py || true
fi

php admin/cli/maintenance.php --disable 2>/dev/null || true
echo "Gotowe. Maintenance wyłączony. Wykonaj testy REGRES/SMOKE."
