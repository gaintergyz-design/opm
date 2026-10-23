/**
 * The Close — 1080x1350 PNG 產生器
 * 輸入：data/close.json    輸出：out/the-close-<session>.png
 *
 * 2026-10-22 改版（阿澤定稿）：
 *   · Top 20 由雙列改**單列**（20 行 × 38px）
 *   · 每隻個股都顯示**漲跌幅**（方向色 + 正負號）
 *   · 刪除「Breadth 市場寬度」與「Earnings 明日財報」兩個模塊
 *   · 數據改用東方財富**真實成交額**（Σ 成交價×股數），不再是 price × volume 估算
 *
 * 用法：NODE_PATH=<workspace>/node_modules node scripts/build_close.js
 *       PREVIEW=1 ... → 寫到 out/_preview/（不污染正式產物）
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const BASE = path.join(__dirname, '..');
const DATA_PATH = process.env.CLOSE_DATA || path.join(BASE, 'data', 'close.json');
const OUT_SUFFIX = process.env.CLOSE_SUFFIX || '';
const D = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const LOGO_PATH = path.join(BASE, 'data', 'logos.json');
const LOGOS = fs.existsSync(LOGO_PATH) ? JSON.parse(fs.readFileSync(LOGO_PATH, 'utf8')) : {};

// ============ CONFIG ============
const CFG = {
  W: 1080, H: 1350, M: 48,
  colors: {
    bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
    line: '#E4E7EC', amber: '#BA7517', amberBg: '#FAEEDA', amberInk: '#854F0B',
    up: '#12A263', down: '#DE3A1B', track: '#F2F4F7',
  },
  font: 'MiSans',
  // 水印：正中、低透明度（防盜圖，不干擾閱讀）
  watermark: { text: '@onepagemarket', size: 132, opacity: 0.055, angle: -24 },
};
const { W, M, colors: C } = CFG;
const H = CFG.H;
// ===============================

let uid = 0, defs = [];
function logoAt(ticker, x, cy, size) {
  const id = `lp${uid++}`;
  const r = size / 2;
  const ring = `<circle cx="${x + r}" cy="${cy}" r="${r}" fill="none" stroke="#D6DAE1" stroke-width="1.5"/>`;
  const uri = LOGOS[ticker];
  if (!uri) {
    return `<circle cx="${x + r}" cy="${cy}" r="${r}" fill="#F6F7F9"/>` + ring;
  }
  defs.push(`<clipPath id="${id}"><circle cx="${x + r}" cy="${cy}" r="${r}"/></clipPath>`);
  return `<g clip-path="url(#${id})"><image x="${x}" y="${cy - r}" width="${size}" height="${size}" href="${uri}"/></g>` + ring;
}
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function t(x, y, s, { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0 } = {}) {
  return `<text x="${x}" y="${y}" font-family="${CFG.font}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text>`;
}
const pctStr = (v) => {
  if (typeof v !== 'number') return '—';
  return (v >= 0 ? '+' : '\u2212') + Math.abs(v).toFixed(2) + '%';
};
const pctColor = (v) => (typeof v === 'number' && v < 0 ? C.down : C.up);
const bill = (n) => {
  if (typeof n !== 'number') return '—';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(0) + 'M';
  return String(Math.round(n));
};
const longDate = (iso) => {
  const d = new Date(iso + 'T12:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};
// 公司名瘦身：去掉 "Common Stock" / "Class A Capital Stock" 尾巴、長詞縮寫，
// 再按估算字寬截斷——且**在詞邊界截**（"Advanced Micro Devices…" 而非 "Advanced Micro Devic…"）
const fitName = (s, maxW, size) => {
  let str = String(s || '')
    // 只去掉尾巴的 "Common Stock" / "Capital Stock"，保留 Class A/B/C
    // （GOOGL 與 GOOG 都是 Alphabet，靠 Class A / Class C 才分得出來）
    .replace(/\s+(Common|Capital) Stock$/i, '')
    .replace(/\bCorporation\b/gi, 'Corp.')
    .replace(/\bIncorporated\b/gi, 'Inc.')
    .trim();
  const w = (x) => x.length * size * 0.56;
  if (w(str) <= maxW) return str;
  const full = str;
  while (str.length > 1 && w(str + '\u2026') > maxW) str = str.slice(0, -1);
  // 只在「剛好切在半個單詞中間」時才退到詞邊界；
  // 若截斷點本來就落在詞尾（下一個字元是空白）就保留整詞，避免把 "Taiwan Semiconductor" 砍成 "Taiwan"
  if (full.charAt(str.length) !== ' ') {
    const sp = str.lastIndexOf(' ');
    if (sp > 3) str = str.slice(0, sp);
  }
  // 停在 "Inc." / "Corp." 這種縮寫結尾時讀起來已是完整公司名，不再補省略號
  if (/\.$/.test(str)) return str;
  return str.replace(/[\s,\-]+$/, '') + '\u2026';
};
// 代碼寬度估算（MiSans Bold 大寫，advance ≈ 0.72em）
const tickerW = (s, size) => String(s || '').length * size * 0.72;

// ---------- 版面常數（單列 · 20 行） ----------
const CW = W - M * 2;            // 984
const ROW_H = 38;
const RANK_X = M + 26;           // 74（右對齊）
const LOGO_X = M + 36;           // 84
const LOGO_S = 28;
const TICKER_X = M + 88;         // 136
const NAME_X = M + 194;          // 242
const NAME_SIZE = 19;
const BAR_X = 512, BAR_MAX = 292;
const PCT_X = 930;               // 右對齊
const AMT_X = W - M;             // 1032（右對齊）

const rows = (D.volume && D.volume.rows) || [];
const maxDV = Math.max(1, ...rows.map((r) => r.dollar_volume || 0));
const listH = rows.length * ROW_H;

const Y_TOP_LABEL = 392;
const LIST_TOP = 426;
const LIST_BOTTOM = LIST_TOP + listH;

let svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
svg.push(`<rect width="${W}" height="${H}" fill="${C.bg}"/>`);

// ---------- 水印（先畫，內容壓在上面）----------
const wm = CFG.watermark;
svg.push(`<g transform="translate(${W / 2} ${H / 2}) rotate(${wm.angle})" opacity="${wm.opacity}">
  ${t(0, 0, wm.text, { size: wm.size, weight: 700, fill: C.ink, anchor: 'middle', ls: 6 })}
</g>`);

// ---------- 頁首 ----------
svg.push(t(M, 122, 'The Close', { size: 80, weight: 700, ls: -1.5 }));
svg.push(t(M, 168, `${longDate(D.session)} · 16:15 ET`, { size: 26, fill: C.gray }));

// 帳號 pill（右）
const handle = D.handle || '@onepagemarket';
const pillW = Math.round(handle.length * 17.6) + 44;
const pillX = W - M - pillW, pillY = 62, pillH = 58;
svg.push(`<rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="12" fill="${C.amberBg}"/>`);
svg.push(t(pillX + pillW / 2, pillY + 39, handle, { size: 32, weight: 500, fill: C.amberInk, anchor: 'middle' }));

// 規則線
svg.push(`<rect x="${M}" y="200" width="${CW}" height="6" fill="${C.amber}"/>`);

// ---------- 指數 ----------
const idx = D.indexes || [];
const idxCol = CW / Math.max(1, idx.length);
idx.forEach((it, i) => {
  const x = M + idxCol * i;
  svg.push(t(x, 258, it.label, { size: 24, fill: C.gray }));
  svg.push(t(x, 328, pctStr(it.pct), { size: 60, weight: 700, fill: pctColor(it.pct) }));
});

// ---------- 成交額榜（單列 20 行）----------
function sectionLabel(x, y, label) {
  svg.push(`<rect x="${x}" y="${y - 20}" width="6" height="24" fill="${C.amber}"/>`);
  svg.push(t(x + 18, y, label, { size: 24, fill: C.gray }));
}
sectionLabel(M, Y_TOP_LABEL, `Top ${rows.length || 20} stocks by turnover`);
svg.push(t(W - M, Y_TOP_LABEL, 'USD · actual traded value', { size: 22, fill: C.dim, anchor: 'end' }));

rows.forEach((r, i) => {
  const y = LIST_TOP + i * ROW_H;
  const mid = y + ROW_H / 2;

  svg.push(t(RANK_X, mid + 7, String(i + 1), { size: 19, fill: C.dim, anchor: 'end' }));
  svg.push(logoAt(r.ticker, LOGO_X, mid, LOGO_S));
  svg.push(t(TICKER_X, mid + 9, r.ticker, { size: 27, weight: 700 }));
  if (r.name) {
    // 名稱起點跟著代碼長度浮動（GOOGL / GOOG 這種 5 碼才不會黏上去）
    const nx = Math.max(NAME_X, Math.round(TICKER_X + tickerW(r.ticker, 27) + 16));
    svg.push(t(nx, mid + 7, fitName(r.name, BAR_X - nx - 18, NAME_SIZE),
               { size: NAME_SIZE, fill: C.gray }));
  }
  // 條長 = 成交額；顏色 = 當日漲跌方向
  const bw = Math.max(6, Math.round((r.dollar_volume || 0) / maxDV * BAR_MAX));
  svg.push(`<rect x="${BAR_X}" y="${mid - 5}" width="${BAR_MAX}" height="10" rx="2" fill="${C.track}"/>`);
  svg.push(`<rect x="${BAR_X}" y="${mid - 5}" width="${bw}" height="10" rx="2" fill="${pctColor(r.pct)}" opacity="0.85"/>`);
  // 漲跌幅
  svg.push(t(PCT_X, mid + 9, pctStr(r.pct), { size: 26, weight: 700, fill: pctColor(r.pct), anchor: 'end' }));
  // 成交額
  svg.push(t(AMT_X, mid + 8, bill(r.dollar_volume), { size: 24, fill: C.gray, anchor: 'end' }));
});

// ---------- 頁腳 ----------
svg.push(`<rect x="${M}" y="${H - 118}" width="${CW}" height="1" fill="${C.line}"/>`);
svg.push(t(M, H - 78, D.disclaimer || '', { size: 20, fill: C.dim }));
svg.push(t(W - M, H - 78, handle, { size: 20, fill: C.dim, anchor: 'end' }));
const metricNote = (D.volume && D.volume.metric_note) || 'actual traded value';
svg.push(t(M, H - 48, `Source: ${D.source || 'Eastmoney · Nasdaq'} · ${metricNote} · index: Eastmoney / CNBC`,
           { size: 18, fill: C.dim }));

svg.push('</svg>');
svg.splice(1, 0, `<defs>${defs.join('')}</defs>`);
const svgStr = svg.join('\n');

// 調排版用：PREVIEW=1 寫到 out/_preview/（不污染正式產物與 git）
const outDir = path.join(BASE, 'out', process.env.PREVIEW ? '_preview' : '');
fs.mkdirSync(outDir, { recursive: true });
const stamp = String(D.session || 'x').replace(/-/g, '');
fs.writeFileSync(path.join(outDir, `the-close-${stamp}${OUT_SUFFIX}.svg`), svgStr);

// 字體：專案內 assets/fonts（雲端 CI 用）優先，退回系統字體
const FONT_DIRS = [path.join(BASE, 'assets', 'fonts'),
                   path.join(process.env.HOME || '', 'Library', 'Fonts')];
const fontFiles = ['MiSans-Bold.ttf', 'MiSans-Medium.ttf', 'MiSans-Regular.ttf']
  .map((f) => FONT_DIRS.map((d) => path.join(d, f)).find((p) => fs.existsSync(p)))
  .filter(Boolean);

const resvg = new Resvg(svgStr, {
  fitTo: { mode: 'width', value: W },
  font: { fontFiles, loadSystemFonts: true, defaultFontFamily: CFG.font },
  background: C.bg,
});
const png = resvg.render().asPng();
const out = path.join(outDir, `the-close-${stamp}${OUT_SUFFIX}.png`);
fs.writeFileSync(out, png);
console.log('PNG ->', out, `(${(png.length / 1024).toFixed(0)} KB)`);
