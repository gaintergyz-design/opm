#!/bin/zsh
# One Page Market 全系列一鍵構建
#   The Close（每日）+ On Deck / Winners & Losers / Earnings Week / Week Ahead
# 用法：./build.sh [YYYY-MM-DD]
set -e
BASE="$(cd "$(dirname "$0")" && pwd)"
cd "$BASE"
PY=/Users/gyz-igyz-imacmac/.workbuddy/binaries/python/envs/default/bin/python
NODE=$(ls -d /Users/gyz-igyz-imacmac/.workbuddy/binaries/node/versions/*/bin/node 2>/dev/null | sort -V | tail -1)
NP=/Users/gyz-igyz-imacmac/.workbuddy/binaries/node/workspace/node_modules

echo "== The Close =="
PYTHONUNBUFFERED=1 "$PY" -u scripts/fetch_close.py ${1:+--session "$1"}
NODE_PATH=$NP "$NODE" scripts/build_close.js

echo "== Four pages =="
PYTHONUNBUFFERED=1 "$PY" -u scripts/fetch_pages.py ${1:+--week-start "$1"}
NODE_PATH=$NP "$NODE" scripts/build_pages.js

echo "DONE: $BASE/out/"
ls -t "$BASE/out"/*.png | head -8
