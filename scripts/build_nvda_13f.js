/**
 * OPM-專題卡：Nvidia Q3 2026 13F 自持倉曝光（單張，1080×1350）
 *
 * 觸發：阿澤提供富途牛牛「英偉達 Q3 美股持倉曝光」參考圖（2026-11-17），要求轉 OPM 格式、
 *   英偉達 logo 要大。版式：左欄大 NVDA 3D 立體 logo（assets/nvda-3d-logo.jpg）＋總市值；
 *   右欄 8 檔持倉表（logo／ticker／value／weight）。不套「標題下三欄 chips」路徑依賴。
 *
 * OPM 格式：全英文、白底、$B 口徑（GENB $13M 屬小於 $0.1B 例外）、右上 assets/opm-logo.png、
 *   無手柄 pill、無斜紋水印、統一頁尾聲明。
 *
 * 數據：源自參考圖（WhaleWisdom Q3 2026 13F 口徑，截至 Sep 30, 2026）。
 *
 * 用法：
 *   NODE_PATH=./node_modules node scripts/build_nvda_13f.js
 *   PREVIEW=1 NODE_PATH=./node_modules node scripts/build_nvda_13f.js   # 寫 out/_preview/
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');

const BASE = path.join(__dirname, '..');
const W = 1080, H = 1350, M = 48;
const FONT = 'MiSans';
const C = {
  bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
  line: '#E4E7EC', sep: '#F2F4F7',
  up: '#00806B',      /* 加倉（teal 深版文字） */
  upFill: '#00A98C',
  down: '#D1400F',    /* 減倉（橙紅深版文字） */
  downFill: '#F1541E'
};

/* 右上品牌標識（OPM 字標圖片，2026-11-14 欽定） */
const OPM_LOGO_BUF = fs.readFileSync(path.join(BASE, 'assets', 'opm-logo.png'));
const OPM_LOGO_URI = 'data:image/png;base64,' + OPM_LOGO_BUF.toString('base64');
const OPM_LOGO_W = OPM_LOGO_BUF.readUInt32BE(16), OPM_LOGO_H = OPM_LOGO_BUF.readUInt32BE(20);

/* 左欄大 NVDA 3D 立體 logo（白底 jpg，白卡直接放） */
const NVDA_BIG_BUF = fs.readFileSync(path.join(BASE, 'assets', 'nvda-3d-logo.jpg'));
const NVDA_BIG_URI = 'data:image/jpeg;base64,' + NVDA_BIG_BUF.toString('base64');

/* 行 logo（倉庫快取 / 本輪補抓，256 或 100 方圖） */
function logoUri(ticker) {
  const buf = fs.readFileSync(path.join(BASE, 'assets', 'logos', `${ticker}.png`));
  return 'data:image/png;base64,' + buf.toString('base64');
}

/* ---- 數據（源自阿澤參考圖，WhaleWisdom Q3 2026）---- */
const ROWS = [
  { tk: 'SPCX', nm: 'SpaceX',                 val: '$19.7B', pct: '40.73%', act: 'ADDED'   },
  { tk: 'INTC', nm: 'Intel',                  val: '$19.4B', pct: '40.07%', act: 'TRIMMED' },
  { tk: 'CRWV', nm: 'CoreWeave',              val: '$4.1B',  pct: '8.51%'  },
  { tk: 'COHR', nm: 'Coherent',               val: '$2.2B',  pct: '4.64%'  },
  { tk: 'SNPS', nm: 'Synopsys',               val: '$1.9B',  pct: '3.92%'  },
  { tk: 'NOK',  nm: 'Nokia',                  val: '$0.74B', pct: '1.53%'  },
  { tk: 'NBIS', nm: 'Nebius',                 val: '$0.28B', pct: '0.58%'  },
  { tk: 'GENB', nm: 'Generate Biomedicines',  val: '$13M',   pct: '0.03%'  },
];

const CAPTION =
  'Ever wonder what Nvidia does with its own cash? SpaceX is now its top holding at ' +
  '$19.7B \u2014 40.7% of the book. Intel follows at $19.4B after a ~25% trim. ' +
  'Total: $48.3B. One page \u2193';

