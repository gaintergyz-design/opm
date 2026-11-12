/**
 * OPM-專題卡：Nvidia CEO Succession Odds（黃仁勳接班人賠率）· 1080×1350
 *
 * 觸發：把「圖解財經」黃仁勳卸任概率卡（2026-11-11）重製為 OPM 格式。
 * 數據（人工核實，源自圖解財經卡 + 公開報導交叉驗證，禁止手改）：
 *   - Kalshi：黃仁勳 2027 年 7 月前卸任英偉達 CEO 隱含概率 40%。
 *   - Polymarket 接班人盤口（截至北京時間 2026-11-11 16:00，成交額小、僅供參考）：
 *     Jay Puri 21% / Madison Huang 8% / Lisa Su 8% / Colette Kress 5% /
 *     Debora Shoquist 3% / Bill Dally 3%。
 *
 * 用法：
 *   NODE_PATH=./node_modules node scripts/build_succession.js
 *   PREVIEW=1 node scripts/build_succession.js     # 寫 out/_preview/
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');

const BASE = path.join(__dirname, '..');
const W = 1080, H = 1350, M = 48, CW = W - M * 2;
const FONT = 'MiSans';
const C = {
  bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
  line: '#E4E7EC', track: '#F2F4F7', chip: '#F6F7F9',
  amber: '#BA7517', amberBg: '#FAEEDA', amberInk: '#854F0B',
  hdrBg: '#161B26',
  nvda: '#4E7A00', nvdaBg: '#F0F6E2',     // NVIDIA 人選徽章
  amd: '#B02A2A', amdBg: '#FBEAEA',       // 外部人選徽章（AMD）
};

/* ---- 數據（人工核實）---- */
const KALSHI = 40;                       // Kalshi：2027-07 前卸任 CEO 概率 %
const AS_OF = 'Nov 11, 2026, 4:00 pm Beijing time';
const DATA = [
  { name: 'Jay Puri',           role: ['Senior advisor — led global sales', '& partnerships; left exec role Aug 2026'], joined: '2005', odds: 21, co: 'nvda' },
  { name: 'Madison Huang',      role: ['Senior director, physical AI product', '& technical marketing — Huang\u2019s daughter'], joined: '2020', odds: 8,  co: 'nvda' },
  { name: 'Lisa Su',            role: ['Chair & CEO of AMD — the only candidate', 'with no Nvidia operating record'], joined: '\u2014', odds: 8,  co: 'amd' },
  { name: 'Colette Kress',      role: ['EVP & Chief Financial Officer,', 'at Nvidia since Sept 2013'], joined: '2013', odds: 5,  co: 'nvda' },
  { name: 'Debora Shoquist',    role: ['EVP, operations — manufacturing,', 'supply chain & workforce'], joined: '2007', odds: 3,  co: 'nvda' },
  { name: 'Bill Dally',         role: ['Chief scientist; SVP,', 'Nvidia Research'], joined: '2009', odds: 3,  co: 'nvda' },
];

/* ---- 頭像（圓形裁切；來源：Polymarket 截圖 2026-11-12 阿澤提供，存 assets/succession/）----
 * 缺檔時自動退回首字母徽章，不影響出圖。 */
const AVATARS = {
  'Jay Puri': 'puri', 'Madison Huang': 'madison', 'Lisa Su': 'lisa',
  'Colette Kress': 'kress', 'Debora Shoquist': 'shoquist', 'Bill Dally': 'dally',
};
const avatarDataUri = {};
for (const [name, f] of Object.entries(AVATARS)) {
  const p = path.join(BASE, 'assets', 'succession', f + '.png');
  if (fs.existsSync(p)) avatarDataUri[name] = 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
}

