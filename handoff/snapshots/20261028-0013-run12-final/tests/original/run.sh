#!/bin/sh
# Usage: ./run.sh logic|browser|layout|all     (tools are installed in /tmp/tools; this folder is synced there first)
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
mkdir -p /tmp/tools
[ -d /tmp/tools/node_modules ] || (cp "$HERE/package.json" /tmp/tools/ && cd /tmp/tools && npm install --no-audit --no-fund --silent)
rm -rf /tmp/tools/t && mkdir -p /tmp/tools/t && cp -r "$HERE"/logic "$HERE"/browser "$HERE"/harness.py /tmp/tools/t/
cd /tmp/tools/t
logic()  { python3 harness.py && for f in logic/*.test.mjs; do node "$f"; done; }
browser(){ node browser/build.mjs && for f in browser/e2e*.mjs; do node "$f"; done; }
layout() { node browser/build.mjs && node browser/layout_audit.mjs; }
case "${1:-all}" in logic) logic;; browser) browser;; layout) layout;; all) logic; browser; layout;; esac
