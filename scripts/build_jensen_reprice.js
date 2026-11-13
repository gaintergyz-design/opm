/**
 * OPM 專題卡 · Jensen Exit Repricing · 1080×1350
 *
 * 依阿澤 2026-11-13 提供之中文報導重製（全英文卡）：黃仁勳離任傳聞 →
 * 新雲（neocloud）與輝達生態鏈承壓、競爭對手 AMD/博通受益、儲存鏈受波及。
 *
 * 版面：① 10 列 diverging bar（11/12 單日漲跌）＋右欄 8 日累計
 *       ② 四個模組各自極淡底色（2026-11-13 阿澤）
 *       ③ 右上 OPM 標識、統一頁腳聲明；折線圖已移除。
 *
 * 🔴 兩欄口徑必須分清（表頭已寫死在 data json）：
 *      中間柱 = NOV 12 (1 DAY) 單日；右欄 = SINCE NOV 2 (8 SESSIONS) 累計。
 *      單日看事件當天重定價方向，累計看事件前的趨勢背景，避免把整段走勢誤算成傳聞影響。
 *
 * 🔴 全卡英文、純淺底、**不渲染任何斜紋水印**（2026-11-13 阿澤欽定）。
 * 🔴 配色：漲 #00A98C（teal）／跌 #F1541E（橘紅），文字用同色系深版 ink。
 *
 * 資料：data/jensen-reprice.json（Yahoo Finance chart 11/12 收盤，SK hynix 為 KRX）
 * 用法：NODE_PATH=./node_modules node scripts/build_jensen_reprice.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');
const { brandMark } = require('./lib/brand');
const { textWidth } = require('./lib/fontwidths');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'jensen-reprice.json'), 'utf8'));
const LOGOS = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'logos.json'), 'utf8'));

const W = 1080, H = 1350, M = 48, CW = W - M * 2;
const C = {
  bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
  line: '#E4E7EC', track: '#F2F4F7', body: '#3A4453',
  gain: '#00A98C', gainInk: '#007A66', gainTint: '#E6F7F3',
  loss: '#F1541E', lossInk: '#B93C0B', lossTint: '#FDEDE7',
  blue: '#2B6FE8', gold: '#FFB01C',
};
const FONT = 'MiSans';
const handle = '@onepagemarket';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function t(x, y, s, { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0, op = 1 } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}" opacity="${op}">${esc(s)}</text>`;
}
const rr = (x, y, w, h, r, fill, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;
const tw = (s, size, weight = 400) => textWidth(s, size, weight);
const fit = (s, size, max, weight = 700) =>
  tw(s, size, weight) > max ? Math.floor(size * max / tw(s, size, weight)) : size;
const pct = (v) => `${v >= 0 ? '+' : '-'}${Math.abs(v).toFixed(1)}%`;

let uid = 0;
const defs = [];
/** 圓形白底 logo 徽章；IREN 為寬幅字標，改用圓角方徽章 contain */
function logoAt(ticker, x, cy) {
  const uri = LOGOS[ticker];
  if (!uri) {
    return `<circle cx="${x + 23}" cy="${cy}" r="23" fill="#F6F7F9" stroke="#D6DAE1" stroke-width="1.2"/>` +
      t(x + 23, cy + 7, ticker[0], { size: 21, weight: 700, fill: C.gray, anchor: 'middle' });
  }
  if (ticker === 'IREN') {
    // 寬幅字標：方徽章 contain，不裁切
    return rr(x - 6, cy - 21, 58, 42, 10, '#FFFFFF', `stroke="#E4E7EC" stroke-width="1.2"`) +
      `<image x="${x}" y="${cy - 17}" width="46" height="34" href="${uri}" preserveAspectRatio="xMidYMid meet"/>`;
  }
  const id = `lp${uid++}`, r = 23, cx = x + r;
  defs.push(`<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>`);
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#FFFFFF" stroke="#E4E7EC" stroke-width="1.2"/>` +
    `<g clip-path="url(#${id})"><image x="${cx - 20}" y="${cy - 20}" width="40" height="40" href="${uri}" preserveAspectRatio="xMidYMid meet"/></g>`;
}

/* ---------------- 骨架（無水印） ---------------- */
const a = [];
a.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
defs.push(`<linearGradient id="bgG" x1="0" y1="0" x2="0.3" y2="1">
  <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.58" stop-color="#FAFCFE"/>
  <stop offset="1" stop-color="#F1F5F9"/></linearGradient>`);
defs.push(`<linearGradient id="ruleG" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#00A98C"/><stop offset="0.52" stop-color="#FFB01C"/>
  <stop offset="1" stop-color="#F1541E"/></linearGradient>`);
a.push(rr(0, 0, W, H, 0, 'url(#bgG)'));
brandMark(a, { W, M, cy: 91, h: 36 });

a.push(t(M, 70, D.kicker, { size: 16, weight: 500, fill: '#8B95A5', ls: 3 }));
a.push(t(M, 148, D.title, { size: fit(D.title, 66, CW - 104), weight: 700, ls: -1.6 }));
a.push(t(M, 190, D.subtitle, { size: fit(D.subtitle, 22, CW - 100, 400), fill: C.gray }));
a.push(rr(M, 212, CW, 6, 3, 'url(#ruleG)'));

