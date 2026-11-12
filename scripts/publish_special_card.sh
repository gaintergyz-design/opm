#!/bin/bash
# onepagemarket 專題卡｜一條龍上畫廊
#
# === 一句話就夠：說「上传画廊」→ 跑這行（零參數） =====================
#      bash scripts/publish_special_card.sh
#   自動挑「最新出圖、尚未上畫廊」的定稿；自動帶上 caption / data json /
#   build 腳本；自動查（或新建）畫廊組名、自動生成 commit 名稱。
#   有歧義才加線索：bash scripts/publish_special_card.sh --match openai
#   想先看計畫：加 --dry-run（不移動檔案、不 commit、不 push）
#   也可明確指定：bash scripts/publish_special_card.sh out/<kind>-<stamp>.png
#   跑完看最後的驗收 ✓；文案在 out/caption-*-<stamp>.txt，本腳本不發帖
#   Pages 有快取，首刷舊頁屬正常
#
# === 換電腦 / 同步 ===================================================
#   本檔與 .workbuddy/skills/onepagemarket/SKILL.md 都在 git 裡，
#   新電腦 git clone 或 git pull 就有，不需複製任何本機記憶檔
#   🔴 改過產線邏輯後：家裡電腦「本機直接跑本腳本」前要先 git pull
#      （或重新下載源碼包）；只推圖、讓 CI 加圖的路徑不用做任何事，
#      雲端用的永遠是 main 上的最新版。本機 MEMORY.md／日誌不隨 git 同步。
#   首次準備：npm install；git 憑證；需代理時先 export HTTPS_PROXY=...
#   Python 優先 WorkBuddy 內建 venv，找不到就退回 PATH 的 python3
#   任何電腦都能先跑 `bash scripts/publish_special_card.sh --help` 看這份說明
#
# === 參數（全部可省略） ==============================================
#   <定稿 PNG>      省略＝自動選最新未上線的圖
#   --match "..."   自動選圖時只挑檔名含此字串的（給線索用）
#   --title "..."   commit 名稱：card: <title> / gallery: add <title>
#                   省略時由組名自動生成
#   --group "..."   畫廊組名；省略時查 POST_NAME，新卡種才自動建
#   --extra <path>  額外進第一段提交的檔案，可重複（新 logo、附加數據…）
#   --no-clean      跳過清理（預設把同 kind 舊版收進 out/_wip/）
#   --no-push       只做兩段提交，不 fetch/rebase/push
#   --dry-run       只印計畫，不移動檔案、不改檔、不 commit、不 push
#   -h | --help     印出這份說明
#
# === 行為 ===========================================================
#   清理 → 補組名 → card: → gallery: add → rebase → 代理 push → 驗收
#   畫廊是增量模式：只把本次新卡插進索引最前面，舊卡一個字都不動；
#   rebase 後也只在「新卡掉出索引」時才補跑，不再無條件全量重跑。
#   冪等：卡已在 origin/main 且索引引用即結束；精確 git add，
#   絕不 git add -A / commit -a，不碰其它產線 WIP
#   參數自行解析，--dry-run 不外傳（publish.sh 的舊坑不適用）
# ==================================================================
set -eo pipefail
cd "$(dirname "$0")/.."

PY="${PY:-$( [ -x /Users/gyz-igyz-imacmac/.workbuddy/binaries/python/envs/default/bin/python ] && echo /Users/gyz-igyz-imacmac/.workbuddy/binaries/python/envs/default/bin/python || command -v python3 )}"

IMG_ARG=""; TITLE=""; GROUP=""; MATCH=""; DRY=0; NO_CLEAN=0; NO_PUSH=0
EXTRAS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --title)      TITLE="$2"; shift 2 ;;
    --group)      GROUP="$2"; shift 2 ;;
    --match)      MATCH="$2"; shift 2 ;;
    --extra)      EXTRAS+=("$2"); shift 2 ;;
    --dry-run)    DRY=1; shift ;;
    --no-clean)   NO_CLEAN=1; shift ;;
    --no-push)    NO_PUSH=1; shift ;;
    -h|--help)    awk 'NR==1{next} /^#/{sub(/^# ?/,""); print; next} {exit}' "$0"; exit 0 ;;
    -*)           echo "未知選項：$1" >&2; exit 1 ;;
    *)            [ -z "$IMG_ARG" ] && IMG_ARG="$1" || { echo "只能給一張定稿 PNG" >&2; exit 1; }; shift ;;
  esac
