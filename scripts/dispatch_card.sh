#!/usr/bin/env bash
# OPM 外部定時器入口：打 GitHub workflow_dispatch，讓雲端 CI 出卡。
# 用法：
#   bash scripts/dispatch_card.sh ondeck
#   bash scripts/dispatch_card.sh theclose --force
#   OPM_DISPATCH_TOKEN=xxx bash scripts/dispatch_card.sh winners
# token 優先序：OPM_DISPATCH_TOKEN → GITHUB_TOKEN → GH_TOKEN
# 🔴 不寫死 token、不印 token、不入庫；外部定時器請用只授該倉庫 Actions: read+write 的細粒度 PAT。
set -uo pipefail
REPO="${OPM_REPO:-gaintergyz-design/opm}"
KIND="${1:-ondeck}"
FORCE="false"
if [ "${2:-}" = "--force" ]; then FORCE="true"; fi
case "$KIND" in
  ondeck|theclose|winners|weekahead) ;;
  *) echo "未知 kind: $KIND（ondeck|theclose|winners|weekahead）" >&2; exit 2 ;;
esac
TOKEN="${OPM_DISPATCH_TOKEN:-${GITHUB_TOKEN:-${GH_TOKEN:-}}}"
if [ -z "$TOKEN" ]; then
  echo "缺 token：請設 OPM_DISPATCH_TOKEN / GITHUB_TOKEN / GH_TOKEN" >&2
  exit 3
fi
PAYLOAD=$(printf '{"ref":"main","inputs":{"kind":"%s","force":"%s"}}' "$KIND" "$FORCE")
URL="https://api.github.com/repos/${REPO}/actions/workflows/daily.yml/dispatches"
BODY="$(mktemp)"
for i in 1 2 3; do
  CODE=$(curl -s -o "$BODY" -w '%{http_code}' --max-time 30 -X POST \
    -H "Authorization: Bearer ${TOKEN}" \
    -H 'Accept: application/vnd.github+json' \
    -H 'Content-Type: application/json' \
    -d "$PAYLOAD" "$URL" || echo 000)
  if [ "$CODE" = "204" ]; then
    echo "[$(date -u +%FT%TZ)] dispatch ok: kind=$KIND force=$FORCE (第 $i 次)"
    rm -f "$BODY"
    exit 0
  fi
  echo "[$(date -u +%FT%TZ)] dispatch 失敗 HTTP=$CODE（第 $i 次）" >&2
  if [ "$i" -lt 3 ]; then sleep 20; fi
done
echo "dispatch 三次皆失敗，回應：" >&2
cat "$BODY" >&2
rm -f "$BODY"
exit 1
