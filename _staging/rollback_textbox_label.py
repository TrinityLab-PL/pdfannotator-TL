#!/usr/bin/env python3
"""Rollback helper for textbox label changes.

Usage:
  python3 rollback_textbox_label.py --restore <snapshot_dir>

Snapshot dir must contain:
  - styles.css
  - pdfannotator_new.v00054.js
"""

from pathlib import Path
import argparse
import shutil

MOODLE_ROOT = Path('/var/www/html/moodle')
PLUGIN = MOODLE_ROOT / 'mod/pdfannotator'
CSS = PLUGIN / 'styles.css'
JS  = PLUGIN / 'js_new/pdfannotator_new.v00054.js'

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--restore', required=True)
    args = ap.parse_args()
    snap = Path(args.restore)
    shutil.copy2(snap / 'styles.css', CSS)
    shutil.copy2(snap / 'pdfannotator_new.v00054.js', JS)
    print('OK')

if __name__ == '__main__':
    main()