/* ---- 工具 ---- */
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function t(x, y, s, { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0 } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text>`;
}
const rrect = (x, y, w, h, r, fill, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;

/* ---- 畫布 ---- */
let defs = [];
let svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
defs.push(`<linearGradient id="bgG" x1="0" y1="0" x2="0.3" y2="1">
  <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.6" stop-color="#FBFCFE"/>
  <stop offset="1" stop-color="#F2F5F9"/></linearGradient>`);
defs.push(`<linearGradient id="ruleG" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#BA7517"/><stop offset="1" stop-color="#E3B063"/></linearGradient>`);
defs.push(`<linearGradient id="barG" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#BA7517"/><stop offset="1" stop-color="#E3B063"/></linearGradient>`);
svg.push(`<clipPath id="avClip"><circle cx="30" cy="30" r="30"/></clipPath>`);
svg.push(`<rect width="${W}" height="${H}" fill="url(#bgG)"/>`);
svg.push(`<g transform="translate(${W / 2} ${H / 2}) rotate(-24)" opacity="0.055">
  ${t(0, 0, '@onepagemarket', { size: 132, weight: 700, anchor: 'middle', ls: 6 })}
</g>`);

/* ---- 手柄 pill ---- */
const handle = '@onepagemarket';
const pillW = 38 + 27 * 0.62 * handle.length;
svg.push(rrect(W - M - pillW, 66, pillW, 50, 12, C.amberBg));
svg.push(t(W - M - pillW / 2, 99, handle, { size: 27, weight: 500, fill: C.amberInk, anchor: 'middle' }));

/* ---- 標題（自適應縮字，不撞右上手柄）---- */
const TITLE = 'Who succeeds Jensen Huang?';
let TS = 72;
const avail = W - M * 2 - pillW - 24;
const approx = (s, sz, w = 700) => [...s].reduce((a, ch) => a + (/[A-Z0-9]/.test(ch) ? 0.66 : ch === ' ' ? 0.28 : /[a-z]/.test(ch) ? 0.54 : 0.6), 0) * sz * (w >= 600 ? 1.02 : 1);
TS = Math.min(TS, Math.floor(72 * avail / approx(TITLE, 72)));
svg.push(t(M, 152, TITLE, { size: TS, weight: 700, ls: -2 }));
svg.push(t(M, 196, `Kalshi puts 40% odds he exits as Nvidia CEO by July 2027 \u2014 Polymarket lists 6 names`,
  { size: 24, fill: C.gray }));
svg.push(`<rect x="${M}" y="222" width="${CW}" height="3" fill="url(#ruleG)" rx="1.5"/>`);

/* ---- 現狀 chips ---- */
const chips = [
  ['KALSHI \u00b7 EXIT BY JUL 2027', '40%'],
  ['POLYMARKET \u00b7 CANDIDATES', '6'],
  ['NVDA TWO-DAY DROP', '-9.5%'],
];
{
  const cw = [320, 300, 220], chH = 58, cy = 248;
  let cx = M;
  chips.forEach(([k, v], i) => {
    svg.push(rrect(cx, cy, cw[i], chH, 14, C.chip, `stroke="${C.line}" stroke-width="1"`));
    svg.push(t(cx + 20, cy + 24, k, { size: 13, weight: 500, fill: C.dim, ls: 0.8 }));
    svg.push(t(cx + 20, cy + 46, v, { size: 22, weight: 700, fill: C.ink }));
    cx += cw[i] + 18;
  });
}

/* ---- 表頭 ---- */
const HEAD_Y = 356, HEAD_H = 50;
const ROW_H = 112;
const TBL_TOP = HEAD_Y + HEAD_H;
const TBL_BOT = TBL_TOP + ROW_H * DATA.length;
/* 欄位：徽章+姓名（M） | JOINED 右對齊 x=636 | ODDS bar 區 690..W-M-96 | % 右對齊 W-M */
const NAME_X = M + 88;
const JOIN_X = 636;
const BAR_X = 700, BAR_W_MAX = 230;
const ODDS_X = W - M;

svg.push(rrect(M, HEAD_Y, CW, HEAD_H, 8, C.hdrBg));
svg.push(t(NAME_X, HEAD_Y + HEAD_H / 2 + 5, 'CANDIDATE', { size: 13, weight: 500, fill: '#E7EAF0', ls: 0.8 }));
svg.push(t(JOIN_X, HEAD_Y + HEAD_H / 2 + 5, 'JOINED', { size: 13, weight: 500, fill: '#E7EAF0', anchor: 'middle', ls: 0.8 }));
svg.push(t(ODDS_X, HEAD_Y + HEAD_H / 2 + 5, 'MARKET ODDS', { size: 13, weight: 500, fill: '#E7EAF0', anchor: 'end', ls: 0.8 }));

/* ---- 數據行 ---- */
const MAX_ODDS = Math.max(...DATA.map((d) => d.odds));
DATA.forEach((r, ri) => {
  const y = TBL_TOP + ri * ROW_H;
  const cy = y + ROW_H / 2;
  const co = r.co === 'amd' ? { solid: C.amd, tint: C.amdBg } : { solid: C.nvda, tint: C.nvdaBg };

  /* 行底：白底 + 底部細線 */
  svg.push(`<line x1="${M}" y1="${y}" x2="${W - M}" y2="${y}" stroke="${C.line}" stroke-width="1"/>`);

  /* 頭像（有照片→圓形裁切；無→tint 底首字母徽章）＋實色描邊圈 */
  const BR = 30, bx = M + BR, by = cy;
  const photo = avatarDataUri[r.name];
  if (photo) {
    /* resvg 按 PNG 原始尺寸（120px）繪 image，故用 scale(0.5) 縮到 60 使用者單位 */
    svg.push(`<g transform="translate(${bx - BR} ${by - BR})" clip-path="url(#avClip)">`
      + `<g transform="scale(0.5)"><image width="120" height="120" href="${photo}"/></g></g>`);
  } else {
    svg.push(`<circle cx="${bx}" cy="${by}" r="${BR}" fill="${co.tint}"/>`);
    const initials = r.name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);
    svg.push(t(bx, by + 8, initials, { size: 22, weight: 700, fill: co.solid, anchor: 'middle' }));
  }
  svg.push(`<circle cx="${bx}" cy="${by}" r="${BR}" fill="none" stroke="${co.solid}" stroke-width="2"/>`);

  /* 姓名 + 職位兩行 */
  svg.push(t(NAME_X, cy - 16, r.name, { size: 27, weight: 700, fill: C.ink }));
  svg.push(t(NAME_X, cy + 10, r.role[0], { size: 17, fill: C.gray }));
  svg.push(t(NAME_X, cy + 32, r.role[1], { size: 17, fill: C.gray }));

  /* 加入年份 */
  svg.push(t(JOIN_X, cy + 8, r.joined, { size: 22, weight: 700, fill: C.ink, anchor: 'middle' }));

  /* 賠率 bar + 數字 */
  const bw = Math.max(8, Math.round(BAR_W_MAX * r.odds / MAX_ODDS));
  svg.push(rrect(BAR_X, cy - 9, BAR_W_MAX, 18, 9, C.track));
  svg.push(rrect(BAR_X, cy - 9, bw, 18, 9, 'url(#barG)'));
  svg.push(t(ODDS_X, cy + 9, r.odds + '%', { size: 30, weight: 700, fill: C.amberInk, anchor: 'end' }));
});