done

# 零參數：自動挑「最新出圖、尚未上畫廊」的定稿（專題卡優先於四張定時卡）
if [ -z "$IMG_ARG" ]; then
  if ! IMG_PATH="$(python3 - "$MATCH" <<'PY'
import glob, os, re, subprocess, sys, time
match = sys.argv[1].lower()
now, WINDOW = time.time(), 7 * 86400
idx = subprocess.run(['git','show','origin/main:docs/index.html'],
                     capture_output=True, text=True).stdout
TIMED = ('the-close-', 'on-deck-', 'winners-losers-', 'week-ahead-')
allnew = []
for p in glob.glob('out/*.png'):
    n = os.path.basename(p)
    if n in idx: continue                       # 已在線上畫廊
    if match and match not in n.lower(): continue
    stem = n[:-4]
    kind = re.sub(r'-\d{8}(-\w+)?$', '', stem)
    meta = (glob.glob('out/caption-*%s*.txt' % stem)
            + glob.glob('data/%s*.json' % kind)
            + glob.glob('scripts/build_%s*.js' % kind.replace('-', '_')))
    allnew.append((now - os.path.getmtime(p), bool(meta), n.startswith(TIMED), p))
if not allnew: sys.exit(3)
fresh = [c for c in allnew if c[0] <= WINDOW]   # 只認 7 天內新出的圖，防舊草稿誤發
if not fresh:
    print('      7 天內沒有新圖；較舊的未上線圖：', file=sys.stderr)
    for c in sorted(allnew)[:5]: print('        %s' % c[3], file=sys.stderr)
    sys.exit(3)
fresh.sort(key=lambda c: (not c[1], c[2], c[0]))  # 有文案/數據 → 專題卡 → 越新越優先
for c in fresh[:3]: print('      候選: %s' % c[3], file=sys.stderr)
print(fresh[0][3])
PY
  )"; then
    echo "      ✓ 沒有 7 天內待上傳的新卡（或都已上畫廊），無事可做"; exit 0
  fi
  echo "      ✓ 自動選定：$IMG_PATH"
