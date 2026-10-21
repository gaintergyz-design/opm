/**
 * The Close — 1080x1350 PNG 產生器
 * 輸入：data/close.json    輸出：out/the-close-<session>.png
 *
 * 版面規格見「X起號方案-美股數據號」§11
 * 用法：NODE_PATH=<workspace>/node_modules node scripts/build_close.js
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
let H = CFG.H;                     // 可切換 1080×1080 / 1080×1350
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
const num = (n) => (typeof n === 'number' ? n.toLocaleString('en-US') : '—');
const longDate = (iso) => {
  const d = new Date(iso + 'T12:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

// ---------- 版面常數 ----------
const CW = W - M * 2;                     // 984
const IDX_BOTTOM = 340;                   // 指數百分比文字視覺底緣
const ROW_H = 46, ROWS_PER_COL = 10;      // Top20 行距
const COL_W = (CW - 40) / 2;              // 472
const BAR_MAX = 168;

const rows = (D.volume && D.volume.rows) || [];
const maxDV = Math.max(1, ...rows.map((r) => r.dollar_volume || 0));
const breadth = D.breadth || {};
const advPct = typeof breadth.adv_pct === 'number' ? breadth.adv_pct : 0;
const earnRows = ((D.earnings && D.earnings.rows) || []).slice(0, 3);

// 內容少 → 正方形 1080×1080；否則 1080×1350（三段間距 GAP 統一）
const perCol = Math.max(1, Math.ceil(rows.length / 2));
const listH = Math.min(perCol, ROWS_PER_COL) * ROW_H;
const earnH = earnRows.length ? 40 + (earnRows.length - 1) * 34 + 26 : 0;
const NATURAL_BASE = IDX_BOTTOM + 44 + listH + 82 + earnH;   // 不含 GAP
H = CFG.H;
{
  const gSquare = (CFG.H_SQUARE - 146 - NATURAL_BASE) / 3;
  if (gSquare >= 48) H = CFG.H_SQUARE;
}
const GAP = Math.max(40, Math.round((H - 146 - NATURAL_BASE) / 3));
const Y_TOP_LABEL = IDX_BOTTOM + GAP;
const LIST_TOP = Y_TOP_LABEL + 44;
const LIST_BOTTOM = LIST_TOP + listH;
const Y_BREADTH_LABEL = LIST_BOTTOM + GAP;
const Y_EARN_LABEL = Y_BREADTH_LABEL + 82 + GAP;

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

// ---------- 成交量榜 ----------
function sectionLabel(x, y, label) {
  svg.push(`<rect x="${x}" y="${y - 20}" width="6" height="24" fill="${C.amber}"/>`);
  svg.push(t(x + 18, y, label, { size: 24, fill: C.gray }));
}
sectionLabel(M, Y_TOP_LABEL, `Top ${rows.length || 20} by dollar volume`);
svg.push(t(W - M, Y_TOP_LABEL, D.volume && D.volume.metric ? 'USD' : '', { size: 22, fill: C.dim, anchor: 'end' }));

rows.forEach((r, i) => {
  const col = Math.floor(i / ROWS_PER_COL);
  const row = i % ROWS_PER_COL;
  const x = M + col * (COL_W + 40);
  const y = LIST_TOP + row * ROW_H;
  const mid = y + ROW_H / 2;

  svg.push(t(x, mid + 8, String(i + 1), { size: 20, fill: C.dim }));
  svg.push(logoAt(r.ticker, x + 30, mid + 2, 26));
  svg.push(t(x + 64, mid + 9, r.ticker, { size: 28, weight: 700 }));
  // 條：與代碼同行，位於代碼右側
  const barX = x + 178;
  const bw = Math.max(6, Math.round((r.dollar_volume || 0) / maxDV * BAR_MAX));
  svg.push(`<rect x="${barX}" y="${mid - 5}" width="${BAR_MAX}" height="10" rx="2" fill="${C.track}"/>`);
  svg.push(`<rect x="${barX}" y="${mid - 5}" width="${bw}" height="10" rx="2" fill="${pctColor(r.pct)}" opacity="0.85"/>`);
  svg.push(t(x + COL_W, mid + 9, bill(r.dollar_volume), { size: 22, fill: C.gray, anchor: 'end' }));
});

// ---------- 市場寬度 ----------
sectionLabel(M, Y_BREADTH_LABEL, `Breadth · advancers`);
svg.push(t(W - M, Y_BREADTH_LABEL, `${advPct}%`, { size: 32, weight: 700, anchor: 'end' }));
const barY = Y_BREADTH_LABEL + 22;
svg.push(`<rect x="${M}" y="${barY}" width="${CW}" height="20" rx="3" fill="#FCEBEB"/>`);
svg.push(`<rect x="${M}" y="${barY}" width="${Math.round(CW * advPct / 100)}" height="20" rx="3" fill="${C.up}"/>`);
svg.push(t(M, barY + 52, `${num(breadth.up)} up`, { size: 22, fill: C.dim }));
svg.push(t(M + CW / 2, barY + 52, `${num(breadth.down)} down`, { size: 22, fill: C.dim, anchor: 'middle' }));
const poolTag = (breadth.pool_rule === 'S&P 500 constituents') ? `${num(breadth.pool)} S&P 500 members` : `${num(breadth.pool)} names`;
svg.push(t(W - M, barY + 52, poolTag, { size: 20, fill: C.dim, anchor: 'end' }));

// ---------- 明日財報 ----------
sectionLabel(M, Y_EARN_LABEL, `Earnings · ${longDate(D.earnings && D.earnings.date || D.session)}`);
earnRows.forEach((r, i) => {
  const y = Y_EARN_LABEL + 40 + i * 34;
  svg.push(t(M, y, r.session, { size: 26 }));
  svg.push(t(W - M, y, r.tickers, { size: 26, fill: C.gray, anchor: 'end' }));
});

// ---------- 頁腳 ----------
svg.push(`<rect x="${M}" y="${H - 118}" width="${CW}" height="1" fill="${C.line}"/>`);
svg.push(t(M, H - 78, D.disclaimer || '', { size: 20, fill: C.dim }));
svg.push(t(W - M, H - 78, handle, { size: 20, fill: C.dim, anchor: 'end' }));
svg.push(t(M, H - 48, `Source: ${D.source || 'Yahoo Finance · Nasdaq'} · dollar volume = price × shares traded`, { size: 18, fill: C.dim }));

svg.push('</svg>');
svg.splice(1, 0, `<defs>${defs.join('')}</defs>`);
const svgStr = svg.join('\n');

const outDir = path.join(BASE, 'out');
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
