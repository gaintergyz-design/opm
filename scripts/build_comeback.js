/**
 * OPM-專題卡：The comeback CEOs（知名 CEO 回歸盤點）· 1080×1350
 *
 * 觸發：把「圖解財經」知名CEO回歸盤點卡（2026-11-16）重製為 OPM 格式。
 * 阿澤指示：不用驗證數據（源自圖解財經卡）。版式：3×2 人物卡網格，
 * 不套「標題下三欄 chips」路徑依賴；全英文、右上 assets/opm-logo.png、
 * 無手柄 pill、無斜紋水印、統一頁尾聲明。
 *
 * 用法：
 *   NODE_PATH=./node_modules node scripts/build_comeback.js
 *   PREVIEW=1 NODE_PATH=./node_modules node scripts/build_comeback.js   # 寫 out/_preview/
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
  line: '#E4E7EC', panel: '#F8F9FB', panelLine: '#ECEDF1',
  back: '#F1541E',          // 回歸年（呼應原卡橘色）
};
/* 🔴 右上角品牌標識統一用 OPM 字標圖片（2026-11-14 阿澤）；resvg 只認 data URI */
const OPM_LOGO_BUF = fs.readFileSync(path.join(BASE, 'assets', 'opm-logo.png'));
const OPM_LOGO_URI = 'data:image/png;base64,' + OPM_LOGO_BUF.toString('base64');
const OPM_LOGO_W = OPM_LOGO_BUF.readUInt32BE(16), OPM_LOGO_H = OPM_LOGO_BUF.readUInt32BE(20);

/* ---- 數據（源自圖解財經卡 2026-11-16，未另行核驗）---- */
const DATA = [
  { name: 'Steve Jobs',     co: 'Apple',     left: 1985, back: 1997, gap: '12 yrs',
    photo: 'jobs',
    why: ['Apple bought NeXT, the', 'computer company he founded'],
    badge: { img: 'AAPL', tint: '#F4F4F6' } },
  { name: 'Howard Schultz', co: 'Starbucks', left: 2000, back: 2008, gap: '8 yrs',
    photo: 'schultz',
    why: ['Financial crisis hit and', 'Starbucks was struggling'],
    badge: { img: 'SBUX', tint: '#E9F2ED' } },
  { name: 'Jack Dorsey',    co: 'Twitter',   left: 2008, back: 2015, gap: '7 yrs',
    photo: 'dorsey',
    why: ['Previous CEO stepped down', ''],
    badge: { glyph: 'tw', tint: '#E8F3FC' } },
  { name: 'Michael Dell',   co: 'Dell',      left: 2004, back: 2007, gap: '3 yrs',
    photo: 'dell',
    why: ['Successor resigned over', 'poor results'],
    badge: { glyph: 'dell', tint: '#E8F1F8' } },
  { name: 'Bob Iger',       co: 'Disney',    left: 2020, back: 2022, gap: '2 yrs',
    photo: 'iger',
    why: ['Successor underperformed', 'and was ousted'],
    badge: { img: 'DIS', tint: '#EAEDF9' } },
  { name: 'Sam Altman',     co: 'OpenAI',    left: 2023, back: 2023, gap: '5 days',
    photo: 'altman',
    why: ['Employee revolt; investors', 'pushed to reinstate him'],
    badge: { glyph: 'openai', tint: '#E6F4F0' } },
];

/* 頭像（真實照片，存 assets/comebacks/；缺檔自動退回品牌 logo/glyph 徽章） */
const PHOTOS = ['jobs', 'schultz', 'dorsey', 'dell', 'iger', 'altman'];
const BRAND = { Apple: '#111111', Starbucks: '#006241', Twitter: '#1DA1F2',
                Dell: '#007DB8', Disney: '#113CCF', OpenAI: '#10A37F' };
const photoDataUri = {};
PHOTOS.forEach((p) => {
  const fp = path.join(BASE, 'assets', 'comebacks', p + '.jpg');
  if (fs.existsSync(fp)) photoDataUri[p] = 'data:image/jpeg;base64,' + fs.readFileSync(fp).toString('base64');
});

