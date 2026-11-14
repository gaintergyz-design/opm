/**
 * OPM 專題卡：Santa Rally vs. The January Bill · 1080x1350
 *
 * 來源：富途牛牛〈傳統的聖誕行情，今年的美股還有嗎？〉(2026-11-14)，
 *       總結高盛 Cosimo Codacci-Pisanelli 2026-11-13 宏觀報告。
 * 數據：人工核實後寫在 data/santa-rally.json（禁止手改卡面文字）。
 * 版式 v2（2026-11-14 阿澤）：去掉標題下「三欄並列 chips」這條路徑依賴，
 *       省下的空間全部還給字級與留白 — 標題 72、副標 25、要點標 32、
 *       內文 24、行高 100 → 160、區塊間距 22 → 26。
 * 骨架：OPM 共用 scaffold（手柄 pill / 標題 / 亮金規則線 / 統一頁腳）。
 * 🔴 全英文、無斜紋水印（SKILL §4 / §5）、綠往藍偏、紅往橙偏、亮金亮橙。
 *
 * 用法：
 *   NODE_PATH=./node_modules node scripts/build_santa_rally.js
 *   PREVIEW=1 NODE_PATH=./node_modules node scripts/build_santa_rally.js   # 寫 out/_preview/
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'santa-rally.json'), 'utf8'));

const W = 1080, H = 1350, M = 48, CW = W - M * 2;
const FONT = 'MiSans';
const C = {
  bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
  line: '#E4E7EC', soft: '#F6F7F9',
  gold: '#FFB01C', goldDeep: '#FF8A1E', goldInk: '#854F0B', goldBg: '#FAEEDA',
};
const ACCENT = {
  teal:   { solid: '#00A98C', ink: '#06705E', bg: '#E6F7F3' },
  orange: { solid: '#F1541E', ink: '#B63A0F', bg: '#FEEDE7' },
};

/* ---- 工具 ---- */
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function t(x, y, s, { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0 } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text>`;
}
const rrect = (x, y, w, h, r, fill, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;

/* ---- 畫布 ---- */
const defs = [];
const svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
defs.push(`<linearGradient id="bgG" x1="0" y1="0" x2="0.3" y2="1">
  <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.6" stop-color="#FBFCFE"/>
  <stop offset="1" stop-color="#F2F5F9"/></linearGradient>`);
defs.push(`<linearGradient id="ruleG" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="${C.gold}"/><stop offset="1" stop-color="${C.goldDeep}"/></linearGradient>`);
svg.push(`<rect width="${W}" height="${H}" fill="url(#bgG)"/>`);
/* 🔴 不加斜紋水印 */

/* ---- 手柄 pill（上移，讓標題能放到 72px 且不與 pill 相撞）---- */
const handle = '@onepagemarket';
const pillW = 38 + 27 * 0.62 * handle.length;
svg.push(rrect(W - M - pillW, 56, pillW, 50, 12, C.goldBg));
svg.push(t(W - M - pillW / 2, 89, handle, { size: 27, weight: 500, fill: C.goldInk, anchor: 'middle' }));

/* ---- 標題：基線在 pill 下方，可用整行寬度，不再為 pill 讓寬 ---- */
const approx = (s, sz, w = 700) => [...s].reduce((a, ch) => a + (/[A-Z0-9]/.test(ch) ? 0.66 : ch === ' ' ? 0.28 : /[a-z]/.test(ch) ? 0.54 : 0.6), 0) * sz * (w >= 600 ? 1.02 : 1);
const avail = CW - 24;
const TS = Math.min(70, Math.floor(70 * avail / approx(D.headline, 70)));
svg.push(t(M, 186, D.headline, { size: TS, weight: 700, ls: -2 }));
svg.push(t(M, 234, D.subtitle[0], { size: 25, fill: C.gray }));
svg.push(t(M, 268, D.subtitle[1], { size: 25, fill: C.gray }));
svg.push(`<rect x="${M}" y="296" width="${CW}" height="3" fill="url(#ruleG)" rx="1.5"/>`);

/* ---- 兩個對照區塊（無 chips；行高與字級全面放大）---- */
const HEAD_H = 54, ROW_H = 160, LABEL_X = M + 82;
let cursor = 326;
D.sections.forEach((sec) => {
  const a = ACCENT[sec.accent];
  svg.push(rrect(M, cursor, CW, HEAD_H, 10, a.bg));
  svg.push(rrect(M, cursor, 6, HEAD_H, 3, a.solid));
  svg.push(t(M + 26, cursor + 36, sec.label, { size: 24, weight: 700, fill: a.ink, ls: 1.2 }));
  svg.push(t(W - M - 24, cursor + 35, sec.tag, { size: 15, weight: 500, fill: a.ink, anchor: 'end', ls: 1 }));
  cursor += HEAD_H + 18;

  sec.rows.forEach((row, ri) => {
    const y = cursor + ri * ROW_H;
    const blockH = 40 + row.lines.length * 32;
    const top = y + (ROW_H - blockH) / 2;
    const labelY = top + 30;
    /* 序號徽章 */
    svg.push(rrect(M, top + 6, 54, 54, 14, a.bg));
    svg.push(t(M + 27, top + 44, String(ri + 1), { size: 24, weight: 700, fill: a.ink, anchor: 'middle' }));
    /* 要點標題 + 細節行 */
    svg.push(t(LABEL_X, labelY, row.label, { size: 32, weight: 700, fill: C.ink }));
    row.lines.forEach((line, li) => {
      svg.push(t(LABEL_X, labelY + 40 + li * 32, line, { size: 24, fill: C.gray }));
    });
    if (ri < sec.rows.length - 1) {
      svg.push(`<line x1="${M}" y1="${y + ROW_H}" x2="${W - M}" y2="${y + ROW_H}" stroke="${C.line}" stroke-width="1"/>`);
    }
  });
  cursor += ROW_H * sec.rows.length + 26;
});

/* ---- 收尾帶 ---- */
{
  const y = 1150, h = 62;
  svg.push(rrect(M, y, CW, h, 12, C.soft));
  svg.push(rrect(M, y, 6, h, 3, C.gold));
  svg.push(t(M + 24, y + 30, D.takeaway[0], { size: 22, weight: 700, fill: C.ink }));
  svg.push(t(M + 24, y + 52, D.takeaway[1], { size: 13, fill: C.dim }));
}

/* ---- 頁尾 ---- */
pushFooter(t, svg, { M, W, H, C, handle, meta: D.as_of });

svg.push('</svg>');
svg.splice(1, 0, `<defs>${defs.join('')}</defs>`);
const svgStr = svg.join('\n');

const outDir = path.join(BASE, 'out', process.env.PREVIEW ? '_preview' : '');
fs.mkdirSync(outDir, { recursive: true });
const stem = D.stem;
fs.writeFileSync(path.join(outDir, `${stem}.svg`), svgStr);

const FONT_DIRS = [path.join(BASE, 'assets', 'fonts'), path.join(process.env.HOME || '', 'Library', 'Fonts')];
const fontFiles = ['MiSans-Bold.ttf', 'MiSans-Medium.ttf', 'MiSans-Regular.ttf']
  .map((f) => FONT_DIRS.map((d) => path.join(d, f)).find((p) => fs.existsSync(p)))
  .filter(Boolean);

const png = new Resvg(svgStr, {
  fitTo: { mode: 'width', value: W * 2 },
  font: { fontFiles, loadSystemFonts: true, defaultFontFamily: FONT },
  background: C.bg,
}).render().asPng();
const out = path.join(outDir, `${stem}.png`);
fs.writeFileSync(out, png);
console.log('PNG ->', out, `(${(png.length / 1024).toFixed(0)} KB, ${W}x${H} @2x)`);

/* gen-times（畫廊時間戳第一層；推送前另與遠端 union） */
const genFile = path.join(outDir, 'gen-times.json');
let genMap = {};
try { genMap = JSON.parse(fs.readFileSync(genFile, 'utf8')); } catch (e) {}
genMap[`${stem}.png`] = Math.floor(Date.now() / 1000);
fs.writeFileSync(genFile, JSON.stringify(genMap));

/* 文案（X：只寫數字與事實、單句 <=90、全文 <=280） */
const CAPTION = D.caption;
fs.writeFileSync(path.join(outDir, `caption-${stem}.txt`), CAPTION);
console.log('caption chars:', CAPTION.length);
CAPTION.split('\n').forEach((line) => {
  if (line.length > 90) console.log('  ⚠ 單句超過 90 字元：', line.length, line);
});
