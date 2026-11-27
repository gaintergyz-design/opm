/**
 * OPM 專題卡：GPU capex outlook cut + SOX constituents since July
 *
 * 來源：阿澤提供的圖解財經截圖（SemiAnalysis 資本開支預測；東方財富 Choice 跌幅數據），
 *       逐項核對後寫死於 data/gpu-capex-sox-20261127.json。OPM 卡面全英文、$B 口徑。
 * 產出：out/gpu-capex-outlook-20261127.png（折線圖 1 張）
 *       out/sox-drawdown-20261127-p1.png / -p2.png（成分股 2 張，2 欄＋柱狀圖＋logo）
 *
 * 2026-11-27 二版：標題/副標題加大並真正載入 MiSans Bold；成分股改 2 欄横向柱狀圖；
 *   群組標題加大加粗；整體上下留白與字級放大。
 *
 * 用法：
 *   NODE_PATH=./node_modules node scripts/build_gpu_capex_sox.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'gpu-capex-sox-20261127.json'), 'utf8'));
const LOGOS = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'logos.json'), 'utf8'));

const W = 1080, H = 1350, M = 48, CW = W - M * 2;
const FONT = 'MiSans';
const C = {
  bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
  line: '#E4E7EC', grid: '#E9EDF2', soft: '#F6F7F9', track: '#F1F3F6',
  blue: '#2E7CF6', orange: '#F1541E', down: '#D1400F', downSoft: '#FBE6DC',
  teal: '#00A98C', amber: '#BA7517',
};

/* 顯式載入三種字重：resvg 不會自動用 assets/fonts 裡的 Bold 檔 */
const FONT_FILES = ['Regular', 'Medium', 'Bold'].map((w) =>
  path.join(BASE, 'assets', 'fonts', `MiSans-${w}.ttf`));

/* OPM 字標：resvg 只認 data URI */
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
const rrect = (x, y, w, h, r, fill, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;

function scaffold(a, title, subtitle, part) {
  a.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  a.push(`<rect width="${W}" height="${H}" fill="${C.bg}"/>`);
  const lh = 56, lw = Math.round(lh * OPM_W / OPM_H);
  a.push(`<image x="${W - M - lw}" y="42" width="${lw}" height="${lh}" href="${OPM_URI}" image-rendering="optimizeQuality"/>`);
  a.push(t(M, 150, title, { size: fitTitle(title, 78, CW - 20), weight: 700, ls: -1.8 }));
  a.push(t(M, 206, subtitle, { size: 28, weight: 400, fill: C.gray }));
  if (part) a.push(t(W - M, 206, `PART ${part} OF 2`, { size: 22, weight: 600, fill: C.dim, anchor: 'end', ls: 1.2 }));
  a.push(`<rect x="${M}" y="236" width="${CW}" height="4" rx="2" fill="${C.amber}"/>`);
}

function finish(a, name) {
  pushFooter(t, a, { M, W, H, C, meta: `As of ${D.as_of}`, handle: '@onepagemarket' });
  a.push('</svg>');
  const svg = a.join('\n');
  fs.writeFileSync(path.join(BASE, 'out', name + '.svg'), svg);
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: W * 2 },
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: FONT },
  }).render().asPng();
  fs.writeFileSync(path.join(BASE, 'out', name + '.png'), png);
  console.log('out/' + name + '.png');
}

