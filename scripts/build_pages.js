/**
 * The Close 系列 — 四頁渲染器（1080×1350）· 帶個股 logo
 *   On Deck / Winners & Losers / Earnings Week / Week Ahead
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

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
  return `<g clip-path="url(#${id})"><image x="${x}" y="${cy - r}" width="${size}" height="${size}" href="${uri}"/></g>` + ring;
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
  a.push(`<rect x="${M}" y="${H - 118}" width="${CW}" height="1" fill="${C.line}"/>`);
  a.push(t(M, H - 78, D.disclaimer || '', { size: 20, fill: C.dim }));
  a.push(t(W - M, H - 78, D.handle || '@onepagemarket', { size: 20, fill: C.dim, anchor: 'end' }));
  a.push(t(M, H - 48, `Source: ${D.source || ''}`, { size: 18, fill: C.dim }));
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
function buildOnDeck() {
  defs = []; uid = 0;
  const o = D.ondeck || {};
  const e = o.earnings || {};
  const econ = (o.econ || []).slice(0, 10);
  const nE = econ.length;

  // 內容少 → 正方形 1080×1080（不硬撐 1350 留白）
  const rawBottom = 446 + Math.max(0, nE - 1) * 48 + 58 + 172 + 56 + 42;
  H = rawBottom <= 1000 ? CFG.H_SQUARE : CFG.H;

  // 依目標底邊反推行距，把內容均勻撐滿版心（上限 96，避免過散）
  const target = H - 146;
  const s0 = (target - 660) / (nE + 1.2);
  const s = Math.max(46, Math.min(96, s0));
  const econStep = Math.round(s);
  const gap1 = Math.round(s * 1.2);
  const pairStep = Math.max(56, Math.round(s * 1.05));

  const a = scaffold('On Deck', `${longDate(o.session || '')} · ${o.slot || 'pre-market'}`);
  const econY = (i) => 446 + i * econStep;
  const y2 = econY(Math.max(0, nE - 1)) + gap1;              // 'Companies report today'
  const yE = y2 + 68 + 56;                                   // Earnings section
  const pairY = (i) => yE + 48 + i * pairStep;
  const bottom = pairY(1) + 42;
  const shift = Math.max(0, Math.min(120, Math.round((target - bottom) / 2)));
  const Y = (v) => v + shift;

  a.push(t(M, Y(262), 'Econ events', { size: 22, fill: C.dim }));
  a.push(t(M, Y(332), String(o.econ_all ?? nE), { size: 72, weight: 700, ls: -2 }));

  section(a, M, Y(396), 'Econ · US', 'time ET');
  econ.forEach((ev, i) => {
    const y = Y(econY(i));
    a.push(t(M, y, ev.time || '—', { size: 24, fill: C.gray }));
    a.push(t(M + 96, y, clip(ev.event, 38), { size: 26 }));
    if (ev.consensus) a.push(t(W - M, y, `cons ${ev.consensus}`, { size: 22, fill: C.dim, anchor: 'end' }));
  });
  if (!nE) a.push(t(M, Y(446), '—', { size: 24, fill: C.dim }));

  a.push(t(M, Y(y2), 'Companies report today', { size: 22, fill: C.dim }));
  a.push(t(M, Y(y2 + 68), String(e.total ?? '—'), { size: 72, weight: 700, ls: -2 }));

  section(a, M, Y(yE), 'Earnings', `${num(e.before_n)} pre / ${num(e.after_n)} post`);
  const pairs = [['Before open', (e.before || []).slice(0, 8)], ['After close', (e.after || []).slice(0, 8)]];
  pairs.forEach(([label, list], i) => {
    const y = Y(pairY(i));
    a.push(t(M, y, label, { size: 22, fill: C.dim }));
    a.push(tickerRow(list, M, y + 32, { size: 22, logo: 26, gap: 24, max: 8 }));
  });

  return finish(a);
}

/* ---------------- 2. Winners & Losers ---------------- */
function buildWinners() {
  defs = []; uid = 0;
  H = CFG.H;
  const w = D.winners || {};
  const a = scaffold('Winners & Losers', `${w.from || '—'} → ${w.to || '—'} · ${num(w.universe)} names`);
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

  a.push(t(M, 1206, 'Ranked by weekly return · same universe as The Close', { size: 20, fill: C.dim }));
  return finish(a);
}

/* ---------------- 3. Week Ahead ---------------- */
function buildWeekAhead() {
  defs = []; uid = 0;
  H = CFG.H;
  const days = (D.week_ahead || {}).days || [];
  const a = scaffold('Week Ahead', `${days.length ? days[0].date : ''} – ${days.length ? days[days.length - 1].date : ''} · next week`);

  const BLOCK = 180, areaTop = 250, areaBottom = H - 126;
  const contentH = days.length * BLOCK;
  const start = Math.round(areaTop + Math.max(0, (areaBottom - areaTop - contentH) / 2));

  const TX = M + 558;                    // 右側個股區起點
  days.forEach((d, i) => {
    const y = start + i * BLOCK;
    a.push(`<rect x="${M}" y="${y}" width="${CW}" height="1" fill="${C.line}"/>`);
    const mid = y + BLOCK / 2;

    a.push(t(M, mid - 14, d.day, { size: 30, weight: 500 }));
    a.push(t(M, mid + 14, d.date, { size: 20, fill: C.dim }));
    // 每天：經濟數據數 + 財報家數（右下角，避開左側數據列表）
    const econN = d.econ_n != null ? d.econ_n : (d.econ || []).length;
    a.push(t(W - M, mid + 44, `${econN} events · ${num(d.count)} reports`, { size: 16, fill: C.dim, anchor: 'end' }));

    // 經濟數據 3-4 行（帶序號），垂直居中
    const econ = (d.econ || []).slice(0, 4);
    const step = 29;
    const n = Math.max(1, econ.length);
    const sy = mid - (n * step) / 2 + step / 2 + 9;
    econ.forEach((ev, j) => {
      a.push(t(M + 118, sy + j * step, `${j + 1}`, { size: 20, fill: C.dim }));
      a.push(t(M + 146, sy + j * step, clip(ev, 31), { size: 24 }));
    });
    if (!econ.length) a.push(t(M + 118, mid + 9, '—', { size: 24, fill: C.dim }));

    // 個股一行 5 個（右側），垂直居中
    a.push(tickerRow(d.earn || [], TX, mid + 7, { size: 18, logo: 18, gap: 12, max: 5 }));
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
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');

[['on-deck', buildOnDeck], ['winners-losers', buildWinners],
 ['week-ahead', buildWeekAhead]]
  .filter(([name]) => !ONLY || name === ONLY).forEach(([name, fn]) => {
  const svg = fn();
  fs.writeFileSync(path.join(outDir, `${name}-${stamp}${SUFFIX}.svg`), svg);
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: W },
    font: { fontFiles, loadSystemFonts: true, defaultFontFamily: CFG.font },
    background: C.bg,
  }).render().asPng();
  fs.writeFileSync(path.join(outDir, `${name}-${stamp}${SUFFIX}.png`), png);
  console.log('PNG ->', `${name}-${stamp}${SUFFIX}.png`, `(${(png.length / 1024).toFixed(0)} KB)`);
});
