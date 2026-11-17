/**
 * OPM-專題卡：Q3 2026 13F 四大機構持倉（兩張，各含兩家機構）· 1080×1350
 *
 * 觸發：阿澤提供富途牛牛「頂級機構Q3持倉大公開」參考圖（2026-11-17），要求拆成兩張：
 *   卡1 = Berkshire Hathaway + Baillie Gifford；卡2 = Bridgewater + ARK。
 * OPM 格式：全英文、白底、$B 口徑、右上 assets/opm-logo.png、無手柄 pill、
 *   無斜紋水印、統一頁尾聲明；不套「標題下三欄 chips」路徑依賴。
 *
 * 數據：源自參考圖（WhaleWisdom Q3 2026 13F 口徑），BSP＝Bending Spoons S.p.A.
 *   與 QRVO（2026-10-05 完成 Skyworks 合併、退市）已另行網上核實。
 *
 * 用法：
 *   NODE_PATH=./node_modules node scripts/build_funds_13f.js
 *   PREVIEW=1 NODE_PATH=./node_modules node scripts/build_funds_13f.js   # 寫 out/_preview/
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
  line: '#E4E7EC', sep: '#F2F4F7',
  amber: '#BA7517',
  up: '#00806B',      /* 加倉 / 正變動文字（teal 深版） */
  upFill: '#00A98C',  /* ADDED pill */
  down: '#D1400F',    /* 減倉 / 負變動文字（橙紅深版） */
  downFill: '#F1541E' /* REDUCED pill */
};

/* 右上品牌標識（OPM 字標圖片，2026-11-14 欽定） */
const OPM_LOGO_BUF = fs.readFileSync(path.join(BASE, 'assets', 'opm-logo.png'));
const OPM_LOGO_URI = 'data:image/png;base64,' + OPM_LOGO_BUF.toString('base64');
const OPM_LOGO_W = OPM_LOGO_BUF.readUInt32BE(16), OPM_LOGO_H = OPM_LOGO_BUF.readUInt32BE(20);

/* 伯克希爾 logo（倉庫快取，256×256 方圖） */
const BRK_BUF = fs.readFileSync(path.join(BASE, 'assets', 'logos', 'BRK-B.png'));
const BRK_URI = 'data:image/png;base64,' + BRK_BUF.toString('base64');

/* ---- 數據（源自阿澤參考圖，WhaleWisdom Q3 2026）---- */
/* 發帖文案：阿澤欽定合併版（兩張卡共用，2026-11-17） */
const MERGED_CAPTION =
  'What did big money do last quarter? Berkshire sits on $304.2B across just 30 names. ' +
  'Bridgewater holds 974 \u2014 mostly SPY and IVV. Baillie Gifford cut SpaceX, then put $1.72B into Bending Spoons. ' +
  'ARK added $2.0B. One page \u2193';