const META = 'Data via WhaleWisdom \u00b7 13F quarter ended Sep 30, 2026';

/* ---- 工具 ---- */
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function t(x, y, s, { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0 } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text>`;
}

/* 版面常量 */
const LEFT_W = 300;          // 左欄寬
const TX0 = M + LEFT_W + 40; // 右表起點 x = 388
const TX1 = W - M;           // 右表右緣 1032
const COL_VAL = 880;         // VALUE 欄右緣
const ROW_H = 106;
const ROWS_Y0 = 306;         // 首行頂

function renderCard() {
  const defs = [];
  const svg = [];
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  defs.push(`<linearGradient id="ruleG" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#BA7517"/><stop offset="1" stop-color="#E3B063"/></linearGradient>`);
  svg.push(`<rect width="${W}" height="${H}" fill="${C.bg}"/>`);

  /* 右上品牌標識：OPM 字標，高 56，右緣對齊 W-M */
  {
    const lh = 56, lw = Math.round(lh * OPM_LOGO_W / OPM_LOGO_H);
    svg.push(`<image x="${W - M - lw}" y="36" width="${lw}" height="${lh}" href="${OPM_LOGO_URI}" image-rendering="optimizeQuality"/>`);
  }

  /* 標題 */
  svg.push(t(M, 148, 'What Nvidia Holds', { size: 76, weight: 700, ls: -2 }));
  svg.push(t(M, 194, 'Q3 2026 13F \u00b7 8 disclosed names \u00b7 $B', { size: 24, fill: C.gray }));
  svg.push(`<rect x="${M}" y="222" width="${W - M * 2}" height="3" fill="url(#ruleG)" rx="1.5"/>`);

  /* ---- 左欄：大 NVDA 3D logo + 總市值 + 動作摘要 ---- */
  const LX = M;
  {
    /* 3D 立體 logo（白底，直接放） */
    svg.push(`<image x="${LX}" y="262" width="296" height="296" href="${NVDA_BIG_URI}" image-rendering="optimizeQuality"/>`);

    svg.push(t(LX, 636, 'TOTAL PORTFOLIO VALUE', { size: 14, weight: 500, fill: C.dim, ls: 1.2 }));
    svg.push(t(LX, 706, '$48.3B', { size: 72, weight: 700, ls: -1.5 }));

    svg.push(`<rect x="${LX}" y="748" width="296" height="1" fill="${C.line}"/>`);

    /* 動作摘要：加了什麼、減了什麼 */
    svg.push(t(LX, 806, '\u25B2', { size: 22, weight: 700, fill: C.up }));
    svg.push(t(LX + 30, 806, 'SpaceX', { size: 22, weight: 700 }));
    svg.push(t(LX, 832, 'Added \u2014 now the largest position (40.7%)', { size: 15, fill: C.gray }));

    svg.push(t(LX, 894, '\u25BC', { size: 22, weight: 700, fill: C.down }));
    svg.push(t(LX + 30, 894, 'Intel', { size: 22, weight: 700 }));
    svg.push(t(LX, 920, 'Stake cut by about 25% this quarter', { size: 15, fill: C.gray }));
  }

  /* ---- 右欄：持倉表 ---- */
  /* 欄頭 */
  svg.push(t(TX0 + 66, 272, 'SECURITY', { size: 13, weight: 500, fill: C.dim, ls: 1 }));
  svg.push(t(COL_VAL, 272, 'VALUE', { size: 13, weight: 500, fill: C.dim, anchor: 'end', ls: 1 }));
  svg.push(t(TX1, 272, 'WEIGHT', { size: 13, weight: 500, fill: C.dim, anchor: 'end', ls: 1 }));

  ROWS.forEach((r, i) => {
    const yTop = ROWS_Y0 + i * ROW_H;
    const cy = yTop + ROW_H / 2;
    if (i > 0) svg.push(`<rect x="${TX0}" y="${yTop}" width="${TX1 - TX0}" height="1" fill="${C.sep}"/>`);

    /* 圓形 logo 徽章 */
    {
      const cx = TX0 + 30, rad = 26, box = (rad - 4) * 2;
      const uri = logoUri(r.tk);
      defs.push(`<clipPath id="lg${i}"><circle cx="${cx}" cy="${cy}" r="${rad}"/></clipPath>`);
      svg.push(`<circle cx="${cx}" cy="${cy}" r="${rad}" fill="#FFFFFF" stroke="${C.line}" stroke-width="1"/>`);
      svg.push(`<image x="${cx - box / 2}" y="${cy - box / 2}" width="${box}" height="${box}" href="${uri}" clip-path="url(#lg${i})" preserveAspectRatio="xMidYMid meet" image-rendering="optimizeQuality"/>`);
    }

    /* ticker + 公司名 */
    svg.push(t(TX0 + 70, cy - 6, r.tk, { size: 28, weight: 700, ls: -0.3 }));
    svg.push(t(TX0 + 70, cy + 20, r.nm, { size: 16, fill: C.gray }));

    /* 動作 pill（SpaceX/Intel）緊跟公司名後 */
    if (r.act) {
      const fill = r.act === 'ADDED' ? C.upFill : C.downFill;
      const pw = 92, ph = 30;
      const px = TX0 + 70 + 6 + (r.tk.length >= 4 ? 4 : 0) * 0 + 76 + (r.nm.length > 8 ? 8 : 6);
      svg.push(`<rect x="${TX0 + 238}" y="${cy - 22}" width="${pw}" height="${ph}" rx="9" fill="${fill}" opacity="0.12"/>`);
      svg.push(t(TX0 + 238 + pw / 2, cy - 1, r.act, { size: 14, weight: 700, fill: r.act === 'ADDED' ? C.up : C.down, anchor: 'middle', ls: 0.6 }));
    }

    /* VALUE / WEIGHT */
    svg.push(t(COL_VAL, cy + 10, r.val, { size: 28, weight: 700, anchor: 'end' }));
    svg.push(t(TX1, cy + 10, r.pct, { size: 28, weight: 700, fill: C.gray, anchor: 'end' }));
  });

  /* 頁尾（統一聲明） */
  pushFooter(t, svg, { M, W, H, C, meta: META, handle: '@onepagemarket' });

  svg.push('</svg>');
  svg.splice(1, 0, `<defs>${defs.join('')}</defs>`);
  return svg.join('\n');
}

