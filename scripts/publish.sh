#!/bin/bash
# onepagemarket 一鍵產圖+發帖（本地 / 雲端 CI 通用）
# 用法：
#   ./publish.sh ondeck    [--dry-run]   # 盤前 On Deck（每天 19:00 HKT）
#   ./publish.sh theclose  [--dry-run]   # 收盤 The Close（ET 16:15 後跑）
#   ./publish.sh winners   [--dry-run]   # Winners & Losers（週五收盤後，週六 HKT 早上跑）
#   ./publish.sh weekahead [--dry-run]   # Week Ahead（下週前瞻，週一 HKT 早上跑）
set -e
cd "$(dirname "$0")/.."

# 解譯器：環境變數優先 → PATH（雲端 CI）→ 本地固定路徑
PY="${PY:-$(command -v python3 || echo /Users/gyz-igyz-imacmac/.workbuddy/binaries/python/envs/default/bin/python)}"
NODE="${NODE:-$(command -v node || echo /Users/gyz-igyz-imacmac/.workbuddy/binaries/node/versions/22.22.2-6/bin/node)}"
export NODE_PATH="${NODE_PATH:-$(pwd)/node_modules}"

KIND="${1:-ondeck}"; shift || true
PAGE=""
TARGET="next"                      # weekahead 用「本週」（週一早上發），其餘用「下週」

case "$KIND" in
  ondeck)    PAGE="on-deck" ;;
  theclose)  PAGE="" ;;
  winners)   PAGE="winners-losers" ; TARGET="week" ;;
  weekahead) PAGE="week-ahead" ; TARGET="week" ;;
  *) echo "未知 kind：$KIND（ondeck | theclose | winners | weekahead）"; exit 1 ;;
esac

if [ "$KIND" = "theclose" ]; then
  "$PY" scripts/fetch_close.py "$@"
  # logo 緩存同步：缺的才抓（秒回），重建 data/logos.json（2026-10-26 起 runner 也執行）
  "$PY" scripts/fetch_logos.py || echo "    ⚠️ fetch_logos 失敗，沿用舊 logos.json"
  "$NODE" scripts/build_close.js
  IMG=$(ls -t out/the-close-*.png | head -1)
else
  "$PY" scripts/fetch_pages.py --target "$TARGET" "$@"
  # logo 緩存同步：缺的才抓（秒回），重建 data/logos.json
  "$PY" scripts/fetch_logos.py || echo "    ⚠️ fetch_logos 失敗，沿用舊 logos.json"
  # 圖檔日期統一用數據交易日；winners 用最近收盤日（週五），其餘用 On Deck session
  if [ "$KIND" = "winners" ]; then
    PAGES_STAMP=$("$PY" -c "import json;print(json.load(open('data/close.json'))['session'].replace('-',''))")
  else
    PAGES_STAMP=$("$PY" -c "import json;print(json.load(open('data/pages.json'))['ondeck']['session'].replace('-',''))")
  fi
  export PAGES_STAMP
  PAGE="$PAGE" "$NODE" scripts/build_pages.js
  IMG=$(ls -t "out/${PAGE}-"*.png | head -1)
fi

echo "IMAGE: $IMG"
# 記錄生成時刻（畫廊時間顯示用：mtime 會被 git 拉取重置、git 時間會被同位元組提交掩蓋）
"$PY" - "$IMG" <<'PY'
import json, os, sys, time
p = sys.argv[1]
f = 'out/gen-times.json'
m = json.load(open(f)) if os.path.exists(f) else {}
m[os.path.basename(p)] = int(time.time())
json.dump(m, open(f, 'w'), ensure_ascii=False, indent=0, sort_keys=True)
PY
# 推手機（可選，失敗不阻斷）
"$PY" scripts/notify.py --image "$IMG" --text "${KIND} · $(date +%Y-%m-%d) · 新圖已生成" || true
# 產出貼文文案（手動發帖模式：只寫 txt，不調用 X API）
"$PY" scripts/post_x.py --image "$IMG" --type "$KIND" --caption-only || true