const ROW_LABELS = { top: 'TOP HOLDINGS', added: 'ADDED', reduced: 'REDUCED' };
const CARDS = [
  {
    stem: 'funds-13f-berkshire-baillie-20261117',
    title: 'Berkshire & Baillie Gifford',
    sub: 'Q3 2026 13F \u2014 top holdings, adds and trims \u00b7 $B',
    meta: 'Data via WhaleWisdom \u00b7 13F quarter ended Sep 30, 2026',
    note: null,
    caption: MERGED_CAPTION,
    funds: [
      {
        name: 'Berkshire Hathaway', positions: 30, value: '$304.2B', chg: '+$4.9B', up: true,
        logo: { img: true },
        rows: {
          top: [['AAPL', 'Apple'], ['AXP', 'American Express'], ['KO', 'Coca-Cola'], ['GOOGL', 'Alphabet-A'], ['BAC', 'Bank of America']],
          added: [['LEN', 'Lennar'], ['BSP', 'Bending Spoons'], ['DAL', 'Delta Air Lines'], ['LEN.B', 'Lennar-B'], ['M', "Macy's"]],
          reduced: [['BAC', 'Bank of America'], ['VRSN', 'VeriSign'], ['COF', 'Capital One'], ['KR', 'Kroger'], ['NUE', 'Nucor']],
        },
      },
      {
        name: 'Baillie Gifford', positions: 278, value: '$106.0B', chg: '-$4.0B', up: false,
        logo: { text: 'BG', fill: '#14261F' },
        rows: {
          top: [['NVDA', 'Nvidia'], ['AMZN', 'Amazon'], ['SPCX', 'SpaceX'], ['MELI', 'MercadoLibre'], ['NET', 'Cloudflare']],
          added: [['BSP', 'Bending Spoons'], ['LRCX', 'Lam Research'], ['ALNY', 'Alnylam'], ['ARM', 'Arm Holdings'], ['KLAC', 'KLA Corp']],
          reduced: [['SPCX', 'SpaceX'], ['MRNA', 'Moderna'], ['PDD', 'PDD Holdings'], ['AMZN', 'Amazon'], ['NET', 'Cloudflare']],
        },
      },
    ],
  },
  {
    stem: 'funds-13f-bridgewater-ark-20261117',
    title: 'Bridgewater & ARK',
    sub: 'Q3 2026 13F \u2014 top holdings, adds and trims \u00b7 $B',
    meta: 'Data via WhaleWisdom \u00b7 13F quarter ended Sep 30, 2026',
    note: 'Note: QRVO was delisted Oct 5, 2026 after completing the Skyworks merger \u2014 Q3 shows the final position.',
    caption: MERGED_CAPTION,
    funds: [
      {
        name: 'Bridgewater Associates', positions: 974, value: '$23.0B', chg: '-$1.4B', up: false,
        logo: { text: 'BW', fill: '#0E2A52' },
        rows: {
          top: [['SPY', 'SPDR S&P 500'], ['IVV', 'iShares S&P 500'], ['NVDA', 'Nvidia'], ['AVGO', 'Broadcom'], ['LRCX', 'Lam Research']],
          added: [['APP', 'AppLovin'], ['AMAT', 'Applied Materials'], ['QCOM', 'Qualcomm'], ['MU', 'Micron'], ['QRVO', 'Qorvo']],
          reduced: [['SPY', 'SPDR S&P 500'], ['IVV', 'iShares S&P 500'], ['GOOGL', 'Alphabet-A'], ['NVDA', 'Nvidia'], ['VOO', 'Vanguard S&P 500']],
        },
      },
      {
        name: 'ARK Invest', positions: 182, value: '$17.4B', chg: '+$2.0B', up: true,
        logo: { text: 'ARK', fill: '#111111' },
        rows: {
          top: [['TSLA', 'Tesla'], ['SPCX', 'SpaceX'], ['TEM', 'Tempus AI'], ['TWST', 'Twist Bioscience'], ['NVDA', 'Nvidia']],
          added: [['SPCX', 'SpaceX'], ['NVDA', 'Nvidia'], ['TSLA', 'Tesla'], ['CRCL', 'Circle'], ['META', 'Meta Platforms']],
          reduced: [['AMD', 'AMD'], ['TXG', '10x Genomics'], ['TWST', 'Twist Bioscience'], ['RBLX', 'Roblox'], ['DE', 'Deere']],
        },
      },
    ],
  },
];

