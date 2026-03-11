#!/usr/bin/env python3
"""
Apply or restore unified toolbar tooltips (same style as Drawing, 700 ms delay).
Usage:
  python3 unified_tooltips.py [--apply]   # backup + apply
  python3 unified_tooltips.py --restore    # restore from backup
Run from mod/pdfannotator (or set PDFANNOTATOR_ROOT). JS file: js_new/pdfannotator_new.v00054.js
"""
import os
import sys
import argparse

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MOD_DIR = os.path.abspath(os.path.dirname(SCRIPT_DIR))
JS_PATH = os.path.join(MOD_DIR, 'js_new', 'pdfannotator_new.v00054.js')
BACKUP_PATH = JS_PATH + '.tooltip_rollback'

# Same styling as Drawing: single line = title with 1em/400/center
UNIFIED_IIFE = r'''
        (function () {
            var sharedTip = document.createElement('div');
            sharedTip.className = 'tl-toolbar-tooltip';
            sharedTip.innerHTML = '<div style="text-align:center;font-size:1em;font-weight:400"></div>';
            sharedTip.style.cssText = 'display:none;position:fixed;z-index:9999;background:#333;color:#fff;padding:6px 10px;border-radius:4px;white-space:normal;pointer-events:none;font-family:"Open Sans",Arial,sans-serif;';
            document.body.appendChild(sharedTip);
            var showTimer;
            var TOOLTIP_DELAY = 700;
            shell.querySelectorAll('[title]').forEach(function (el) {
                if (!el.getAttribute('title') || el.getAttribute('title') === '') return;
                if (el.getAttribute('data-proxy-tool') === 'drawing') return;
                var text = el.getAttribute('title');
                el.setAttribute('title', '');
                el.addEventListener('mouseenter', function () {
                    if (showTimer) clearTimeout(showTimer);
                    showTimer = setTimeout(function () {
                        showTimer = null;
                        sharedTip.firstChild.textContent = text;
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
'''


def apply(content: str) -> str:
    # 1) Drawing delay 200 -> 700
    if 'DRAWING_TOOLTIP_DELAY = 200' not in content:
        if 'DRAWING_TOOLTIP_DELAY = 700' in content:
            pass  # already applied
        else:
            raise SystemExit('ERR: DRAWING_TOOLTIP_DELAY not found')
    else:
        content = content.replace('DRAWING_TOOLTIP_DELAY = 200', 'DRAWING_TOOLTIP_DELAY = 700', 1)

    # 2) Insert unified tooltips IIFE after Drawing IIFE (only if not already present)
    marker = "        })();\n\n        shell.querySelector('[data-proxy-action=\"zoom-in\"]')"
    if 'tl-toolbar-tooltip' in content:
        return content  # already applied
    if marker not in content:
        raise SystemExit('ERR: insertion marker not found')
    content = content.replace(
        marker,
        "        })();\n" + UNIFIED_IIFE + "\n        shell.querySelector('[data-proxy-action=\"zoom-in\"]')",
        1,
    )
    return content


def main():
    ap = argparse.ArgumentParser(description='Unified toolbar tooltips apply/restore')
    ap.add_argument('--apply', action='store_true', help='Backup and apply patches')
    ap.add_argument('--restore', action='store_true', help='Restore JS from backup')
    args = ap.parse_args()

    if not os.path.isfile(JS_PATH):
        sys.exit('ERR: JS file not found: ' + JS_PATH)

    if args.restore:
        if not os.path.isfile(BACKUP_PATH):
            sys.exit('ERR: No backup found: ' + BACKUP_PATH)
        with open(BACKUP_PATH, 'r', encoding='utf-8') as f:
            data = f.read()
        with open(JS_PATH, 'w', encoding='utf-8') as f:
            f.write(data)
        print('Restored from', BACKUP_PATH)
        return

    # --apply or default
    with open(JS_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    # Backup before apply
    with open(BACKUP_PATH, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Backup:', BACKUP_PATH)

    content = apply(content)
    with open(JS_PATH, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Applied unified tooltips (700 ms, same style as Drawing). Rollback: python3 unified_tooltips.py --restore')


if __name__ == '__main__':
    main()