/* ---------------- 卡片 1：折線圖 ---------------- */
function buildChart() {
  const a = [];
  scaffold(a, D.headline, D.subtitle);

  /* legend */
  const ly = 306;
  a.push(`<line x1="${M + 8}" y1="${ly}" x2="${M + 70}" y2="${ly}" stroke="${C.blue}" stroke-width="7" stroke-linecap="round"/>`);
  a.push(`<circle cx="${M + 39}" cy="${ly}" r="8" fill="#FFFFFF" stroke="${C.blue}" stroke-width="4"/>`);
  a.push(t(M + 88, ly + 10, 'Old forecast', { size: 27, weight: 500, fill: C.ink }));
  a.push(`<line x1="${M + 330}" y1="${ly}" x2="${M + 392}" y2="${ly}" stroke="${C.orange}" stroke-width="7" stroke-linecap="round"/>`);
  a.push(`<circle cx="${M + 361}" cy="${ly}" r="8" fill="#FFFFFF" stroke="${C.orange}" stroke-width="4"/>`);
  a.push(t(M + 410, ly + 10, 'New forecast', { size: 27, weight: 500, fill: C.ink }));

  const ch = D.chart;
  const x0 = 150, x1 = 986, top = 408, bottom = 1010, ymax = 1600;
  const X = (i) => x0 + i * (x1 - x0) / (ch.years.length - 1);
  const Y = (v) => bottom - v / ymax * (bottom - top);

  for (let v = 0; v <= ymax; v += 400) {
    const y = Y(v);
    a.push(`<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${C.grid}" stroke-width="1"/>`);
    a.push(t(x0 - 26, y + 9, '$' + v.toLocaleString('en-US') + 'B', { size: 20, fill: C.dim, anchor: 'end' }));
  }
  ch.years.forEach((_, i) => {
    a.push(`<line x1="${X(i)}" y1="${top}" x2="${X(i)}" y2="${bottom}" stroke="${C.grid}" stroke-width="1" stroke-dasharray="3 7"/>`);
  });
  for (let i = 2; i < ch.years.length; i++) {
    const x = X(i), yOld = Y(ch.old[i]), yNew = Y(ch.new[i]);
    a.push(`<line x1="${x}" y1="${yOld}" x2="${x}" y2="${yNew}" stroke="${C.down}" stroke-width="2.5" stroke-dasharray="5 5" opacity="0.7"/>`);
  }

  const path = (arr) => arr.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');
  a.push(`<path d="${path(ch.old)}" fill="none" stroke="${C.blue}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`);
  a.push(`<path d="${path(ch.new)}" fill="none" stroke="${C.orange}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`);

  ch.years.forEach((yr, i) => {
    const x = X(i), yo = Y(ch.old[i]), yn = Y(ch.new[i]);
    a.push(`<circle cx="${x}" cy="${yo}" r="9" fill="#FFFFFF" stroke="${C.blue}" stroke-width="4.5"/>`);
    if (i > 0 || ch.new[i] !== ch.old[i]) {
      a.push(`<circle cx="${x}" cy="${yn}" r="9" fill="#FFFFFF" stroke="${C.orange}" stroke-width="4.5"/>`);
    }
    if (i === 0) {
      a.push(t(x, yo - 24, '$191B', { size: 26, weight: 700, fill: C.ink, anchor: 'middle' }));
    } else {
      a.push(t(x, yo - 24, '$' + ch.old[i] + 'B', { size: 25, weight: 700, fill: C.blue, anchor: 'middle' }));
      a.push(t(x, yn + 40, '$' + ch.new[i] + 'B', { size: 25, weight: 700, fill: C.orange, anchor: 'middle' }));
    }
    if (ch.delta[i] != null) {
      const ym = (yo + yn) / 2, label = ch.delta[i] + '%', w = 88;
      a.push(rrect(x - w / 2, ym - 22, w, 44, 11, C.downSoft));
      a.push(t(x, ym + 10, label, { size: 26, weight: 700, fill: C.down, anchor: 'middle' }));
    }
    a.push(t(x, 1070, yr, { size: 28, weight: 600, fill: C.ink, anchor: 'middle' }));
  });

  finish(a, 'gpu-capex-outlook-' + D.stamp);
}

/* ---------------- 卡片 2/3：成分股（2 欄＋柱狀圖） ---------------- */
const COLS = [
  [['AI Compute Hardware', 'Memory'], ['Foundry', 'Comms & Optical']],
  [['Equipment & Materials'], ['Analog & Power']],
];

function buildStocks(part) {
  const a = [];
  scaffold(a, D.stock_headline, D.stock_subtitle, part);
  const colW = (CW - 36) / 2;
  const top = 286, bottom = 1180;
  const GAP = 36, colX = [M, M + colW + GAP];

  COLS[part - 1].forEach((names, ci) => {
    const groups = D.groups.filter((g) => names.includes(g.name));
    const rows = groups.reduce((n, g) => n + g.stocks.length, 0);
    const HEAD_H = 56;
    /* 版面空時自動把行高撐大，不靠人工一張張調 */
    const rowH = Math.min(126, (bottom - top - groups.length * HEAD_H) / rows);
    const total = groups.length * HEAD_H + rows * rowH;
    let y = top + Math.max(0, (bottom - top - total) / 2);
    const x = colX[ci];

    groups.forEach((g) => {
      a.push(t(x, y + 42, g.name.toUpperCase(), { size: 31, weight: 700, fill: C.teal, ls: 0.8 }));
      y += HEAD_H;

      g.stocks.forEach((s) => {
        const cy = y + rowH / 2;
        const logo = LOGOS[s.ticker];
        if (logo) {
          a.push(`<circle cx="${x + 27}" cy="${cy}" r="27" fill="${C.soft}"/>`);
          a.push(`<image x="${x + 2}" y="${cy - 25}" width="50" height="50" href="${logo}" image-rendering="optimizeQuality"/>`);
        }
        const nm = s.name;
        const ns = Math.min(21, Math.floor(21 * 380 / Math.max(380, approx(nm, 21))));
        /* 🔴 美股個股：代碼在上且大，公司名在下且小（2026-11-27 阿澤欽定） */
        a.push(t(x + 64, cy - 14, s.ticker, { size: 30, weight: 700, fill: C.ink }));
        a.push(t(x + 64, cy + 22, nm, { size: ns, weight: 500, fill: C.gray }));

        /* 橫向柱狀圖放在代碼行，公司名單獨佔下方，避免長名稱壓到柱子 */
        const bx = x + 220, bw = 150, bh = 13, by = cy - 23;
        a.push(rrect(bx, by, bw, bh, 6.5, C.track));
        const fillW = Math.max(6, Math.round(bw * Math.abs(s.change) / 65));
        a.push(rrect(bx, by, fillW, bh, 6.5, C.orange));
        a.push(t(x + colW, cy - 11, s.change.toFixed(2) + '%', { size: 25, weight: 700, fill: C.down, anchor: 'end' }));
        y += rowH;
      });
    });
  });

  finish(a, 'sox-drawdown-' + D.stamp + '-p' + part);
}

buildChart();
buildStocks(1);
buildStocks(2);