/* ---- 工具 ---- */
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function t(x, y, s, { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0 } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text>`;
}
const rrect = (x, y, w, h, r, fill, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;

/* 版面常量 */
const ROW_LABEL_W = 150;
const RH = 112;                    // 每類行高
const HDR_H = 86;                  // 機構頭部高
const BLOCK_H = HDR_H + RH * 3;    // 單機構塊高 = 398
const STATS = [
  { key: 'positions', label: 'POSITIONS' },
  { key: 'value', label: 'VALUE' },
  { key: 'chg', label: 'Q/Q CHANGE' },
];
const STAT_W = 150, STAT_G = 14;

function renderCard(card) {
  let uid = 0;
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

  /* 標題（自適應縮字，不撞右上品牌標識） */
  const BRAND_MIN_X = W - M - 320;
  const TITLE = card.title;
  const approx = (s, sz) => [...s].reduce((a, ch) => a + (/[A-Z0-9]/.test(ch) ? 0.66 : ch === ' ' ? 0.28 : /[a-z]/.test(ch) ? 0.54 : 0.6), 0) * sz * 1.02;
  let TS = 76;
  const avail = BRAND_MIN_X - M - 16;
  TS = Math.min(TS, Math.floor(76 * avail / approx(TITLE, 76)));
  svg.push(t(M, 148, TITLE, { size: TS, weight: 700, ls: -2 }));
  svg.push(t(M, 194, card.sub, { size: 24, fill: C.gray }));
  svg.push(`<rect x="${M}" y="222" width="${CW}" height="3" fill="url(#ruleG)" rx="1.5"/>`);

  /* 兩個機構塊 */
  const starts = [258, 258 + BLOCK_H + 44];
  card.funds.forEach((f, fi) => {
    const y0 = starts[fi];

    /* 機構 logo：圓形 56 */
    {
      const cx = M + 28, cy = y0 + 34, r = 28;
      if (f.logo.img) {
        const pad = 5, box = (r - pad) * 2;
        defs.push(`<clipPath id="lg${fi}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>`);
        svg.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#FFFFFF" stroke="${C.line}" stroke-width="1"/>`);
        svg.push(`<image x="${cx - box / 2}" y="${cy - box / 2}" width="${box}" height="${box}" href="${BRK_URI}" clip-path="url(#lg${fi})" preserveAspectRatio="xMidYMid meet" image-rendering="optimizeQuality"/>`);
      } else {
        svg.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f.logo.fill}"/>`);
        const fs_ = f.logo.text.length >= 3 ? 18 : 21;
        svg.push(t(cx, cy + fs_ * 0.36, f.logo.text, { size: fs_, weight: 700, fill: '#FFFFFF', anchor: 'middle', ls: 0.5 }));
      }
    }

    /* 機構名 */
    svg.push(t(M + 72, y0 + 26, f.name, { size: 30, weight: 700, ls: -0.5 }));
    svg.push(t(M + 72, y0 + 56, 'Top 5 by position value \u00b7 13F filings', { size: 15, fill: C.dim }));

    /* 右側三組統計：POSITIONS / VALUE / Q/Q CHANGE */
    STATS.forEach((st, i) => {
      const xRight = W - M - (STATS.length - 1 - i) * (STAT_W + STAT_G);
      const xLeft = xRight - STAT_W;
      svg.push(t(xRight - 4, y0 + 22, st.label, { size: 12, weight: 500, fill: C.dim, anchor: 'end', ls: 0.8 }));
      const v = f[st.key];
      const fill = st.key === 'chg' ? (f.up ? C.up : C.down) : C.ink;
      svg.push(t(xRight - 4, y0 + 58, v, { size: st.key === 'chg' ? 26 : 28, weight: 700, fill, anchor: 'end' }));
    });

    /* 三類行 */
    const rowsStart = y0 + HDR_H;
    ['top', 'added', 'reduced'].forEach((key, ri) => {
      const rowTop = rowsStart + ri * RH;
      if (ri > 0) svg.push(`<rect x="${M}" y="${rowTop}" width="${CW}" height="1" fill="${C.sep}"/>`);

      /* 左側分類 pill */
      const pillFill = key === 'top' ? C.ink : key === 'added' ? C.upFill : C.downFill;
      const py = rowTop + RH / 2 - 21;
      svg.push(rrect(M, py, ROW_LABEL_W, 42, 10, pillFill));
      svg.push(t(M + ROW_LABEL_W / 2, rowTop + RH / 2 + 6, ROW_LABELS[key],
        { size: 15, weight: 700, fill: '#FFFFFF', anchor: 'middle', ls: 0.6 }));

      /* 五格持倉：ticker + 公司名 */
      const cells = f.rows[key];
      const gridX = M + ROW_LABEL_W + 16;
      const gridW = CW - ROW_LABEL_W - 16;
      const cw = gridW / 5;
      cells.forEach(([tk, nm], j) => {
        const cx0 = gridX + j * cw;
        svg.push(t(cx0 + 2, rowTop + RH / 2 - 4, tk, { size: 26, weight: 700, ls: -0.3 }));
        svg.push(t(cx0 + 2, rowTop + RH / 2 + 22, nm, { size: 14, fill: C.gray }));
      });
    });
  });

  /* 卡 2 專屬註（QRVO 退市） */
  if (card.note) {
    svg.push(t(M, starts[1] + BLOCK_H + 26, card.note, { size: 14, fill: C.dim }));
  }

  /* 頁尾（統一聲明） */
  pushFooter(t, svg, { M, W, H, C, meta: card.meta, handle: '@onepagemarket' });

  svg.push('</svg>');
  svg.splice(1, 0, `<defs>${defs.join('')}</defs>`);
  return svg.join('\n');
}

/* ---- 渲染輸出 ---- */
const outDir = path.join(BASE, 'out', process.env.PREVIEW ? '_preview' : '');
fs.mkdirSync(outDir, { recursive: true });

const FONT_DIRS = [path.join(BASE, 'assets', 'fonts'), path.join(process.env.HOME || '', 'Library', 'Fonts')];
const fontFiles = ['MiSans-Bold.ttf', 'MiSans-Medium.ttf', 'MiSans-Regular.ttf']
  .map((f) => FONT_DIRS.map((d) => path.join(d, f)).find((p) => fs.existsSync(p)))
  .filter(Boolean);

const genFile = path.join(outDir, 'gen-times.json');
let genMap = {};
try { genMap = JSON.parse(fs.readFileSync(genFile, 'utf8')); } catch (e) {}

CARDS.forEach((card) => {
  const svgStr = renderCard(card);
  fs.writeFileSync(path.join(outDir, `${card.stem}.svg`), svgStr);
  const png = new Resvg(svgStr, {
    fitTo: { mode: 'width', value: W * 2 },
    font: { fontFiles, loadSystemFonts: true, defaultFontFamily: FONT },
    background: C.bg,
  }).render().asPng();
  const out = path.join(outDir, `${card.stem}.png`);
  fs.writeFileSync(out, png);
  console.log('PNG ->', out, `(${(png.length / 1024).toFixed(0)} KB)`);

  genMap[`${card.stem}.png`] = Math.floor(Date.now() / 1000);
  fs.writeFileSync(path.join(outDir, `caption-${card.stem}.txt`), card.caption);
  console.log('caption chars:', card.caption.length, '(limit 280)');
});
fs.writeFileSync(genFile, JSON.stringify(genMap));
