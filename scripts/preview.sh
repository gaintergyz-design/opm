#!/usr/bin/env bash
# 調排版專用：不抓數據、不碰 X、不 git push，直接重渲現有 data/*.json → out/_preview/ 並開圖
#
#   bash scripts/preview.sh                # 四頁全渲（On Deck / Winners / Earnings / Week Ahead）
#   bash scripts/preview.sh ondeck         # 只渲 On Deck
#   bash scripts/preview.sh winners        # 只渲 Winners & Losers
#   bash scripts/preview.sh earnings       # 只渲 Earnings Week
#   bash scripts/preview.sh weekahead      # 只渲 Week Ahead
#   bash scripts/preview.sh close          # 重渲 The Close
#   bash scripts/preview.sh close --no-open
set -euo pipefail
cd "$(dirname "$0")/.."

PAGE_ALIAS=""
OPEN_IT=1
for arg in "$@"; do
  case "$arg" in
    --no-open) OPEN_IT=0 ;;
    on-deck|ondeck)     PAGE_ALIAS="on-deck" ;;
    winners|winners-losers) PAGE_ALIAS="winners-losers" ;;
    earnings|earnings-week) PAGE_ALIAS="earnings-week" ;;
    week|weekahead|week-ahead) PAGE_ALIAS="week-ahead" ;;
    close|theclose|the-close) PAGE_ALIAS="close" ;;
    *) echo "未知參數：$arg"; exit 1 ;;
  esac
done

NODE="${NODE:-$(command -v node || echo /Users/gyz-igyz-imacmac/.workbuddy/binaries/node/versions/22.22.2-6/bin/node)}"
export NODE_PATH="${NODE_PATH:-$(pwd)/node_modules}"
export PREVIEW=1

if [ "$PAGE_ALIAS" = "close" ]; then
  [ -f data/close.json ] || { echo "缺 data/close.json，先跑一次 fetch_close.py"; exit 1; }
  "$NODE" scripts/build_close.js
  TARGET=$(ls -t out/_preview/the-close-*.png | head -1)
else
  [ -f data/pages.json ] || { echo "缺 data/pages.json，先跑一次 fetch_pages.py"; exit 1; }
  PAGE="$PAGE_ALIAS" "$NODE" scripts/build_pages.js
  if [ -n "$PAGE_ALIAS" ]; then
    TARGET=$(ls -t out/_preview/"$PAGE_ALIAS"-*.png | head -1)
  else
    TARGET=$(ls -t out/_preview/*.png | head -1)
  fi
fi

echo "預覽圖：$TARGET"
if [ "$OPEN_IT" = "1" ]; then open "$TARGET"; fi