/* simple-icons 單色 glyph（/tmp 抓取，v8 twitter / v13 dell, openai） */
const GLYPHS = {
  tw:    { d: 'M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z',
           fill: '#1DA1F2' },
  dell:  { d: 'M17.963 14.6V9.324h1.222v4.204h2.14v1.07h-3.362zm-9.784-3.288l2.98-2.292c.281.228.56.458.841.687l-2.827 2.14.611.535 2.827-2.216c.281.228.56.458.841.688a295.83 295.83 0 0 1-2.827 2.216l.61.536 2.83-2.295-.001-1.986h1.223v4.204h2.216v1.07h-3.362v-1.987c-.995.763-1.987 1.529-2.981 2.292l-2.981-2.292c-.144.729-.653 1.36-1.312 1.694-.285.147-.597.24-.915.276-.183.022-.367.017-.551.017H3.516V9.325H5.69a2.544 2.544 0 0 1 1.563.557c.454.36.778.872.927 1.43m-3.516-.917v3.21l.953-.001a1.377 1.377 0 0 0 1.036-.523 1.74 1.74 0 0 0 .182-1.889 1.494 1.494 0 0 0-.976-.766c-.166-.04-.338-.03-.507-.032h-.688zM11.82 0h.337a11.94 11.94 0 0 1 5.405 1.373 12.101 12.101 0 0 1 4.126 3.557A11.93 11.93 0 0 1 24 11.82v.36a11.963 11.963 0 0 1-3.236 8.033A11.967 11.967 0 0 1 12.182 24h-.361a11.993 11.993 0 0 1-4.145-.806 12.04 12.04 0 0 1-4.274-2.836A12.057 12.057 0 0 1 .576 15.67 12.006 12.006 0 0 1 0 12.181v-.361a11.924 11.924 0 0 1 1.992-6.396 12.211 12.211 0 0 1 4.71-4.172A11.875 11.875 0 0 1 11.82 0m-.153 1.23a10.724 10.724 0 0 0-6.43 2.375 10.78 10.78 0 0 0-3.319 4.573 10.858 10.858 0 0 0 .193 8.12 10.788 10.788 0 0 0 3.546 4.421 10.698 10.698 0 0 0 4.786 1.946c1.456.209 2.955.124 4.376-.26a10.756 10.756 0 0 0 5.075-3.062 10.742 10.742 0 0 0 2.686-5.28 10.915 10.915 0 0 0-.122-4.682 10.77 10.77 0 0 0-7.098-7.626 10.78 10.78 0 0 0-3.693-.525z',
           fill: '#007DB8' },
  openai:{ d: 'M22.2819 9.8211a5.9847 5.9847 0 00-.5157-4.9108 6.0462 6.0462 0 00-6.5098-2.9A6.0651 6.0651 0 004.9807 4.1818a5.9847 5.9847 0 00-3.9977 2.9 6.0462 6.0462 0 00.7427 7.0966 5.98 5.98 0 00.511 4.9107 6.051 6.051 0 006.5146 2.9001A5.9847 5.9847 0 0013.2599 24a6.0557 6.0557 0 005.7718-4.2058 5.9894 5.9894 0 003.9977-2.9001 6.0557 6.0557 0 00-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 01-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 00.3927-.6813v-6.7369l2.02 1.1686a.071.071 0 01.038.052v5.5826a4.504 4.504 0 01-4.494 4.494zm-9.6607-4.1254a4.4708 4.4708 0 01-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 00.7806 0l5.8428-3.3685v2.3324a.0804.0804 0 01-.0332.0615L9.74 19.9502a4.4992 4.4992 0 01-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 012.3655-1.9728V11.6a.7664.7664 0 00.388.6761l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 01-.071 0l-4.8303-2.7865A4.504 4.504 0 012.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1282 7.2a.0757.0757 0 01.071 0l4.8303 2.7913a4.4944 4.4944 0 01-.6765 8.1042v-5.6778a.79.79 0 00-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 00-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 01.0284-.0615l4.8303-2.7866a4.4992 4.4992 0 016.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 01-.038-.0567V6.0742a4.4992 4.4992 0 017.3757-3.4537l-.142.0802L8.704 5.459a.7948.7948 0 00-.3927.6813zm1.0976-2.3654l2.602-1.5 2.6069 1.5v3l-2.5974 1.5-2.6073-1.5z',
           fill: '#10A37F' },
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
  <stop offset="0" stop-color="#BA7517"/><stop offset="1" stop-color="#E3B063"/></linearGradient>`);
svg.push(`<rect width="${W}" height="${H}" fill="url(#bgG)"/>`);
/* 🔴 全產線禁用斜紋水印（2026-11-13 欽定） */

/* ---- 右上 OPM 字標（取代手柄 pill）---- */
{
  const lh = 56, lw = Math.round(lh * OPM_LOGO_W / OPM_LOGO_H);
  svg.push(`<image x="${W - M - lw}" y="36" width="${lw}" height="${lh}" href="${OPM_LOGO_URI}" image-rendering="optimizeQuality"/>`);
}

/* ---- 標題區 ---- */
{
  svg.push(t(M, 148, 'The comeback CEOs', { size: 76, weight: 700, ls: -2 }));
  svg.push(t(M, 194, 'Six leaders who left the top job \u2014 then came back', { size: 24, fill: C.gray }));
  svg.push(`<rect x="${M}" y="220" width="${CW}" height="3" fill="url(#ruleG)" rx="1.5"/>`);
}

/* ---- 3×2 人物卡網格 ---- */
const GW = 314, GH = 446, GX = [M, M + 334, M + 668], GY = [254, 718];
DATA.forEach((d, i) => {
  const x = GX[i % 3], y = GY[Math.floor(i / 3)];
  const cx = x + GW / 2;

  svg.push(rrect(x, y, GW, GH, 20, C.panel, `stroke="${C.panelLine}" stroke-width="1"`));

  /* 徽章：真實照片圓形裁切＋品牌色細環；缺檔退回品牌淡色圓 + logo/glyph */
  const BR = 40, by = y + 82;
  const photo = photoDataUri[d.photo];
  if (photo) {
    svg.push(`<clipPath id="av${i}"><circle cx="${cx}" cy="${by}" r="${BR - 2}"/></clipPath>`);
    svg.push(`<circle cx="${cx}" cy="${by}" r="${BR}" fill="#FFFFFF"/>`);
    svg.push(`<image x="${cx - BR + 2}" y="${by - BR + 2}" width="${(BR - 2) * 2}" height="${(BR - 2) * 2}" href="${photo}" preserveAspectRatio="xMidYMid slice" clip-path="url(#av${i})"/>`);
    svg.push(`<circle cx="${cx}" cy="${by}" r="${BR - 1}" fill="none" stroke="${BRAND[d.co] || '#D6DAE1'}" stroke-width="2"/>`);
  } else {
    svg.push(`<circle cx="${cx}" cy="${by}" r="${BR}" fill="${d.badge.tint}"/>`);
    if (d.badge.glyph) {
      const g = GLYPHS[d.badge.glyph];
      const S = 44 / 24;   /* glyph 顯示 44px 寬 */
      svg.push(`<g transform="translate(${cx - 22} ${by - 22}) scale(${S})"><path d="${g.d}" fill="${g.fill}"/></g>`);
    } else {
      const uri = 'data:image/png;base64,' +
        fs.readFileSync(path.join(BASE, 'assets', 'logos', d.badge.img + '.png')).toString('base64');
      svg.push(`<image x="${cx - 24}" y="${by - 24}" width="48" height="48" href="${uri}" image-rendering="optimizeQuality"/>`);
    }
  }

  /* 姓名 + 公司 */
  svg.push(t(cx, y + 162, d.name, { size: 29, weight: 700, fill: C.ink, anchor: 'middle' }));
  svg.push(t(cx, y + 190, d.co, { size: 18, fill: C.gray, anchor: 'middle' }));

  /* 離職 / 回歸年份 */
  svg.push(t(cx, y + 234, `Left ${d.left}`, { size: 19, weight: 500, fill: C.gray, anchor: 'middle' }));
  svg.push(t(cx, y + 270, `Back ${d.back}`, { size: 30, weight: 700, fill: C.back, anchor: 'middle' }));

  /* 間隔 */
  svg.push(t(cx, y + 312, 'TIME AWAY', { size: 12, weight: 500, fill: C.dim, anchor: 'middle', ls: 1.2 }));
  svg.push(t(cx, y + 352, d.gap, { size: 40, weight: 700, fill: C.ink, anchor: 'middle' }));

  /* 原因 */
  d.why.filter(Boolean).forEach((line, li) => {
    svg.push(t(cx, y + 394 + li * 21, line, { size: 14, fill: C.gray, anchor: 'middle' }));
  });
});

/* ---- 口徑註 ---- */
svg.push(t(M, 1192,
  'Time away = span from leaving to returning as CEO. Sam Altman: fired and reinstated within 5 days.',
  { size: 14, fill: C.dim }));

/* ---- 頁尾 ---- */
pushFooter(t, svg, { M, W, H, C, handle: '@onepagemarket', meta: 'As of Nov 16, 2026' });

svg.push('</svg>');
svg.splice(1, 0, `<defs>${defs.join('')}</defs>`);
const svgStr = svg.join('\n');

const outDir = path.join(BASE, 'out', process.env.PREVIEW ? '_preview' : '');
fs.mkdirSync(outDir, { recursive: true });
const stem = 'comeback-ceos-20261116';
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

/* gen-times（正式出圖才寫；PREVIEW 不動畫廊時間戳） */
if (!process.env.PREVIEW) {
  const genFile = path.join(BASE, 'out', 'gen-times.json');
  let genMap = {};
  try { genMap = JSON.parse(fs.readFileSync(genFile, 'utf8')); } catch (e) {}
  genMap[`${stem}.png`] = Math.floor(Date.now() / 1000);
  fs.writeFileSync(genFile, JSON.stringify(genMap));
}

/* 文案（X：疑問句開頭、簡短、活人感、≤280） */
const CAPTION =
  `Which comeback was the wildest? Jobs stayed away 12 years, Dell 3. ` +
  `Sam Altman: fired and back in 5 days.\n` +
  `One page \u2193`;
fs.writeFileSync(path.join(outDir, `caption-${stem}.txt`), CAPTION);
console.log('caption chars:', CAPTION.length);