else
  case "$IMG_ARG" in out/*) IMG_PATH="$IMG_ARG" ;; *) IMG_PATH="out/$IMG_ARG" ;; esac
  [ -f "$IMG_PATH" ] || { echo "找不到定稿圖：$IMG_PATH" >&2; exit 1; }
fi

IMG_NAME="$(basename "$IMG_PATH")"
STEM="${IMG_NAME%.png}"
STAMP="$(printf '%s' "$STEM" | sed -E 's/^.*-([0-9]{8}(-[A-Za-z0-9]+)?)$/\1/')"
KIND="$(printf '%s' "$STEM" | sed -E 's/-[0-9]{8}(-[A-Za-z0-9]+)?$//')"
GROUP_KEY="$(printf '%s' "$KIND" | sed -E 's/-p[0-9]+$//')"   # anthropic-s1-p01 → anthropic-s1
# 專題卡檔名慣例有連字號／底線兩種（build_ai_labs_scorecard.js vs ai-labs-scorecard.json）
KIND_U="$(printf '%s' "$KIND" | tr '-' '_')"
GK_U="$(printf '%s' "$GROUP_KEY" | tr '-' '_')"
if [ "$STAMP" = "$STEM" ] || [ -z "$KIND" ]; then echo "檔名解析失敗（需 <kind>-YYYYMMDD[-tag].png）：$IMG_NAME" >&2; exit 1; fi
# 組名自動推導：POST_NAME 已有 → 用；新卡種 → data json 的 title；都沒有 → kind 轉可讀
if [ -z "$GROUP" ]; then
  GROUP="$(python3 - "$GROUP_KEY" "$KIND" <<'PY'
import json, os, re, sys
key, kind = sys.argv[1], sys.argv[2]
s = open('scripts/build_gallery.py', encoding='utf-8').read()
m = re.search(r'POST_NAME = \{.*?\}', s, re.S)
d = dict(re.findall(r"['\"]([^'\"]+)['\"]\s*:\s*['\"]([^'\"]+)['\"]", m.group(0))) if m else {}
if key in d:
    print(d[key]); raise SystemExit
for p in ('data/%s.json' % kind, 'data/%s.json' % key,
          'data/%s.json' % kind.replace('-', '_')):
    if os.path.exists(p):
        try:
            j = json.load(open(p, encoding='utf-8'))
            for k in ('title', 'name', 'headline', 'company'):
                if isinstance(j.get(k), str) and j[k].strip():
                    print(j[k].strip()); raise SystemExit
        except (ValueError, OSError): pass
print(kind.replace('-', ' ').title())
PY
)"
fi
[ -z "$TITLE" ] && TITLE="$(printf '%s' "$GROUP" | sed 's/ · / /g')"

echo "── 專題卡上畫廊 ──────────────────────────────"
echo "  定稿  : $IMG_PATH"
echo "  kind  : $KIND   (group key: $GROUP_KEY, stamp: $STAMP)"
echo "  title : $TITLE"
echo "  組名  : $GROUP"
[ "$DRY" = 1 ] && echo "  ⚠️  DRY-RUN：以下只列計畫，不執行任何變更"
echo

# ── 0. 冪等保護：這張卡已上線就直接結束，避免重複提交 ──────────────────
if [ "$DRY" = 0 ] && \
   git cat-file -e "origin/main:out/$IMG_NAME" 2>/dev/null && \
   git show "origin/main:docs/index.html" 2>/dev/null | grep -qF "$IMG_NAME"; then
  echo "✅ 已在 origin/main 找到 $IMG_NAME，且畫廊索引已引用 — 無需重跑。"
  echo "   https://gaintergyz-design.github.io/opm/"
  exit 0
fi

# ── 1. 清理：同 kind 的過程稿收進 out/_wip/（build_gallery 只掃 out/*.png）──
OLD_IMGS=""
if [ "$NO_CLEAN" = 0 ]; then
  echo "[1/6] 清理過程稿"
  mkdir -p out/_wip
  for f in out/"$KIND"-*.png out/"$KIND_U"-*.png out/caption-"$KIND"-*.txt out/caption-"$KIND_U"-*.txt \
           out/"$KIND"-*.svg out/"$KIND_U"-*.svg; do
    [ -f "$f" ] || continue
    # 定稿本體（PNG / 同名 SVG / 對應 caption）必須留下
    case "$(basename "$f")" in
      "$IMG_NAME"|"$STEM.svg"|"caption-$STEM.txt"|"caption-$KIND.txt"|"caption-$KIND_U.txt") continue ;;
    esac
    # 已被 git 追蹤的舊版不能移：移走會讓下一次重建索引把已上線的歷史卡拔掉
    if git ls-files --error-unmatch "$f" >/dev/null 2>&1; then
      echo "      skip（已入庫，移走會掉歷史卡）: $f"; continue
    fi
    case "$f" in *.png) OLD_IMGS="$OLD_IMGS $(basename "$f")" ;; esac
    if [ "$DRY" = 1 ]; then echo "      → out/_wip/  $f"
    else mv "$f" out/_wip/; echo "      → out/_wip/  $f"; fi
  done
  OLD_IMGS="$(printf '%s' "$OLD_IMGS" | sed 's/^ //')"
else
  echo "[1/6] 清理過程稿（--no-clean，跳過）"
fi

# ── 2. 組名：新卡種自動補 POST_NAME（任何長期頁面改動都寫進模板）──────────
echo "[2/6] 畫廊組名"
GALLERY_DIRTY=0
if python3 - "$GROUP_KEY" "$GROUP" "$DRY" <<'PY'
import re, sys
key, name, dry = sys.argv[1], sys.argv[2], sys.argv[3] == '1'
p = 'scripts/build_gallery.py'
s = open(p, encoding='utf-8').read()
m = re.search(r'POST_NAME = \{.*?\}', s, re.S)
block = m.group(0) if m else ''
if re.search(r"['\"]" + re.escape(key) + r"['\"]\s*:", block):
    print('      POST_NAME 已有此 kind，略過'); sys.exit(0)
if not m:
    print('      ⚠️ 找不到 POST_NAME 字典，請手動加組名', file=sys.stderr); sys.exit(2)
if dry:
    print('      DRY-RUN：將新增 POST_NAME[%r] = %r' % (key, name)); sys.exit(0)
i = s.index('\n', s.index('POST_NAME = {')) + 1
s = s[:i] + "             %r: %r,\n" % (key, name) + s[i:]
open(p, 'w', encoding='utf-8').write(s)
print('      已新增 POST_NAME[%r] = %r' % (key, name))
PY
then
  if ! git diff --quiet -- scripts/build_gallery.py; then GALLERY_DIRTY=1; fi
else
  echo "      ⚠️ 組名處理未成功，請手動確認 POST_NAME"
fi
# ── 3. 第一段提交：卡本體 ────────────────────────────────────────────────
echo "[3/6] 第一段提交  card: $TITLE"
CARD_FILES=("$IMG_PATH")
for c in "data/$KIND.json" "data/$KIND_U.json" "data/$GROUP_KEY.json" "data/$GK_U.json" \
         "scripts/build_$KIND.js" "scripts/build_$KIND_U.js" "scripts/build_$GROUP_KEY.js" "scripts/build_$GK_U.js" \
         "out/caption-$KIND-$STAMP.txt" "out/caption-$KIND_U-$STAMP.txt" \
         "out/caption-$GROUP_KEY-$STAMP.txt" "out/caption-$GK_U-$STAMP.txt" \
         "out/caption-$KIND.txt" "out/caption-$KIND_U.txt"; do
  [ -f "$c" ] && CARD_FILES+=("$c")
done
for e in "${EXTRAS[@]}"; do [ -f "$e" ] && CARD_FILES+=("$e") || echo "      ⚠️ --extra 不存在：$e"; done
# 去重
CARD_UNIQ=(); for f in "${CARD_FILES[@]}"; do case " ${CARD_UNIQ[*]} " in *" $f "*) ;; *) CARD_UNIQ+=("$f") ;; esac; done
printf '      %s\n' "${CARD_UNIQ[@]}"
if [ "$DRY" = 0 ]; then
  git add -- "${CARD_UNIQ[@]}"
  if git diff --cached --quiet; then echo "      （無新變更，略過 commit）"; else git commit -m "card: $TITLE" --quiet; echo "      ✓ $(git rev-parse --short HEAD)"; fi
fi

# ── 4. 第二段提交：重建畫廊 ──────────────────────────────────────────────
echo "[4/6] 第二段提交  gallery: add $TITLE"
if [ "$DRY" = 0 ]; then
  "$PY" scripts/build_gallery.py >/dev/null
  G_FILES=("docs/index.html" "docs/img/$IMG_NAME")
  [ "$GALLERY_DIRTY" = 1 ] && G_FILES+=("scripts/build_gallery.py")
  for f in "${G_FILES[@]}"; do [ -f "$f" ] || { echo "      ✗ 缺少 $f" >&2; exit 1; }; done
  git add -- "${G_FILES[@]}"
  if git diff --cached --quiet; then echo "      （無新變更，略過 commit）"; else git commit -m "gallery: add $TITLE" --quiet; echo "      ✓ $(git rev-parse --short HEAD)"; fi
else
  printf '      %s\n' "docs/index.html" "docs/img/$IMG_NAME" "scripts/build_gallery.py(若新增組名)"
fi
[ "$NO_PUSH" = 1 ] && { echo "      --no-push：停在兩段提交。"; exit 0; }

# ── 5. rebase + 代理推送（固定套路，一次跑完）──────────────────────────
echo "[5/6] rebase + 代理推送"
PROXY="${HTTPS_PROXY:-${https_proxy:-}}"
if [ -z "$PROXY" ]; then echo "      ⚠️ \$HTTPS_PROXY 為空（全域 7890 常失效），仍嘗試直連"; fi
GITP=(git)
[ -n "$PROXY" ] && GITP=(git -c "http.proxy=$PROXY" -c "https.proxy=$PROXY")
if [ "$DRY" = 1 ]; then
  echo "      fetch origin → 分叉則 stash → rebase -X theirs → 重跑畫廊 → amend → push"
else
  "${GITP[@]}" fetch origin --quiet
  NEED_REBASE=0
  git merge-base --is-ancestor origin/main HEAD || NEED_REBASE=1
  if [ "$NEED_REBASE" = 1 ]; then
    echo "      遠端已推進（CI gallery: sync 或別條產線），rebase"
    BEFORE="$(git rev-parse -q --verify refs/stash 2>/dev/null || true)"
    git stash push -m "publish-special-card-$$" --quiet
    AFTER="$(git rev-parse -q --verify refs/stash 2>/dev/null || true)"
    HAS_STASH=0; [ -n "$AFTER" ] && [ "$AFTER" != "$BEFORE" ] && HAS_STASH=1
    "${GITP[@]}" rebase -X theirs origin/main --quiet || {
      echo "      ✗ rebase 失敗，請手動處理（stash 已保留）" >&2; exit 1; }
    # 增量模式（2026-11-12）：只在「本次新卡掉出索引」時補跑，不再無條件重跑。
    # 舊版無條件重跑會把 rebase 後少掉的歷史卡當成新卡、頂到全頁最前。
    if grep -qF "$IMG_NAME" docs/index.html; then
      echo "      索引已含本次新卡，略過重建（只增不改）"
    else
      "$PY" scripts/build_gallery.py >/dev/null
    fi
    if ! git diff --quiet -- docs/index.html; then
      git add -- docs/index.html
      if git log -1 --format=%s | grep -q "^gallery: add $TITLE"; then
        git commit --amend --no-edit --quiet
        echo "      ✓ 索引補回並 amend 進 gallery commit"
      else
        git commit -m "gallery: add $TITLE (index rebuild after rebase)" --quiet
        echo "      ✓ 索引補回（獨立 commit）"
      fi
    fi
    # -X theirs 有時會漏一行別人 WIP 殘留 → 清掉再 pop（stash 有完整副本）
    if [ -n "$(git status --porcelain --untracked-files=no)" ]; then git restore --worktree .; fi
    # 先 push 再還 WIP：就算 pop 撞 gen-times.json，卡也已上線
    "${GITP[@]}" push origin main --quiet
    if [ "$HAS_STASH" = 1 ]; then
      if git stash pop --quiet 2>/dev/null; then echo "      ✓ WIP 還原"
      else echo "      ⚠️ stash pop 衝突（常見：out/gen-times.json）。卡已上線，stash 保留，請手動 git stash pop" >&2; fi
    fi
  else
    "${GITP[@]}" push origin main --quiet
  fi
  echo "      ✓ pushed"
fi

# ── 6. 驗收：只看遠端，不看 Pages 快取 ───────────────────────────────────
echo "[6/6] 驗收"
if [ "$DRY" = 1 ]; then
  echo "      將檢查：兩個 commit / origin:docs:img 圖檔 / index 含定稿且不含過程稿"
else
  "${GITP[@]}" fetch origin --quiet
  FAIL=0
  for msg in "card: $TITLE" "gallery: add $TITLE"; do
    if git log origin/main --format=%s -n 40 | grep -qF "$msg"; then echo "      ✓ commit: $msg"
    else echo "      ✗ 缺 commit: $msg" >&2; FAIL=1; fi
  done
  git cat-file -e "origin/main:docs/img/$IMG_NAME" 2>/dev/null && echo "      ✓ docs/img/$IMG_NAME" || { echo "      ✗ 缺 docs/img/$IMG_NAME" >&2; FAIL=1; }
  if ! python3 - "$IMG_NAME" "$OLD_IMGS" <<'PY'
import subprocess, sys
img, olds = sys.argv[1], sys.argv[2].split()
s = subprocess.run(['git','show','origin/main:docs/index.html'], capture_output=True, text=True).stdout
print('      ✓ index.html 引用 %s：%d 次' % (img, s.count(img)) if s.count(img) > 0 else '      ✗ index.html 未引用 '+img)
bad = [o for o in olds if o and o in s]
print('      ✓ 過程稿未上公開頁' if not bad else '      ✗ 過程稿誤入：'+', '.join(bad))
sys.exit(1 if s.count(img) == 0 or bad else 0)
PY
  then FAIL=1; fi
  [ "$FAIL" = 1 ] && { echo "  ⚠️ 驗收有異常，見上" >&2; exit 1; }
fi
echo
echo "✅ 完成｜https://gaintergyz-design.github.io/opm/ （Pages 有快取，首刷可能是舊頁）"
echo "   未發帖；文案見 out/caption-*-$STAMP.txt"
