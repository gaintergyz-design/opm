# 上雲操作手冊（GitHub Actions）

> 你電腦上已完成：本地倉庫初始化 + 首次提交（分支 `main`，172 個檔案，約 6MB，憑證檔已排除）。
> 以下 7 步全部在瀏覽器點 + 貼 3 行命令，約 15 分鐘。

---

## 第 1 步：建 GitHub 倉庫（2 分鐘）

1. 打開 [github.com](https://github.com)，右上角 **+** → **New repository**
2. **Repository name**：`onepagemarket`
3. 選 **Public**（免費 Pages 需要 public；這些圖本來就要公開發到 X，不涉密）
4. 下面三個勾選項（Add a README / .gitignore / license）**全部不要勾**——保持空倉庫
5. **Create repository**，頁面會給你一個網址，形如
   `https://github.com/你的帳號/onepagemarket.git`

---

## 第 2 步：把本機代碼推上去（貼 3 行）

終端機（Terminal）貼上，把 `<你的帳號>` 換成你的 GitHub 用戶名：

```bash
cd /Users/gyz-igyz-imacmac/WorkBuddy/2026-10-20-14-54-08/onepagemarket
git remote add origin https://github.com/<你的帳號>/onepagemarket.git
git push -u origin main
```

**要密碼時**：不能用 GitHub 登入密碼，要用 Token——
Settings → Developer settings → Personal access tokens → **Tokens (classic)** →
Generate new token → 勾 **repo** → 生成後複製，貼在密碼位置。

推送完刷新倉庫頁面，應該看到 `scripts/ docs/ .github/` 等目錄。

---

## 第 3 步：開啟 Pages（手機看圖的網址）

倉庫頁 → **Settings** → 左側 **Pages** →

- **Source**：`Deploy from a branch`
- **Branch**：`main`，右邊資料夾選 **`/docs`**
- **Save**

等 1–2 分鐘，網址生效：
`https://<你的帳號>.github.io/onepagemarket/`

> 手機上打開這個網址 → Safari 分享 → **加入主畫面**，就跟 App 一樣，關機也能看歷年所有圖。

---

## 第 4 步：拿 X 的 OAuth 1.0a 四項憑證

[developer.x.com](https://developer.x.com) → **Projects & Apps** → 你的 App → **Keys and tokens**

| 需要的值 | 從哪拿 |
|---|---|
| `X_API_KEY` | Consumer Keys → **API Key** |
| `X_API_SECRET` | Consumer Keys → **API Key Secret** |
| `X_ACCESS_TOKEN` | Access Token and Secret → **Access Token** |
| `X_ACCESS_SECRET` | Access Token and Secret → **Access Token Secret** |

⚠️ **順序很重要**：先到 App 的 **Settings → User authentication settings** 把權限設成
**Read and Write**，再回來 **Regenerate** Access Token and Secret。否則拿到的令牌只能讀不能發。

四項整理成一段（等下貼進 Secret）：

```
X_API_KEY=xxxxxxxx
X_API_SECRET=xxxxxxxx
X_ACCESS_TOKEN=xxxxxxxx
X_ACCESS_SECRET=xxxxxxxx
```

---

## 第 5 步：加 Secrets

倉庫頁 → **Settings** → 左側 **Secrets and variables** → **Actions** → **New repository secret**

**① Name 填 `X_ENV`**，Secret 貼上第 4 步那四行（直接換行，不用引號）。

**②（可選）Name 填 `NOTIFY_ENV`**，Secret 貼推送設定：

```
CHANNEL=wecom
WECOM_WEBHOOK=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=你的key
```

或用 Telegram：`CHANNEL=telegram` + `TG_TOKEN=...` + `TG_CHAT=...`

---

## 第 6 步：手動跑一次驗證

倉庫頁 → **Actions** → 左側 **daily-cards** → 右邊 **Run workflow** →

- Branch: `main`
- kind: `ondeck`
- **Run workflow**

約 1–2 分鐘。點進去看每一步：

| 步驟 | 期望 |
|---|---|
| 安裝依賴 | 綠勾（`npm ci` 失敗會自動 `npm install`） |
| 產圖 + 推送 + 發帖 | 綠勾，日志裡有 `IMAGE: out/on-deck-...png` |
| 生成畫廊頁 | 綠勾，`gallery: N images` |
| 提交回倉庫 | 綠勾，或顯示「無變更」 |

跑完後：
- **Artifacts** 區可下載本次 PNG
- 第 3 步的網址刷新，應該看到今天的圖
- X 上應該出現帖子（第一次建議先用 `theclose` 再試，數據更完整）

---

## 第 7 步：關掉本機排程，避免重複發帖

現在本機還有兩個 WorkBuddy 自動化（On Deck 19:00、The Close 04:30）處於啟用狀態，
和雲端同時跑會**同一張圖發兩次**。

告訴我一句「本機排程改 dry-run」，我就把它們改成只產圖不發帖；
或者你自己在 WorkBuddy 左側「自動化」列表裡停用。

---

## 時間表（已寫死在 `.github/workflows/daily.yml`）

| 任務 | UTC cron | 香港 | 美東 | 內容 |
|---|---|---|---|---|
| On Deck | `0 11 * * 1-5` | 19:00 | 07:00 盤前 | 當日經濟事件 + 財報 |
| The Close | `20 20 * * 1-5` | 04:20（翌日） | 16:20 收盤後 | 指數 + Top20 + breadth |

GitHub 的 cron **通常延遲 5–15 分鐘**，偶爾更久，這是平台特性，不是設定錯誤。

---

## 出問題怎麼查

| 症狀 | 原因 / 解法 |
|---|---|
| Actions 裡沒有 daily-cards | workflow 檔案沒推上去：`git push` 後刷新 |
| `產圖` 步驟紅字 | 點開看是 Yahoo 還是 Nasdaq；兩者都有多級備援，多半是暫時性，重新 Run 一次 |
| 圖片中文/英文變方塊 | `assets/fonts/` 三個 ttf 沒進倉庫（檢查 `git ls-files assets/fonts`） |
| 發帖 403 | App 權限不是 Read and Write，或憑證貼錯行 → 重新 Generate 再更新 `X_ENV` |
| 帖子發了但圖沒上 | 媒體上傳失敗，日志會印 `媒體上傳失敗`；多半是 PNG 超過 5MB（本專案約 200KB，不會） |
| 兩天後排程自動停了 | GitHub 規則：倉庫 60 天無提交會停用排程。我們每天有新圖入庫，正常不會觸發；真的發生了，手動 Run 一次即恢復 |
| Pages 打開是 404 | Pages 分支資料夾要選 `/docs`（不是 `/root`），且首次部署要等 1–2 分鐘 |

---

## 成本

| 項目 | 費用 |
|---|---|
| GitHub Actions（public repo） | 免費、不限分鐘 |
| GitHub Pages | 免費 |
| X API | 每帖 $0.015，一週 5 帖 ≈ $0.3/月 |
