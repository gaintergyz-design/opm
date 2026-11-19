/**
 * OPM 專題卡 · 2026 US IPO First-Day Pop · 1080×1350
 *
 * 需求（2026-11-19 阿澤）：把富途新股首日升幅圖做成 OPM 格式，只取 2026 年數據，
 *   最下面加 Anthropic（尚未上市）→ 虛線柱、百分比位置放 "?"；
 *   logo 大一點、行距大一點。全英文、白底、右上 OPM 標識、統一頁腳。
 *   阿澤說無需核驗數據 → 數字照圖直接寫死在 data/ipo-firstday-2026.json。
 *
 * 版式：橫向柱狀圖，左側公司名+ticker+日期，柱子，右側 logo 徽章 + 百分比大字。
 *   柱子用 teal 品牌色（#00A98C）；Anthropic 行虛線輪廓 + "?"。
 *
 * 用法：NODE_PATH=<ws>/node_modules node scripts/build_ipo_firstday.js
 *       PREVIEW=1 ...                      # 出圖到 out/_preview/
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'ipo-firstday-2026.json'), 'utf8'));

const W = 1080, H = 1350, M = 56, CW = W - M * 2;
const FONT = 'MiSans';
const C = {
  bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
  line: '#E4E7EC', grid: '#EFF2F5',
  teal: '#00A98C', tealDeep: '#008A72', tealTint: '#E6F6F1',
};

/* 段距常數：logo 加大、行距加大（阿澤 11-19 要求） */
const S = {
  KICK: 74, T1: 132, T2: 214, SUB: 266, RULE: 292,
  GRID_TOP: 372, GRID_BOT: 1200,
  BAR_H: 54, LOGO: 84, LOGO_IMG: Math.round(84 * 1.47),
  TK: 30, NM: 18, DT: 16, VAL: 36,
  OPMH: 54, OPMY: 46,
};

