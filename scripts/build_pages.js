/**
 * The Close 系列 — 四頁渲染器（1080×1350）· 帶個股 logo
 *   On Deck / Winners & Losers / Earnings Week / Week Ahead
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(process.env.PAGES_DATA || path.join(BASE, 'data', 'pages.json'), 'utf8'));
const LOGO_PATH = path.join(BASE, 'data', 'logos.json');
const LOGOS = fs.existsSync(LOGO_PATH) ? JSON.parse(fs.readFileSync(LOGO_PATH, 'utf8')) : {};
const SUFFIX = process.env.CLOSE_SUFFIX || '';

const CFG = {
  W: 1080, H: 1350, H_SQUARE: 1080, M: 48,
  colors: {
    bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
    line: '#E4E7EC', amber: '#BA7517', amberBg: '#FAEEDA', amberInk: '#854F0B',
    up: '#12A263', down: '#DE3A1B', track: '#F2F4F7', chip: '#F6F7F9',
  },
  font: 'MiSans',
  watermark: { text: '@onepagemarket', size: 132, opacity: 0.055, angle: -24 },
};
const { W, M, colors: C } = CFG;
let H = CFG.H;                     // 每頁可切換：內容少 → 正方形 1080×1080
const CW = W - M * 2;

let uid = 0, defs = [];

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function t(x, y, s, o = {}) {
  const { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0 } = o;
  return `<text x="${x}" y="${y}" font-family="${CFG.font}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text>`;
}
const pctStr = (v) => (typeof v !== 'number' ? '—' : (v >= 0 ? '+' : '\u2212') + Math.abs(v).toFixed(2) + '%');
const pctColor = (v) => (typeof v === 'number' && v < 0 ? C.down : C.up);
const num = (n) => (typeof n === 'number' ? n.toLocaleString('en-US') : '—');
const clip = (s, n) => {
  const str = String(s || '');
  if (str.length <= n) return str;
  let cut = str.slice(0, n);
  const sp = cut.lastIndexOf(' ');
  if (sp > n * 0.6) cut = cut.slice(0, sp);
  return cut.trimEnd() + '…';
};

function logoAt(ticker, x, cy, size) {
  const id = `lp${uid++}`;
  const r = size / 2;
  const ring = `<circle cx="${x + r}" cy="${cy}" r="${r}" fill="none" stroke="#D6DAE1" stroke-width="1.2"/>`;
  const uri = LOGOS[ticker];
  if (!uri) {
    return `<circle cx="${x + r}" cy="${cy}" r="${r}" fill="${C.chip}"/>` + ring +
      t(x + r, cy + size * 0.2, (ticker || '?')[0], { size: size * 0.62, fill: C.gray, anchor: 'middle' });
  }
  defs.push(`<clipPath id="${id}"><circle cx="${x + r}" cy="${cy}" r="${r}"/></clipPath>`);
  // 圖不鋪滿直徑：留 4% 餘量（配合 logo 素材本身的內縮留白），避免圓形裁切切到四角
  const inner = size * 0.96;
  const off = (size - inner) / 2;
  return `<g clip-path="url(#${id})"><image x="${x + off}" y="${cy - r + off}" width="${inner}" height="${inner}" href="${uri}" image-rendering="optimizeQuality"/></g>` + ring;
}

function tickerRow(list, x, baseline, o = {}) {
  const { size = 20, gap = 14, logo = 22, max = 5 } = o;
  let out = '', cx = x;
  (list || []).slice(0, max).forEach((tk) => {
    out += logoAt(tk, cx, baseline - size * 0.34, logo);
    out += t(cx + logo + 6, baseline, tk, { size, weight: 500 });
    cx += logo + 6 + tk.length * size * 0.68 + gap;
  });
  return out;
}

function fitTitle(s, maxW, start) {
  let size = start;
  while (size > 44) {
    let w = 0;
    for (const ch of s) w += ch.charCodeAt(0) > 0x2E80 ? size : size * 0.56;
    if (w <= maxW) break;
    size -= 4;
  }
  return size;
}

function scaffold(title, sub) {
  const handle0 = D.handle || '@onepagemarket';
  const avail = CW - (Math.round(handle0.length * 17.6) + 44) - 32;
  const a = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    `<rect width="${W}" height="${H}" fill="${C.bg}"/>`];
  const wm = CFG.watermark;
  a.push(`<g transform="translate(${W / 2} ${H / 2}) rotate(${wm.angle})" opacity="${wm.opacity}">${t(0, 0, wm.text, { size: wm.size, weight: 700, anchor: 'middle', ls: 6 })}</g>`);
  a.push(t(M, 122, title, { size: fitTitle(title, avail, 80), weight: 700, ls: -1.5 }));
  a.push(t(M, 168, sub, { size: 26, fill: C.gray }));
  const pw = Math.round(handle0.length * 17.6) + 44;
  a.push(`<rect x="${W - M - pw}" y="62" width="${pw}" height="58" rx="12" fill="${C.amberBg}"/>`);
  a.push(t(W - M - pw / 2, 101, handle0, { size: 32, weight: 500, fill: C.amberInk, anchor: 'middle' }));
  a.push(`<rect x="${M}" y="200" width="${CW}" height="6" fill="${C.amber}"/>`);
  return a;
}
function finish(a) {
  // 免責區只放統一聲明，不寫 Source（阿澤 2026-10-23）
  pushFooter(t, a, { M, W, H, C, handle: D.handle || '@onepagemarket' });
  a.push('</svg>');
  return [a[0], `<defs>${defs.join('')}</defs>`, ...a.slice(1)].join('\n');
}
const section = (a, x, y, label, right) => {
  a.push(`<rect x="${x}" y="${y - 20}" width="6" height="24" fill="${C.amber}"/>`);
  a.push(t(x + 18, y, label, { size: 24, fill: C.gray }));
  if (right) a.push(t(W - M, y, right, { size: 22, fill: C.dim, anchor: 'end' }));
};
const longDate = (iso) => {
  const d = new Date(iso + 'T12:00:00');
  return isNaN(d) ? iso : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

/* ---------------- 1. On Deck ---------------- */
// 2026-11-10 改版（阿澤欽定方向：圖形化＋logo＋對比）：
//   主圖＝當日財報「本季營收預期同比增速」橫向柱狀圖，按增速降序；
//   柱色編碼上季 EPS 超預期（綠 beat / 紅 miss）；每行帶公司 logo、短名、市值、盤前/盤後。
const capStr = (v) => {
  if (!v) return '';
  const b = v / 1e9;
  return b >= 100 ? `$${Math.round(b)}B` : `$${b.toFixed(1)}B`;
};
function buildOnDeck() {
  defs = []; uid = 0;
  const o = D.ondeck || {};
  const e = o.earnings || {};
  const top = (e.top || []).slice(0, 8);
  const econ = (o.econ || []).slice(0, 2);
  H = top.length >= 7 ? CFG.H : CFG.H_SQUARE;

  const sub = [`${num(e.before_n)} pre / ${num(e.after_n)} post`]
    .concat(econ.map((x) => `${x.time || ''} ${x.event}`.trim()))
    .join(' · ');
  const a = scaffold('On Deck', `${longDate(o.session || '')} · ${num(e.total)} companies report today`);

  const areaTop = 386, areaBottom = H - 176;
  const n = Math.max(1, top.length);
  const step = n > 1 ? Math.min(112, Math.floor((areaBottom - areaTop) / (n - 1))) : 0;
  const mx = Math.max(1, ...top.map((r) => r.growth || 0));

  if (!top.length) {                       // 拿不到共識預期：退回舊式盤前/盤後 ticker 清單
    section(a, M, 300, 'Earnings today', `${num(e.before_n)} pre / ${num(e.after_n)} post`);
    a.push(tickerRow((e.before || []).slice(0, 8), M, 356, { size: 22, logo: 26, gap: 24, max: 8 }));
    a.push(tickerRow((e.after || []).slice(0, 8), M, 396, { size: 22, logo: 26, gap: 24, max: 8 }));
    a.push(t(M, 470, 'Consensus estimates unavailable for this session.', { size: 18, fill: C.dim }));
    return finish(a);
  }

  a.push(t(M, 256, 'Fastest expected revenue growth today', { size: 30, weight: 500 }));
  a.push(t(M, 292, clip(sub, 64), { size: 19, fill: C.dim }));

  // 圖例：柱色＝上季 EPS 超預期；柱長＝本季營收預期增速
  const ly = 331;
  const sq = (x, col) => `<rect x="${x}" y="${ly - 11}" width="12" height="12" rx="3" fill="${col}"/>`;
  a.push(sq(M, C.up));
  a.push(t(M + 20, ly, 'beat last quarter', { size: 17, fill: C.gray }));
  a.push(sq(M + 196, C.down));
  a.push(t(M + 216, ly, 'missed last quarter', { size: 17, fill: C.gray }));
  a.push(t(W - M, ly, 'bar = consensus revenue growth, YoY', { size: 17, fill: C.dim, anchor: 'end' }));

  const BX = 404, BW = 488, BH = 47;      // 柱區：404 → 892（柱高 1.8×，2026-11-10 阿澤定）
  top.forEach((r, i) => {
    const y = areaTop + i * step;
    a.push(logoAt(r.ticker, M, y, 46));
    a.push(t(M + 60, y - 2, r.ticker, { size: 28, weight: 700 }));
    a.push(t(M + 60, y + 22, clip(`${r.name}${r.cap ? ' · ' + capStr(r.cap) : ''}${r.time ? ' · ' + r.time : ''}`, 30),
      { size: 16, fill: C.dim }));

    a.push(`<rect x="${BX}" y="${y - BH / 2}" width="${BW}" height="${BH}" rx="4" fill="${C.track}"/>`);
    const g = r.growth || 0;
    const bw = Math.max(8, Math.round(Math.abs(g) / mx * BW));
    const col = typeof r.surprise === 'number' ? (r.surprise < 0 ? C.down : C.up) : C.amber;
    a.push(`<rect x="${BX}" y="${y - BH / 2}" width="${bw}" height="${BH}" rx="4" fill="${col}" opacity="0.9"/>`);

    a.push(t(W - M, y + 2, `${g >= 0 ? '+' : '\u2212'}${Math.abs(g).toFixed(1)}%`,
      { size: 30, weight: 700, anchor: 'end', fill: g < 0 ? C.down : C.ink }));
    if (typeof r.eps === 'number') {
      const eps = `${r.eps < 0 ? '\u2212' : ''}$${Math.abs(r.eps).toFixed(2)}`;
      a.push(t(W - M, y + 26, `EPS ${eps}`, { size: 16, fill: C.dim, anchor: 'end' }));
    }
  });

  return finish(a);
}