/* ---- 渲染輸出 ---- */
const STEM = 'nvda-13f-20261117';
const outDir = path.join(BASE, 'out', process.env.PREVIEW ? '_preview' : '');
fs.mkdirSync(outDir, { recursive: true });

const FONT_DIRS = [path.join(BASE, 'assets', 'fonts'), path.join(process.env.HOME || '', 'Library', 'Fonts')];
const fontFiles = ['MiSans-Bold.ttf', 'MiSans-Medium.ttf', 'MiSans-Regular.ttf']
  .map((f) => FONT_DIRS.map((d) => path.join(d, f)).find((p) => fs.existsSync(p)))
  .filter(Boolean);

const svgStr = renderCard();
fs.writeFileSync(path.join(outDir, `${STEM}.svg`), svgStr);
const png = new Resvg(svgStr, {
  fitTo: { mode: 'width', value: W * 2 },
  font: { fontFiles, loadSystemFonts: true, defaultFontFamily: FONT },
  background: C.bg,
}).render().asPng();
const out = path.join(outDir, `${STEM}.png`);
fs.writeFileSync(out, png);
console.log('PNG ->', out, `(${(png.length / 1024).toFixed(0)} KB)`);

if (!process.env.PREVIEW) {
  const genFile = path.join(outDir, 'gen-times.json');
  let genMap = {};
  try { genMap = JSON.parse(fs.readFileSync(genFile, 'utf8')); } catch (e) {}
  genMap[`${STEM}.png`] = Math.floor(Date.now() / 1000);
  fs.writeFileSync(genFile, JSON.stringify(genMap));
}

fs.writeFileSync(path.join(outDir, `caption-${STEM}.txt`), CAPTION);
console.log('caption chars:', CAPTION.length, '(limit 280)');
