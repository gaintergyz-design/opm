---
name: onepagemarket
description: OPM 產線（@onepagemarket 美股數據卡）。觸發詞「生成OPM格式」「OPM 格式」。涵蓋 The Close / On Deck / Winners & Losers / Week Ahead 四張定時卡、Who Owns X 股權卡、個股財報卡。含數據源硬規則、排版旋鈕、踩坑清單、GitHub Actions 雲端運維。改產線或跑產線前必讀。
---

# OPM 產線操作手冊（@onepagemarket）

本檔案是全產線經驗的固化版。**跑產線或改產線前先通讀；🔴 條目為阿澤欽定紅線，不可違反。**

## 1. 產線總覽

- 倉庫即產線：`scripts/` 是全部邏輯，`data/` 是數據快取，`out/` 是成品，`docs/` 是 GitHub Pages 畫廊。
- 四張定時卡（GitHub Actions `.github/workflows/daily.yml` 雲端定時，以 ET 為基準，每條註冊 DST/非 DST 兩個 UTC cron + 時區守衛）：
  - **On Deck** ET 08:30 週一~五（盤前）
  - **The Close** ET 16:15 週一~五（收盤復盤）
  - **Winners & Losers** 週五 ET 16:30
  - **Week Ahead** 週一 ET 07:00