/* ---------------- 2. Winners & Losers ---------------- */
// 週榜窗口標籤：ISO（2026-10-19）→ 'Oct 19'；已是 'Oct 13' 之類則原樣
const fmtDay = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) return s || '—';
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${M[Number(m[2]) - 1]} ${Number(m[3])}`;
};
function buildWinners() {
  defs = []; uid = 0;
  H = CFG.H;
  const w = D.winners || {};
  const a = scaffold('Winners & Losers', `${fmtDay(w.from)} → ${fmtDay(w.to)} · ${num(w.universe)} names`);
  const gain = (w.gainers || []).slice(0, 10);
  const lose = (w.losers || []).slice(0, 10);
  const mx = Math.max(1, ...gain.concat(lose).map((r) => Math.abs(r.pct || 0)));
  const colW = (CW - 48) / 2;

  const drawCol = (rows, x, label, color) => {
    section(a, x, 286, label, rows.length ? `${rows.length}` : '');
    rows.forEach((r, i) => {
      const y = 336 + i * 84;
      a.push(t(x, y, String(i + 1), { size: 20, fill: C.dim }));
      a.push(logoAt(r.ticker, x + 28, y - 10, 30));
      a.push(t(x + 66, y, r.ticker, { size: 30, weight: 700 }));
      a.push(t(x + colW, y, pctStr(r.pct), { size: 28, weight: 700, fill: color, anchor: 'end' }));
      const bw = Math.max(6, Math.round(Math.abs(r.pct || 0) / mx * (colW - 40)));
      a.push(`<rect x="${x}" y="${y + 16}" width="${colW}" height="10" rx="2" fill="${C.track}"/>`);
      a.push(`<rect x="${x}" y="${y + 16}" width="${bw}" height="10" rx="2" fill="${color}" opacity="0.85"/>`);
    });
  };
  drawCol(gain, M, 'Top 10', C.up);
  drawCol(lose, M + colW + 48, 'Bottom 10', C.down);

  a.push(t(M, 1206, 'Ranked by weekly return · US-listed stocks (market cap > $2B)', { size: 20, fill: C.dim }));
  return finish(a);
}

/* ---------------- 3. Week Ahead ---------------- */
function buildWeekAhead() {
  defs = []; uid = 0;
  H = CFG.H;
  const days = (D.week_ahead || {}).days || [];
  const scope = (D.week_ahead || {}).scope || 'next week';
  const a = scaffold('Week Ahead', `${days.length ? days[0].date : ''} – ${days.length ? days[days.length - 1].date : ''} · ${scope}`);

  // 5 天在金色橫線以下整個區域「平均分配」，不再整塊居中
  const areaTop = 250, areaBottom = H - 126;
  const RH = Math.floor((areaBottom - areaTop) / Math.max(1, days.length));
  const TX = M + 570;                    // 右側個股區起點（與左側數據留出間距）
  days.forEach((d, i) => {
    const y = areaTop + i * RH;
    if (i > 0) a.push(`<rect x="${M}" y="${y}" width="${CW}" height="1" fill="${C.line}"/>`);  // 第一行不畫線（上方已有金色粗橫線）
    const mid = y + RH / 2;

    a.push(t(M, mid - 16, d.day, { size: 30, weight: 500 }));
    a.push(t(M, mid + 16, d.date, { size: 20, fill: C.dim }));

    // 經濟數據 3-4 行（帶序號），行距放寬、垂直居中
    const econ = (d.econ || []).slice(0, 4);
    const step = 34;
    const n = Math.max(1, econ.length);
    const sy = mid - (n * step) / 2 + step / 2 + 9;
    econ.forEach((ev, j) => {
      a.push(t(M + 118, sy + j * step, `${j + 1}`, { size: 20, fill: C.dim }));
      a.push(t(M + 146, sy + j * step, clip(ev, 29), { size: 24 }));
    });
    if (!econ.length) a.push(t(M + 118, mid + 9, '—', { size: 24, fill: C.dim }));

    // 右側：盤前 / 盤後 財報（各最多 8 家，兩行），行距放寬
    const groups = [['Pre', d.before || [], -46], ['Post', d.after || [], 16]];
    groups.forEach(([lab, list, dy]) => {
      if (!list.length) return;          // 無財報的日子不顯示空標籤
      a.push(t(TX, mid + dy + 6, lab, { size: 16, fill: C.dim }));
      const r1 = list.slice(0, 4), r2 = list.slice(4, 8);
      a.push(tickerRow(r1, TX + 46, mid + dy + 6, { size: 17, logo: 17, gap: 12, max: 4 }));
      if (r2.length) a.push(tickerRow(r2, TX + 46, mid + dy + 36, { size: 17, logo: 17, gap: 12, max: 4 }));
    });
  });

  return finish(a);
}

/* ---------------- 輸出 ---------------- */
// 字體：專案內 assets/fonts（雲端 CI 用）優先，退回系統字體
const FONT_DIRS = [path.join(BASE, 'assets', 'fonts'),
                   path.join(process.env.HOME || '', 'Library', 'Fonts')];
const fontFiles = ['MiSans-Bold.ttf', 'MiSans-Medium.ttf', 'MiSans-Regular.ttf']
  .map((f) => FONT_DIRS.map((d) => path.join(d, f)).find((p) => fs.existsSync(p)))
  .filter(Boolean);
// 調排版用：PAGE=ondeck 只渲一頁；PREVIEW=1 寫到 out/_preview/（不污染正式產物與 git）
const ONLY = (process.env.PAGE || '').trim();
const PREVIEW = !!process.env.PREVIEW;
const outDir = path.join(BASE, 'out', PREVIEW ? '_preview' : '');
fs.mkdirSync(outDir, { recursive: true });
const stamp = process.env.PAGES_STAMP || new Date().toISOString().slice(0, 10).replace(/-/g, '');

[['on-deck', buildOnDeck], ['winners-losers', buildWinners],
 ['week-ahead', buildWeekAhead]]
  .filter(([name]) => !ONLY || name === ONLY).forEach(([name, fn]) => {
  const svg = fn();
  fs.writeFileSync(path.join(outDir, `${name}-${stamp}${SUFFIX}.svg`), svg);
  const png = new Resvg(svg, {
    // 2× 超采樣，由 downscale_png.py 縮回（見 build_close.js 註釋）
    fitTo: { mode: 'width', value: W * 2 },
    font: { fontFiles, loadSystemFonts: true, defaultFontFamily: CFG.font },
    background: C.bg,
  }).render().asPng();
  fs.writeFileSync(path.join(outDir, `${name}-${stamp}${SUFFIX}.png`), png);
  console.log('PNG ->', `${name}-${stamp}${SUFFIX}.png`, `(${(png.length / 1024).toFixed(0)} KB)`);
});