/* ---------------- 表頭 ---------------- */
// ZERO 右移 + SCALE 微縮：最長負柱（NBIS -16.8%）的條尾數字不撞左欄 ticker
const ZERO = 590, SCALE = 14.5, BAR_H = 46, ROW_H = 70, GROUP_H = 42, GROUP_GAP = 14;
const PLOT_L = 284, PLOT_R = 832, RIGHT_X = W - M;
a.push(t(PLOT_L, 246, D.col_day, { size: 14, weight: 500, fill: C.gray, ls: 1.6 }));
a.push(t(RIGHT_X, 246, D.col_since, { size: 14, weight: 500, fill: C.gray, anchor: 'end', ls: 1.6 }));
// 圖例
a.push(rr(PLOT_L + 214, 235, 13, 13, 3, C.gain));
a.push(t(PLOT_L + 233, 246, D.legend_gain, { size: 13, weight: 500, fill: C.gray }));
a.push(rr(PLOT_L + 296, 235, 13, 13, 3, C.loss));
a.push(t(PLOT_L + 315, 246, D.legend_loss, { size: 13, weight: 500, fill: C.gray }));
// 無 0 軸豎線、無條尾刻度（2026-11-13 阿澤）：只靠條的方向與顏色分正負
// 模組淡底色：方向組用極淡的漲/跌色，中性組用極淡灰；都近白，不搶柱條
const GROUP_TINT = {
  RIVALS: '#EBF8F4',
  NEOCLOUDS: '#FDF0E9',
  'NVIDIA & SUPPLY CHAIN': '#F1F4F9',
  MEMORY: '#F5F7FA',
};
let cursor = 270;
D.groups.forEach((g) => {
  // 底色先畫，才不會蓋住標題／柱條／logo；左右各外擴 14，讓內容有內邊距
  const blockH = GROUP_H + g.rows.length * ROW_H;
  a.push(rr(M - 14, cursor - 4, CW + 28, blockH + 4, 18, GROUP_TINT[g.name] || '#F5F7FA'));
  // 組標題：細色條 + 大寫組名 + 中性 tag
  const accent = g.name === 'RIVALS' ? C.gain : (g.name === 'NEOCLOUDS' ? C.loss : '#8B95A5');
  a.push(rr(M, cursor + 2, 6, 21, 3, accent));
  a.push(t(M + 18, cursor + 20, g.name, { size: 19, weight: 700, ls: 1.8 }));
  cursor += GROUP_H;

  g.rows.forEach((r) => {
    const cy = cursor + ROW_H / 2;
    const pos = r.day >= 0;
    const col = pos ? C.gain : C.loss;
    const ink = pos ? C.gainInk : C.lossInk;
    const w = Math.min(Math.abs(r.day) * SCALE, 274);

    // 左欄：logo + ticker + 公司名
    a.push(logoAt(r.ticker, 52, cy));
    a.push(t(126, cy - 3, r.ticker, { size: 26, weight: 700 }));
    a.push(t(126, cy + 21, r.name, { size: 15, weight: 400, fill: C.gray }));

    // 條：無 0 軸豎線、無條頭細豎條、無刻度，條尾外側大數字
    const bx = pos ? ZERO : ZERO - w;
    a.push(rr(bx, cy - BAR_H / 2, w, BAR_H, 10, col));
    const numX = pos ? ZERO + w + 12 : ZERO - w - 12;
    a.push(t(numX, cy + 11, pct(r.day), {
      size: 30, weight: 700, fill: ink, anchor: pos ? 'start' : 'end',
    }));

    // 右欄：8 日累計
    const sPos = r.since >= 0;
    a.push(t(RIGHT_X, cy + 9, pct(r.since), {
      size: 23, weight: 700, fill: sPos ? C.gainInk : C.lossInk, anchor: 'end',
    }));
    cursor += ROW_H;
  });
  cursor += GROUP_GAP;
});

/* ---------------- 底部註記（折線圖已移除，2026-11-13 阿澤） ---------------- */
a.push(t(M, 1206, `Also lower: ${D.sk_hynix.name} ${pct(D.sk_hynix.day)} (${D.sk_hynix.note}).`,
  { size: 15, fill: C.gray }));

pushFooter(t, a, { M, W, H, C: { line: C.line, dim: C.dim }, meta: D.asof, handle });
a.push('</svg>');
a.splice(1, 0, `<defs>${defs.join('')}</defs>`);
const svgStr = a.join('\n');

const outDir = path.join(BASE, 'out');
fs.mkdirSync(outDir, { recursive: true });
const stem = `jensen-reprice-${D.stamp}`;
fs.writeFileSync(path.join(outDir, `${stem}.svg`), svgStr);

const sub = path.join(BASE, 'assets', 'fonts');
const full = path.join(process.env.HOME || '', 'Library', 'Fonts');
const fontFiles = ['MiSans-Bold.ttf', 'MiSans-Medium.ttf', 'MiSans-Regular.ttf']
  .map((f) => [path.join(sub, f), path.join(full, f)].find((p) => fs.existsSync(p)))
  .filter(Boolean);
const png = new Resvg(svgStr, {
  fitTo: { mode: 'width', value: W * 2 },
  font: { fontFiles, loadSystemFonts: true, defaultFontFamily: FONT },
  background: C.bg,
}).render().asPng();
const out = path.join(outDir, `${stem}.png`);
fs.writeFileSync(out, png);
console.log('PNG ->', out, `(${(png.length / 1024).toFixed(0)} KB)`);