/* ---- 口徑註 ---- */
{
  const my = TBL_BOT + 40;
  svg.push(t(M, my,
    'Polymarket book as of ' + AS_OF + '; thin volume \u2014 probabilities are indicative only.',
    { size: 14, fill: C.dim }));
  svg.push(t(M, my + 20,
    'Kalshi: implied odds Huang exits as CEO before July 2027. Board has opened an independent review.',
    { size: 14, fill: C.dim }));
  svg.push(t(M, my + 40,
    'Photos: Polymarket.',
    { size: 14, fill: C.dim }));
}

/* ---- 頁尾 ---- */
pushFooter(t, svg, { M, W, H, C, handle, meta: 'Polymarket \u00b7 Kalshi \u00b7 As of Nov 11, 2026' });

svg.push('</svg>');
svg.splice(1, 0, `<defs>${defs.join('')}</defs>`);
const svgStr = svg.join('\n');

const outDir = path.join(BASE, 'out', process.env.PREVIEW ? '_preview' : '');
fs.mkdirSync(outDir, { recursive: true });
const stem = 'nvda-succession-20261111';
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
console.log('PNG ->', out, `(${(png.length / 1024).toFixed(0)} KB)`);

/* gen-times（畫廊時間戳第一層；推送前另與遠端 union） */
const genFile = path.join(outDir, 'gen-times.json');
let genMap = {};
try { genMap = JSON.parse(fs.readFileSync(genFile, 'utf8')); } catch (e) {}
genMap[`${stem}.png`] = Math.floor(Date.now() / 1000);
fs.writeFileSync(genFile, JSON.stringify(genMap));

/* 文案（X：只寫數字與事實，≤280 字元） */
const CAPTION =
  `Kalshi puts 40% odds Jensen Huang exits as Nvidia CEO by July 2027.\n` +
  `Polymarket's 6 successors: Jay Puri 21%, Madison Huang 8%, Lisa Su 8%, ` +
  `Colette Kress 5%, Debora Shoquist 3%, Bill Dally 3%. Thin book \u2014 indicative only.\n` +
  `One page \u2193`;
fs.writeFileSync(path.join(outDir, `caption-${stem}.txt`), CAPTION);
console.log('caption chars:', CAPTION.length);
