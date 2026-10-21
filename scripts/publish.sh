#!/bin/bash
# onepagemarket 一鍵產圖+發帖（本地 / 雲端 CI 通用）
# 用法：
#   ./publish.sh ondeck   [--dry-run]   # 盤前 On Deck（ET 07:00 前後跑）
#   ./publish.sh theclose [--dry-run]   # 收盤 The Close（ET 16:15 後跑）
set -e
cd "$(dirname "$0")/.."

# 解譯器：環境變數優先 → PATH（雲端 CI）→ 本地固定路徑
PY="${PY:-$(command -v python3 || echo /Users/gyz-igyz-imacmac/.workbuddy/binaries/python/envs/default/bin/python)}"
NODE="${NODE:-$(command -v node || echo /Users/gyz-igyz-imacmac/.workbuddy/binaries/node/versions/22.22.2-6/bin/node)}"
export NODE_PATH="${NODE_PATH:-$(pwd)/node_modules}"

KIND="${1:-ondeck}"; shift || true

if [ "$KIND" = "theclose" ]; then
  "$PY" scripts/fetch_close.py "$@"
  "$NODE" scripts/build_close.js
  IMG=$(ls -t out/the-close-*.png | head -1)
else
  "$PY" scripts/fetch_pages.py
  "$NODE" scripts/build_pages.js
  IMG=$(ls -t out/on-deck-*.png | head -1)
fi

echo "IMAGE: $IMG"
# 先推手機/微信側（失敗不阻斷發帖）
"$PY" scripts/notify.py --image "$IMG" --text "${KIND} · $(date +%Y-%m-%d) · 新圖已生成" || true
# 發 X（未授權時自動跳過，不讓整條流水線失敗）
"$PY" scripts/post_x.py --image "$IMG" --type "$KIND" "$@" || echo "[post_x skipped]"
