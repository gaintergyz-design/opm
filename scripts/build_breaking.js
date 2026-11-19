/**
 * OPM-Breaking 格式 · 即時突發新聞卡 · 1080×1080 PNG
 *
 * 🔴 阿澤 2026-11-19 欽定格式（「以後即時性消息做成 Breaking 形式」）：
 *   - 最底層＝一張新聞背景圖（AI 生成或主體素材，必須去浮水印）。
 *   - 上面蓋一層 60% 不透明黑色。
 *   - 上方色條「BREAKING:」，背景條顏色跟隨事件主體
 *     （英偉達＝綠、特斯拉＝紅…在 data json 的 accent 指定）。
 *   - 色條下跟一個簡短大白標題。
 *   - 右上角放 OPM logo（assets/breaking/opm-logo-full.png）。
 *
 * 用法：NODE_PATH=./node_modules node scripts/build_breaking.js
 * 換卡：改 data/breaking-<subject>-<stamp>.json，用 BREAKING_DATA 環境變數指定檔名。
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { textWidth } = require('./lib/fontwidths');

const BASE = path.join(__dirname, '..');
const dataFile = process.env.BREAKING_DATA || 'breaking-nvda-moody.json';
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', dataFile), 'utf8'));

const S = 1080, M = 84;
const FONT = 'MiSans';
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const b64 = (p) => 'data:image/png;base64,' + fs.readFileSync(path.join(BASE, p)).toString('base64');

function cw(s, size, weight = 700) {
  let w = 0;
  for (const ch of String(s == null ? '' : s)) {
    const c = ch.codePointAt(0);
    if (c >= 0x2E80 && c <= 0xFFEF) w += 100;
    else if (c >= 32 && c <= 126) w += textWidth(ch, 100, weight);
    else w += 60;
  }
  return w * size / 100;
}
function fit(s, size, max, weight = 700) {
  return cw(s, size, weight) > max ? Math.floor(size * max / cw(s, size, weight)) : size;
}
/** 依寬度折行（英文按詞，linux 無 canvas 也可用字寬表） */
function wrap(s, maxW, size, weight = 700) {
  const words = String(s).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (cw(test, size, weight) <= maxW || !cur) cur = test;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

const bgURI = b64(D.bg);
const logoURI = b64(D.brand_logo);
const a = [];
a.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">`);

/* 1. 新聞底圖 + 60% 黑幕 */
a.push(`<image x="0" y="0" width="${S}" height="${S}" href="${bgURI}" preserveAspectRatio="xMidYMid slice"/>`);
a.push(`<rect x="0" y="0" width="${S}" height="${S}" fill="#000000" opacity="0.6"/>`);

/* 2. 上方 BREAKING 色條（色隨主體） */
const barX = 81, barY = 192, barH = 195;
const kSize = fit(D.kicker, 88, S - barX - 120);
const barW = cw(D.kicker, kSize, 700) + 110;
a.push(`<rect x="${barX}" y="${barY}" width="${barW.toFixed(1)}" height="${barH}" rx="0" fill="${D.accent}"/>`);
a.push(`<text x="${barX + 52}" y="${barY + 128}" font-family="${FONT}" font-size="${kSize}" font-weight="700" fill="#FFFFFF" letter-spacing="-1">${esc(D.kicker)}</text>`);

/* 3. 標題（白色、大字、折行） */
const tSize = D.title_size || 82;
const tLine = D.title_line || 100;
const lines = wrap(D.headline, D.wrap_width || 980, tSize, 700);
let ty = 560;
lines.forEach((ln) => {
  const s = fit(ln, tSize, D.wrap_width || 980, 700);
  a.push(`<text x="${M + 4}" y="${ty}" font-family="${FONT}" font-size="${s}" font-weight="700" fill="#FFFFFF" letter-spacing="-1.4">${esc(ln)}</text>`);
  ty += tLine;
});

/* 4. 右上角 OPM logo（藍紫渐变，原圖 880×400 → 等比縮到高 ~62） */
const logoH = 62, logoW = +(logoH * 2.2).toFixed(1);
a.push(`<image x="${(S - 70 - logoW).toFixed(1)}" y="52" width="${logoW}" height="${logoH}" href="${logoURI}" preserveAspectRatio="xMidYMid meet"/>`);

/* 5. 左下角來源（低調） */
a.push(`<text x="${M}" y="${S - 46}" font-family="${FONT}" font-size="18" font-weight="400" fill="#FFFFFF" opacity="0.55">${esc(D.source_note)}</text>`);

a.push('</svg>');
const svgStr = a.join('\n');

const outDir = path.join(BASE, 'out');
fs.mkdirSync(outDir, { recursive: true });
const stem = `breaking-${D.kind === 'breaking' ? 'nvda-moody' : D.kind}-${D.stamp}`;
fs.writeFileSync(path.join(outDir, `${stem}.svg`), svgStr);

const sub = path.join(BASE, 'assets', 'fonts');
const full = path.join(process.env.HOME || '', 'Library', 'Fonts');
const fontFiles = ['MiSans-Bold.ttf', 'MiSans-Medium.ttf', 'MiSans-Regular.ttf']
  .map((f) => [path.join(sub, f), path.join(full, f)].find((p) => fs.existsSync(p)))
  .filter(Boolean);
const png = new Resvg(svgStr, {
  fitTo: { mode: 'width', value: S * 2 },
  font: { fontFiles, loadSystemFonts: true, defaultFontFamily: FONT },
  background: '#000000',
}).render().asPng();
const out = path.join(outDir, `${stem}.png`);
fs.writeFileSync(out, png);
console.log('PNG ->', out, `(${(png.length / 1024).toFixed(0)} KB)`);
console.log('lines:', JSON.stringify(lines));