/* 右上 OPM 字標（resvg 只認 data URI） */
const OPM_BUF = fs.readFileSync(path.join(BASE, 'assets', 'opm-logo.png'));
const OPM_URI = 'data:image/png;base64,' + OPM_BUF.toString('base64');
const OPM_W = OPM_BUF.readUInt32BE(16), OPM_H = OPM_BUF.readUInt32BE(20);

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const approx = (s, sz) => [...s].reduce((a, ch) =>
  a + (/[A-Z0-9$&'.,]/.test(ch) ? 0.66 : ch === ' ' ? 0.28 : /[a-z]/.test(ch) ? 0.54 : 0.6), 0) * sz;
const fitTitle = (s, base, maxW) => Math.min(base, Math.floor(base * maxW / approx(s, base)));
function t(x, y, s, { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0 } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text>`;
}
const fmt = (v) => v.toFixed(2) + '%';
const logoURI = (tk) => {
  const f = path.join(BASE, 'assets', 'logos', tk.replace(/\./g, '-') + '.png');
  return fs.existsSync(f) ? 'data:image/png;base64,' + fs.readFileSync(f).toString('base64') : null;
};

const svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
svg.push(`<defs><linearGradient id="ruleG" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="${C.teal}"/><stop offset="1" stop-color="#8FD9C7"/></linearGradient></defs>`);
svg.push(`<rect width="${W}" height="${H}" fill="${C.bg}"/>`);

/* 右上 OPM 字標 */
{
  const h = S.OPMH, w = OPM_W / OPM_H * h;
  svg.push(`<image x="${W - M - w}" y="${S.OPMY}" width="${w}" height="${h}" href="${OPM_URI}"/>`);
}

/* 標題 */
svg.push(t(M, S.KICK, 'IPO SCORECARD · 2026', { size: 17, weight: 600, fill: C.dim, ls: 3 }));
const T1 = D.headline[0], T2 = D.headline[1];
svg.push(t(M, S.T1, T1, { size: fitTitle(T1, 62, CW - 150), weight: 700, fill: C.ink, ls: -1.5 }));
svg.push(t(M, S.T2, T2, { size: fitTitle(T2, 86, CW - 150), weight: 700, fill: C.teal, ls: -2.5 }));
svg.push(t(M, S.SUB, D.subtitle, { size: fitTitle(D.subtitle, 23, CW), fill: C.gray }));
svg.push(`<rect x="${M}" y="${S.RULE}" width="${CW}" height="6" rx="3" fill="url(#ruleG)"/>`);

/* 欄位標頭 */
svg.push(t(M, S.GRID_TOP - 26, 'COMPANY / DEBUT', { size: 15, weight: 600, fill: C.dim, ls: 1.4 }));
svg.push(t(W - M, S.GRID_TOP - 26, 'FIRST-DAY GAIN', { size: 15, weight: 600, fill: C.dim, anchor: 'end', ls: 1.4 }));

/* 版面：左欄寬按最長名稱量，0 線緊貼公司名 */
const rows = D.rows;
const ROW_H = (S.GRID_BOT - S.GRID_TOP) / rows.length;
const LEFT_W = Math.max(...rows.map((r) =>
  Math.max(approx(r.ticker, S.TK) * 1.04, approx(r.name, S.NM) * 1.04, approx(r.name + '  ' + r.date, S.DT) * 1.02)));
const X0 = Math.round(M + LEFT_W + 28);
const X_RIGHT = 812;                       // 柱尾最遠（右側留給 logo + 數值）
const AX = D.axis_max;
const K = (X_RIGHT - X0) / AX;
const X = (v) => X0 + v * K;

/* 刻度線 */
for (let v = 0; v <= AX; v += D.axis_step) {
  const x = X(v);
  if (v > 0) svg.push(`<line x1="${x.toFixed(1)}" y1="${S.GRID_TOP}" x2="${x.toFixed(1)}" y2="${S.GRID_BOT}" stroke="${C.grid}" stroke-width="1"/>`);
  svg.push(t(x, S.GRID_BOT + 30, v + '%', { size: 15, weight: 500, fill: C.dim, anchor: 'middle' }));
}
svg.push(`<line x1="${X0}" y1="${S.GRID_TOP}" x2="${X0}" y2="${S.GRID_BOT}" stroke="#C3CBD5" stroke-width="1.5"/>`);

rows.forEach((r, i) => {
  const cy = S.GRID_TOP + ROW_H * (i + 0.5);
  const dashed = !!r.dashed;
  const color = r.color || C.teal;

  /* 左：ticker / name + date */
  svg.push(t(M, cy - 4, r.ticker, { size: S.TK, weight: 700, fill: C.ink, ls: -0.5 }));
  svg.push(t(M, cy + 22, r.name, { size: S.NM, weight: 500, fill: C.gray }));
  svg.push(t(M + approx(r.name, S.NM) + 10, cy + 22, r.date, { size: S.DT, fill: C.dim }));

  /* 柱：實心或虛線輪廓 */
  const barH = S.BAR_H;
  if (dashed) {
    /* 示意虛線柱（未知幅度）：畫到刻度中段，虛線輪廓 + 淡底 */
    const demoEnd = X(AX * 0.58);
    svg.push(`<rect x="${X0}" y="${cy - barH / 2}" width="${(demoEnd - X0).toFixed(1)}" height="${barH}" rx="${barH / 2}" fill="#FBF1EC" stroke="${color}" stroke-width="2.5" stroke-dasharray="12 9"/>`);
    svg.push(t((X0 + demoEnd) / 2, cy + 8, 'AWAITING DEBUT', { size: 17, weight: 600, fill: r.ink, anchor: 'middle', ls: 1 }));
  } else {
    const w = Math.max(r.gain * K, 3);
    const rad = Math.min(barH / 2, w / 2);
    svg.push(`<path d="M${X0} ${cy - barH / 2} h${(w - rad).toFixed(1)} a${rad} ${rad} 0 0 1 ${rad} ${rad} v${barH - rad * 2} a${rad} ${rad} 0 0 1 -${rad} ${rad} h-${(w - rad).toFixed(1)} Z" fill="${color}"/>`);
  }

  /* 柱尾 logo + 數值（? for Anthropic） */
  const tail = dashed ? X(AX * 0.58) : X(Math.min(r.gain || 0, AX));
  const cx = tail + 18 + S.LOGO / 2;
  const uri = logoURI(r.ticker);
  if (uri) {
    svg.push(`<image x="${cx - S.LOGO_IMG / 2}" y="${cy - S.LOGO_IMG / 2}" width="${S.LOGO_IMG}" height="${S.LOGO_IMG}" href="${uri}"/>`);
  } else {
    svg.push(`<circle cx="${cx}" cy="${cy}" r="${S.LOGO / 2 - 4}" fill="${C.grid}"/>`);
    svg.push(t(cx, cy + 9, r.ticker[0], { size: 30, weight: 700, fill: C.gray, anchor: 'middle' }));
  }
  svg.push(t(cx + S.LOGO_IMG / 2 + 14, cy + 12, dashed ? '?' : fmt(r.gain),
    { size: dashed ? 48 : S.VAL, weight: 700, fill: r.ink }));
});

pushFooter(t, svg, { M, W, H, C, handle: '@onepagemarket', meta: D.meta });
svg.push('</svg>');
const svgStr = svg.join('\n');

const outDir = path.join(BASE, 'out', process.env.PREVIEW ? '_preview' : '');
fs.mkdirSync(outDir, { recursive: true });
const stem = 'ipo-firstday-20261119';
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
fs.writeFileSync(path.join(outDir, `caption-${stem}.txt`), D.caption);
if (!process.env.PREVIEW) {
  const gtPath = path.join(outDir, 'gen-times.json');
  let gt = {};
  try { gt = JSON.parse(fs.readFileSync(gtPath, 'utf8')); } catch (e) {}
  gt[`${stem}.png`] = Math.floor(Date.now() / 1000);
  fs.writeFileSync(gtPath, JSON.stringify(gt, null, 0));
}
console.log('PNG ->', out, `(${(png.length / 1024).toFixed(0)} KB)`, `${W}x${H}`);
console.log('caption chars:', D.caption.length);
