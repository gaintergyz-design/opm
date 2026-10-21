# 雲端部署（關機也能跑）

> **目前模式：手動發帖**。雲端只負責「按時出圖 + 產出貼文文案」，不調用 X API，
> 因此**不需要任何 X 憑證**。文案寫在 `out/caption-*.txt`，也會顯示在畫廊頁（附一鍵複製）。
> 想改成自動發帖時，把 `scripts/publish.sh` 最後一行的 `--caption-only` 去掉、並加上 `X_ENV` secret 即可。

本目錄已備好 GitHub Actions 工作流：**Mac 關機照樣每天產圖、發 X、更新畫廊**，手機隨時看得到。

---

## 一次性設置（約 10 分鐘）

### 1. 建倉庫並推送

```bash
cd onepagemarket
git init && git add . && git commit -m "init"
gh repo create onepagemarket --private --source=. --push
# 沒有 gh：在 github.com 新建倉庫後
#   git remote add origin git@github.com:<你的帳號>/onepagemarket.git
#   git branch -M main && git push -u origin main
```

> 想讓畫廊公開（GitHub Pages 免費版需 public repo）就建成 **public**；
> 純自用可以 private，畫廊改用 Actions Artifact 下載。

### 2. 開 Pages

Settings → Pages → Source: **Deploy from a branch** → Branch: `main` / 資料夾 `/docs` → Save
完成後畫廊網址：`https://<帳號>.github.io/onepagemarket/`

### 3. 加 Secrets（Settings → Secrets and variables → Actions）

| Secret | 內容 | 用途 |
|---|---|---|
| `X_ENV` | `X_API_KEY=...`<br>`X_API_SECRET=...`<br>`X_ACCESS_TOKEN=...`<br>`X_ACCESS_SECRET=...` | 發 X（OAuth 1.0a，令牌不過期） |
| `NOTIFY_ENV` | `CHANNEL=wecom`<br>`WECOM_WEBHOOK=...` 或 `TG_TOKEN=...` / `TG_CHAT=...` | 推手機/微信 |
| `X_TOKEN_JSON` | OAuth2 token JSON（可選，沒有就用 OAuth1） | 備用發帖方式 |

OAuth 1.0a 四個值在 developer.x.com → 你的 App → **Keys and tokens** →
「Consumer Keys」+「Access Token and Secret」（權限需 Read and Write）。

### 4. 時間表（已寫死在 `.github/workflows/daily.yml`）

| 任務 | UTC | 香港 | 美東 |
|---|---|---|---|
| On Deck | `0 11 * * 1-5` | 19:00 | 07:00（盤前） |
| The Close | `20 20 * * 1-5` | 04:20（翌日） | 16:20（收盤後） |

GitHub 的 cron **通常延遲 5–15 分鐘**（高峰更久），所以 On Deck 設 07:00 ET 而非 09:00 前最後一刻。
也可在 Actions 頁面 **Run workflow** 手動觸發，選 `ondeck` / `theclose`。

---

## 雲端跑的時候發生什麼

1. `npm ci` 裝 `@resvg/resvg-js`（SVG→PNG 渲染）
2. `scripts/publish.sh <kind>`：抓 Nasdaq/Yahoo 數據 → 產 PNG → 推手機 → 發 X
3. `scripts/build_gallery.py`：把 `out/*.png` 複製到 `docs/img/` 並生成手機友好的 `docs/index.html`
4. 把 `docs/ out/ data/` 提交回倉庫（`data/history/` 逐日累積，週牛熊榜要靠它）
5. PNG 同時上傳為 Actions Artifact（保留 30 天）

字體用 `assets/fonts/` 內的 MiSans 子集（3×62KB，只含拉丁字符），不依賴系統字體。

---

## 本機 / 雲端行為差異

| | 本機（WorkBuddy 排程） | 雲端（GitHub Actions） |
|---|---|---|
| Mac 關機 | 不跑 | **照跑** |
| 出圖 | ✅ | ✅ |
| 發 X | ✅（需授權） | ✅（Secrets） |
| 手機查看 | 開機才同步 | **Pages 畫廊隨時看** |
| WorkBuddy 對話卡片 | ✅ | ❌（雲端沒有對話） |

**建議**：兩邊都留著——雲端負責準時出圖發帖，本機排程當備援與調版用（同一套腳本，不會打架，
因為檔名帶日期、提交有衝突時以最新一次為準）。

---

## 常見問題

**Q：Actions 有免費額度嗎？**
public repo 免費不限；private repo 每月 2,000 分鐘，這個任務每次約 1–2 分鐘，一個月約 60 分鐘，夠用。

**Q：Yahoo 限流怎麼辦？**
`fetch_close.py` 有三級備援：chart 端點 → spark 端點 → Nasdaq 官方／S&P 500 市值加權，實測很少全掛。
若整條失敗，工作流會紅字報錯（不會拿舊圖硬發）。

**Q：想改版式？**
改完在本機 `bash scripts/publish.sh ondeck --dry-run` 看效果，滿意後 `git push`，雲端自動用新版。