- 專題卡（不定時，手動觸發）：`scripts/build_ownership.js` + `data/ownership-*.json`（Who Owns X 股權卡）；`scripts/build_earnings.js` + `data/earnings-*.json`（個股財報卡）。
- 畫廊：`build_gallery.py` 把 out/*.png 生成 docs/img + index.html，Pages 線上預覽。

## 2. 命令速查

```bash
# 排版迭代預覽（1.8 秒出圖、不聯網、不 push、寫 out/_preview/）
bash scripts/preview.sh ondeck|winners|earnings|weekahead|close

# 全產線（fetch → render → gallery → notify → post_x）
bash scripts/publish.sh ondeck|theclose|winners|weekahead

# 股權卡
NODE_PATH=./node_modules node scripts/build_ownership.js   # 數據在 data/ownership-<ticker>.json

# 手動觸發雲端跑（token 從 git credential fill 取）
gh workflow run daily.yml -f kind=ondeck    # 或 API POST .../workflows/daily.yml/dispatches
```

環境依賴：Node（`@resvg/resvg-js`，先 `npm install`）；Python 僅標準庫；字體 MiSans 已子集化內建於 `assets/fonts/`（渲染查找 assets/fonts 優先、~/Library/Fonts 兜底）。

## 3. 🔴 數據源硬規則

- **🔴 全產線禁用東方財富**（2026-10-26 欽定）。根因：東財接口在 GitHub runner 上連續回空（runner IP 被擋），造成連續缺卡。所有數據一律走 Yahoo / Nasdaq 官方 / CNBC。
- **🔴 指數數據全源失敗 → 中止出圖並說明原因，絕不自算/估算**。`sp500_capweighted`（市值加權自算）已棄用：自算 +0.50% vs 官方 +0.28%，偏差過大。fetch_indexes 遇任一指數所有線路皆失敗即 SystemExit FATAL，publish.sh `set -e` 會擋住後續產圖與發帖。
- 指數降級鏈：Yahoo chart → Yahoo spark（5 日序列取最後兩天算日漲跌）→ CNBC restQuote（SPX/IXIC/RUT 齊全）→ Nasdaq 官方（僅 COMP）。每檔指數附 src 欄位。
  - ⚠️ CNBC `.RUT` 的 `previous_day_closing` 是壞值（==last），一律由 last+pct 反推前收。
  - Stooq 已上 JS PoW 驗證，headless 不可用，**棄用**。
- 交易日判定：Yahoo 日 K（SPY→^GSPC）。
- 成交量榜：Yahoo screener POST（cookie+crumb；NMS/NYQ/ASE 三大交易所＋市值>$2B，按成交量取 100 檔再按官方價×量重排 Top 20，與真實成交額偏差 <1%）。
- 財報/經濟事件：Nasdaq 官方 calendar（時間欄位是 **ET** 非 GMT）。經濟事件按 MAJOR 關鍵詞評分排序＋同名去重（短鍵 <10 字元不參與去重，防 GDP 誤傷 GDPNow）；跨日重複指標（GDPNow 等）在 Week Ahead 用 seen set 去重。
- 寬度：S&P 500 官方成分股（GitHub datasets/s-and-p-500-companies，快取 7 天）＋ Yahoo v7 批量報價（fc.yahoo.com cookie + getcrumb，150/批）。

### Yahoo 踩坑（遇錯先對照）
1. **按 UA 指紋限流 429**——帶 Chrome/124 的長 UA 會被拉黑；短 UA `Mozilla/5.0 (…` AppleWebKit/537.36 正常。遇 429 先換 UA。
2. screener **POST 必須帶 cookie**（-b jar），缺 cookie 必報 Invalid Crumb。
3. fc.yahoo.com 偶發不下發 cookie：須校驗 jar 有 A1/A3 才取 crumb；Invalid Crumb 要整套（cookie+crumb）重取重試。
4. 全域節流 MIN_INTERVAL 0.6s＋指數退避（5→10→20→30s）已在 fetch_close.py，勿移除。

## 4. 🔴 交付約定

- **🔴 每輪交付必須同時給出：① 成品圖（present_files）② 完整發帖文案**（post_x.py「將發帖：」全文；模板：`The Close: {指數}. Most traded: {前三}. Breadth {n}% advancers. 🧵`）。未發帖時註明「未發帖，供手動發」。
- 文案鐵律：只寫數字與事實、不寫「所以」、單句 ≤90 字元、全文 ≤280 字元。
- 檔名：`the-close-YYYYMMDD.png`（用 session 交易日命名）；四頁用 `PAGES_STAMP`＝數據交易日。
- X 發帖：OAuth1.0a 適合 CI（不過期）；OAuth2 PKCE 的 refresh token 會輪換，勿用於定時任務。X API 2026-02 起 pay-per-use（發帖 $0.015/則）。
- 推送通知：scripts/notify.py（wecom / wecom-app / telegram / bark / none 可插拔，配置 scripts/.env.notify），產圖後先 notify（失敗不阻斷）再 post_x。

## 5. 排版系統與旋鈕

- 渲染路線：SVG → @resvg/resvg-js → PNG 1080×1350（正方形規則見下）。font-family "MiSans" + font-weight 匹配。
- 共用版式：scaffold（大標 80 + 副標 26 + 琥珀規則線 + 右上手柄 pill + 正中水印）＋footer。
  - 手柄 pill：`#FAEEDA` 底／`#854F0B` 字／32px／圓角 12，頁腳重複第二次。
  - 水印 `@onepagemarket` 斜紋（rotate -24°, 132px bold, opacity 0.055）是**產線自帶品牌水印**（CFG.watermark），不是平台水印，阿澤要求才拿掉。
  - 視覺四級重量 80/60/28/24px；「平淡」的唯一成因是所有元素同尺寸同粗細。
- 關鍵旋鈕位置（build_pages.js）：CFG.colors 15/19 行、watermark 23/22、fitTitle 標題上限 90 行、scaffold 副標 91、手柄 pill 92-94、橘條 95、finish 頁腳 99-102、tickerRow 字寬係數 0.68（61-70）、各頁函數 buildOnDeck 117 / buildWinners 172 / buildEarningsWeek 203 / buildWeekAhead 244。
- **正方形切換門檻**：On Deck `rawBottom <= 1000` → H=1080；The Close `(1080-146-NATURAL_BASE)/3 >= 48`（gSquare>=48）→ H=1080，否則 1350。其餘頁開頭重置 H=CFG.H。
- **🔴 Week Ahead 版式硬約束**：右側 TX=M+558~570、ticker 起點 TX+46，可用寬 382px——單行最多 4 個 ticker，不放 5 個。
- tickerRow 字寬係數 0.60→0.68 的教訓：GOOG/GOOGL/LLY 會重疊，勿改回 0.60。
- logo：FMP image-stock 為主源（RGBA 透明），Wikimedia 官方 SVG 為備源（Clearbit 已失效、CMC 擋爬）。logoAt() 圓形裁切＋`stroke #D6DAE1 1.2-1.5` 外框；缺 logo 畫灰底圓＋首字母。統一 96×96、6% 留白，快取 assets/logos/＋data/logos.json（base64 data URI；**resvg 不認 file:// href，必須 data URI**）。
- 預覽支援假數據：`PAGES_DATA` / `CLOSE_DATA` 環境變數換數據檔；`CLOSE_SUFFIX` 加檔名後綴。
- 每次出圖都要寫 `out/gen-times.json`（{檔名: epoch}）——畫廊時間戳三層來源的第一層，git checkout 會重置 mtime。

## 6. Who Owns X 股權卡規則

- 數據**人工核實後寫死**在 data/ownership-<ticker>.json（13F 季度口徑，Yahoo 與 Stockrow 雙源核對），非自動抓取。All Other = 100 − topN − insiders。
- 版式：SVG 等距 3D 空心環（橢圓）＋洞內品牌 logo（金屬圓盤/3D 素材，base64 dataURI＋clipPath 橢圓）＋色帶 lerpColor（品牌色深→淺），最大塊 All Other＝品牌主色。
- **🔴 標籤必須落在與環同心等比放大的橢圓軌道上（不是正圓），pill 字號 38-44（All Other 44）**。
- **🔴 引導線零交叉**：用「起終點皆單調的單段直線族」；折線 elbow 在密集小扇區必交叉，勿加回。標籤排布必須讓「終點序列與錨點序列同向單調」，跨排 zigzag 必交叉。頂部多小扇區用「雙排弧形錯層」解。
- **🔴 3D 環錨點規則**：sin(aMid)>0（下半圓）的扇區，錨點放側壁底緣（ey+DEPTH），否則引導線穿側壁。
- 頂部標籤的線可從環「上方」飛過——線每個 x 的 y 都小於外橢圓邊緣 y 即可；錨點-標籤角度差 ≤~30° 弦線不進環。
- 繪製順序＝先畫線後畫 pill（pill 蓋線）；需要壓線層級時，被穿過的先畫。
- 同類新卡（Who Owns Apple/Tesla…）＝複製 build_ownership.js 換 JSON，畫廊分組記得註冊。

## 7. 已知問題（勿踩）

- `publish.sh --dry-run` **不可用**（參數轉傳 fetch_close.py 會報錯）；未授權時直接跑主流程，post_x 自動跳過。
- post_x.py 的 data_session() 已按 kind 路由數據檔（ondeck/weekahead→pages.json，其餘→close.json）——On Deck 盤前跑時 session 與圖片日期必須一致，勿回退舊邏輯。
- `fetch_close.py` session 日期用 **ET 時區**（勿改回 HKT，會標錯一天）。
- Nasdaq screener 只含股票（無 SPY/ETF）、BRK.B 可能缺；GOOGL/GOOG 會同時上榜（官方本就分開列）。
- 對 build 腳本做字串 patch 後**必跑一次驗證**（LOGOS 未定義事故：前一輪加的行讓後續 replace 失配）。
- shell grep 對含「·」的多位元組行匹配不可靠，用 Grep 工具複查。

## 8. GitHub Actions 雲端運維

- workflow：`.github/workflows/daily.yml`。守衛容差 ±60 分鐘（GitHub schedule 常延遲 30-50 分，低於此會被誤攔）；workflow_dispatch 直通不檢查。
- 手動補跑：`git credential fill` 取 token → POST dispatches。推送遇 non-fast-forward：`git pull --rebase` 再推。
- ⚠️ GitHub 60 天無提交會停用排程，記得留意。
- checkout 已設 `fetch-depth: 0`（淺克隆取不到 git 歷史時間戳）。
- Secrets 用 env: 注入再接 shell 變數（多行 secret 直接插值會斷行）。憑證檔（.env.x/.env.notify/.x_tokens.json）不入庫，.gitignore 已擋。
- 本機與雲端**不可同時 ACTIVE** 同一產線（雙發）；本機 automation 已停，雲端為唯一定時源。
- 本倉庫已設 local `git config http.proxy ""` 繞過全域代理。
- Pages 部署延遲 2-4 分鐘，驗證帶 ?v=N 防快取。
- Actions 兩條警告無害：Node 20→24 強制升級、ubuntu-latest 遷移。

## 9. 手機/跨設備

- 手機操作：WorkBuddy 小程序「本機模式」（iMac 開機時遙控本機）或「雲端模式」（沙箱 clone 本公開倉庫跑，冷啟動幾分鐘，發帖授權不在沙箱，產出＝成品圖+文案手動發）。
- 家用電腦：資料庫下載源碼包（或 git clone）→ npm install → 即可按本手冊跑產線。
- 定時卡永遠以 GitHub Actions 為準，任何設備關機都不影響。
