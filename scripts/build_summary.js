/**
 * Summary cards — OPM「總結型」卡片渲染器（1080×1350 · 淺底）
 *
 * 用於把一篇長文／一份文件拆成 N 張卡片（對應原文 01..NN 章節），
 * 每張卡由 JSON 描述：kicker + 標題 + 副標 + hero 數字 + blocks + 3 條 takeaway。
 *
 * 視覺沿用 OPM 白底系統（與 build_pages.js / build_close.js 同源）：
 *   標題 76 級 Bold / amber #BA7517 作為唯一強調色 / 統一聲明頁腳 / 斜置水印。
 *
 * 用法：
 *   NODE_PATH=<workspace>/node_modules node scripts/build_summary.js
 *   PREVIEW=1 ...                 → 寫到 out/_preview/
 *   SUMMARY_DATA=<path> …         → 指定其他 JSON
 *   ONLY=03 …                     → 只渲某一張
 *
 * block 類型：bars / rows / stats / stack / logos / bullets
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');
const { textWidth } = require('./lib/fontwidths');

const BASE = path.join(__dirname, '..');
const DATA_PATH = process.env.SUMMARY_DATA || path.join(BASE, 'data', 'summary-anthropic-s1.json');
const D = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const LOGO_PATH = path.join(BASE, 'data', 'logos.json');
const LOGOS = fs.existsSync(LOGO_PATH) ? JSON.parse(fs.readFileSync(LOGO_PATH, 'utf8')) : {};

const CFG = {
  W: 1080, H: 1350, M: 48,
  colors: {
    bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
    line: '#E4E7EC', hair: '#F0F2F5', amber: '#BA7517', amberBg: '#FAEEDA', amberInk: '#854F0B',
    chip: '#F6F7F9', chipLine: '#EAECF0',
  },
  font: 'MiSans',
  watermark: { text: '@onepagemarket', size: 132, opacity: 0.055, angle: -24 },
};
const { W, M, colors: C } = CFG;
const H = CFG.H;
const CW = W - M * 2;

let uid = 0, defs = [];

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function t(x, y, s, o = {}) {
  const { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0 } = o;
  return `<text x="${x}" y="${y}" font-family="${CFG.font}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text>`;
}
const wOf = (s, size, weight = 400) => textWidth(s, size, weight);

/** 按詞換行（英文） */
function wrap(text, maxW, size, weight = 400) {
  const words = String(text).split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (wOf(test, size, weight) <= maxW || !cur) cur = test;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}
/** 超寬截斷 */
function clip(s, maxW, size, weight = 400) {
  let str = String(s);
  if (wOf(str, size, weight) <= maxW) return str;
  while (str.length > 1 && wOf(str + '…', size, weight) > maxW) str = str.slice(0, -1);
  return str.trimEnd() + '…';
}

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
  const inner = size * 0.96;
  const off = (size - inner) / 2;
  return `<g clip-path="url(#${id})"><image x="${x + off}" y="${cy - r + off}" width="${inner}" height="${inner}" href="${uri}" image-rendering="optimizeQuality"/></g>` + ring;
}

const sectionLabel = (a, x, y, label, right, size = 23) => {
  a.push(`<rect x="${x}" y="${y - 19}" width="6" height="23" fill="${C.amber}"/>`);
  a.push(t(x + 18, y, label, { size, fill: C.gray }));
  if (right) a.push(t(W - M, y, right, { size: size - 2, fill: C.dim, anchor: 'end' }));
};

/* ============================================================
 * BLOCK 渲染：每個 block 返回 { h, draw(a, y) }
 * sq = 壓縮係數（內容超高時整體收緊行距與字級，下限 0.82）
 * ============================================================ */
const fz = (s, sq) => Math.max(13, Math.round(s * Math.max(0.86, sq)));

const BLOCKS = {
  /* 橫向長條：label + bar + 數值 */
  bars(b, sq) {
    const rows = b.items || [];
    const ROW = Math.round(48 * sq), HEAD = Math.round(40 * sq);
    return {
      h: HEAD + rows.length * ROW,
      draw(a, y) {
        sectionLabel(a, M, y + HEAD / 2 + 2, b.title, b.unit, fz(23, sq));
        const max = Math.max(...rows.map((r) => Math.abs(r.value) || 0), 0.0001);
        const LX = M, BX = M + 168, BW = CW - 168 - 132;
        rows.forEach((r, i) => {
          const mid = y + HEAD + i * ROW + ROW / 2;
          a.push(t(LX, mid + 8, r.label, { size: fz(23, sq), fill: C.gray }));
          const w = Math.max(8, Math.round((Math.abs(r.value) / max) * BW));
          a.push(`<rect x="${BX}" y="${mid - 6}" width="${BW}" height="12" rx="2" fill="${C.chip}"/>`);
          a.push(`<rect x="${BX}" y="${mid - 6}" width="${w}" height="12" rx="2" fill="${C.amber}" opacity="0.9"/>`);
          a.push(t(W - M, mid + 9, r.display, { size: fz(25, sq), weight: 700, anchor: 'end' }));
        });
      },
    };
  },

  /* 鍵值行：左 key（可帶 sub 小字），右 value */
  rows(b, sq) {
    const rows = b.items || [];
    const HEAD = Math.round(40 * sq);
    const rowH = (r) => Math.round((r.sub ? 64 : 50) * sq);
    const total = rows.reduce((s, r) => s + rowH(r), 0);
    return {
      h: HEAD + total,
      draw(a, y) {
        sectionLabel(a, M, y + HEAD / 2 + 2, b.title, b.note, fz(23, sq));
        let cy = y + HEAD;
        rows.forEach((r, i) => {
          const h = rowH(r);
          const baseline = cy + (r.sub ? 30 : 33) * Math.max(0.9, sq);
          if (i > 0) a.push(`<rect x="${M}" y="${cy}" width="${CW}" height="1" fill="${C.hair}"/>`);
          a.push(t(M, baseline, clip(r.k, CW - 220, fz(25, sq), 400), { size: fz(25, sq) }));
          a.push(t(W - M, baseline, r.v, { size: fz(r.vSize || 27, sq), weight: 700, anchor: 'end' }));
          if (r.sub) a.push(t(M, baseline + fz(22, sq), clip(r.sub, CW - 60, fz(20, sq), 400), { size: fz(20, sq), fill: C.dim }));
          cy += h;
        });
      },
    };
  },

  /* 三列小數字 */
  stats(b, sq) {
    const items = (b.items || []).slice(0, 3);
    const colW = CW / Math.max(1, items.length);
    return {
      h: Math.round(124 * sq),
      draw(a, y) {
        const h = Math.round(124 * sq);
        items.forEach((it, i) => {
          const x = M + colW * i;
          if (i > 0) a.push(`<rect x="${x - 20}" y="${y + 12}" width="1" height="${h - 40}" fill="${C.line}"/>`);
          a.push(t(x, y + h * 0.53, it.value, { size: fz(50, sq), weight: 700, ls: -1 }));
          a.push(t(x, y + h * 0.81, clip(it.label, colW - 34, fz(20, sq), 400), { size: fz(20, sq), fill: C.dim }));
        });
      },
    };
  },

  /* 垂直堆疊層（階梯遞進，左側序號塊由深到淺） */
  stack(b, sq) {
    const items = b.items || [];
    const ROW = Math.round(78 * sq), HEAD = Math.round(34 * sq);
    return {
      h: HEAD + items.length * ROW,
      draw(a, y) {
        let cy = y + HEAD;
        items.forEach((it, i) => {
          const mid = cy + ROW / 2;
          const op = 1 - i * 0.13;
          a.push(`<rect x="${M}" y="${mid - 16}" width="34" height="32" rx="8" fill="${C.amber}" opacity="${op}"/>`);
          a.push(t(M + 17, mid + 6, it.n, { size: 19, weight: 700, fill: '#FFFFFF', anchor: 'middle' }));
          a.push(t(M + 52, mid - 4, it.title, { size: fz(27, sq), weight: 700 }));
          a.push(t(M + 52, mid + 22, clip(it.desc, CW - 52, fz(21, sq), 400), { size: fz(21, sq), fill: C.gray }));
          if (i < items.length - 1) a.push(`<rect x="${M + 52}" y="${cy + ROW - 1}" width="${CW - 52}" height="1" fill="${C.hair}"/>`);
          cy += ROW;
        });
      },
    };
  },

  /* 帶 logo 的實體行 */
  logos(b, sq) {
    const items = b.items || [];
    const ROW = Math.round(82 * sq), HEAD = Math.round(40 * sq);
    return {
      h: HEAD + items.length * ROW,
      draw(a, y) {
        sectionLabel(a, M, y + HEAD / 2 + 2, b.title, b.note, fz(23, sq));
        items.forEach((it, i) => {
          const mid = y + HEAD + i * ROW + ROW / 2;
          if (i > 0) a.push(`<rect x="${M + 52}" y="${y + HEAD + i * ROW}" width="${CW - 52}" height="1" fill="${C.hair}"/>`);
          a.push(logoAt(it.ticker, M, mid, 44));
          a.push(t(M + 62, mid - 2, it.name, { size: fz(27, sq), weight: 700 }));
          a.push(t(M + 62, mid + 24, clip(it.role, CW - 70, fz(20, sq), 400), { size: fz(20, sq), fill: C.gray }));
        });
      },
    };
  },

  /* 編號要點 */
  bullets(b, sq) {
    const items = b.items || [];
    const HEAD = Math.round(40 * sq), ROW = Math.round(70 * sq);
    return {
      h: HEAD + items.length * ROW,
      draw(a, y) {
        sectionLabel(a, M, y + HEAD / 2 + 2, b.title, b.note, fz(23, sq));
        items.forEach((it, i) => {
          const ty = y + HEAD + i * ROW + fz(26, sq);
          a.push(t(M, ty, String(i + 1).padStart(2, '0'), { size: fz(20, sq), weight: 700, fill: C.amber }));
          const lines = wrap(it, CW - 60, fz(23, sq), 400).slice(0, 2);
          lines.forEach((ln, j) => {
            a.push(t(M + 52, ty + j * fz(28, sq), ln, { size: fz(23, sq), fill: j ? C.gray : C.ink }));
          });
        });
      },
    };
  },
};

/* ============================================================
 * 卡片骨架
 * ============================================================ */

function renderCard(card) {
  defs = []; uid = 0;
  const handle = D.handle || '@onepagemarket';
  const a = [];
  a.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  a.push(`<rect width="${W}" height="${H}" fill="${C.bg}"/>`);
  const wm = CFG.watermark;
  a.push(`<g transform="translate(${W / 2} ${H / 2}) rotate(${wm.angle})" opacity="${wm.opacity}">${t(0, 0, wm.text, { size: wm.size, weight: 700, anchor: 'middle', ls: 6 })}</g>`);

  /* ---- 頁首 ---- */
  // kicker：0X · TAG · SERIES
  a.push(t(M, 96, card.no, { size: 24, weight: 700, fill: C.amber, ls: 1 }));
  const noW = wOf(card.no, 24, 700);
  a.push(t(M + noW + 16, 96, `· ${card.tag}`, { size: 22, fill: C.gray, ls: 2.4 }));
  // 右上角 handle pill（縮小版，只佔 kicker 行高）
  const pillW = Math.round(handle.length * 13.4) + 34;
  const pillH = 44;
  a.push(`<rect x="${W - M - pillW}" y="60" width="${pillW}" height="${pillH}" rx="10" fill="${C.amberBg}"/>`);
  a.push(t(W - M - pillW / 2, 89, handle, { size: 24, weight: 500, fill: C.amberInk, anchor: 'middle' }));

  // 標題：自動降級到 2 行內
  let titleSize = 76, titleLines = wrap(card.title, CW, titleSize, 700);
  while (titleLines.length > 2 && titleSize > 52) {
    titleSize -= 4;
    titleLines = wrap(card.title, CW, titleSize, 700);
  }
  const titleTop = 160;
  const lineH = Math.round(titleSize * 1.14);
  titleLines.forEach((ln, i) => a.push(t(M, titleTop + i * lineH, ln, { size: titleSize, weight: 700, ls: -1.5 })));

  const subY = titleTop + (titleLines.length - 1) * lineH + 52;
  a.push(t(M, subY, clip(card.sub, CW, 26, 400), { size: 26, fill: C.gray }));

  const ruleY = subY + 30;
  a.push(`<rect x="${M}" y="${ruleY}" width="${CW}" height="6" fill="${C.amber}"/>`);

  /* ---- 內容區 ---- */
  const top = ruleY + 46;
  const bottom = H - 142;                 // 頁腳分隔線在 H-118，留 24 緩衝
  const avail = bottom - top;

  // hero
  const heroItems = card.hero ? (card.hero.items || [card.hero]) : [];
  const heroH = heroItems.length ? (heroItems.length > 1 ? 176 : 190) : 0;
  const heroSize = heroItems.length > 1 ? 76 : 104;

  const blocksH_nat = (card.blocks || []).reduce((s, b) => s + (BLOCKS[b.type] || BLOCKS.rows)(b, 1).h, 0);
  const nBlocks = (card.blocks || []).length;

  // takeaway 區
  const TK = { h: 186, padL: 34, rowH: 44 };

  const contentH_nat = heroH + blocksH_nat + TK.h;
  const gapCount = (heroH ? 1 : 0) + Math.max(0, nBlocks - 1) + (nBlocks ? 1 : 0);
  let gap = gapCount ? (avail - contentH_nat) / gapCount : 0;

  // gap 壓到下限仍放不下 → 對 blocks 整體壓縮行距字級（下限 0.82），takeaway 同步收緊
  let sq = 1, tkH = TK.h, tkRow = TK.rowH;
  if (gap < 18) {
    gap = 18;
    const spaceForBlocks = avail - heroH - tkH - gapCount * gap;
    sq = Math.max(0.8, spaceForBlocks / blocksH_nat);
    tkH = Math.round(TK.h * Math.max(0.86, sq));
    tkRow = Math.round(TK.rowH * Math.max(0.86, sq));
  }

  const blocks = (card.blocks || []).map((b) => ({ b, r: (BLOCKS[b.type] || BLOCKS.rows)(b, sq) }));
  const blocksH = blocks.reduce((s, x) => s + x.r.h, 0);
  const contentH = heroH + blocksH + tkH;
  gap = gapCount ? Math.max(gap, (avail - contentH) / gapCount) : 0;
  gap = Math.min(gap, 64);

  let y = top;
  // hero
  if (heroItems.length) {
    const colW = CW / heroItems.length;
    a.push(`<rect x="${M}" y="${y + 6}" width="${CW}" height="${heroH - 40}" rx="16" fill="${C.chip}"/>`);
    heroItems.forEach((it, i) => {
      const x = M + 34 + colW * i;
      a.push(t(x, y + 96, it.value, { size: heroSize, weight: 700, ls: -2.5 }));
      a.push(t(x, y + 130, clip(it.label, colW - 60, 21, 400), { size: 21, fill: C.gray }));
      if (it.delta) {
        const dw = wOf(it.delta, 21, 500) + 30;
        a.push(`<rect x="${x}" y="${y + 144}" width="${dw}" height="34" rx="8" fill="${C.amberBg}"/>`);
        a.push(t(x + dw / 2, y + 167, it.delta, { size: 21, weight: 500, fill: C.amberInk, anchor: 'middle' }));
      }
    });
    y += heroH + gap;
  }

  blocks.forEach((x, i) => {
    x.r.draw(a, y);
    y += x.r.h;
    if (i < blocks.length - 1) y += gap;
  });

  y += gap;
  // takeaway 卡
  a.push(`<rect x="${M}" y="${y}" width="${CW}" height="${tkH}" rx="16" fill="${C.chip}"/>`);
  a.push(t(M + TK.padL, y + Math.round(tkH * 0.21), 'The take', { size: 20, fill: C.dim, ls: 1.6 }));
  (card.takeaways || []).slice(0, 3).forEach((s, i) => {
    const by = y + Math.round(tkH * 0.415) + i * tkRow;
    a.push(t(M + TK.padL, by, String(i + 1).padStart(2, '0'), { size: 18, weight: 700, fill: C.amber }));
    a.push(t(M + TK.padL + 38, by, clip(s, CW - TK.padL * 2 - 44, 23, 400), { size: 23, fill: C.ink }));
  });

  const overflow = y + tkH - bottom;
  if (overflow > 0) console.warn(`  ⚠️  卡 ${card.no} 內容超出下邊界 ${Math.round(overflow)}px`);

  pushFooter(t, a, { M, W, H, C, handle });
  a.push('</svg>');
  return [a[0], `<defs>${defs.join('')}</defs>`, ...a.slice(1)].join('\n');
}

/* ============================================================
 * 輸出
 * ============================================================ */
const FONT_DIRS = [path.join(BASE, 'assets', 'fonts'), path.join(process.env.HOME || '', 'Library', 'Fonts')];
const fontFiles = ['MiSans-Bold.ttf', 'MiSans-Medium.ttf', 'MiSans-Regular.ttf']
  .map((f) => FONT_DIRS.map((d) => path.join(d, f)).find((p) => fs.existsSync(p)))
  .filter(Boolean);

const ONLY = (process.env.ONLY || '').trim();
const PREVIEW = !!process.env.PREVIEW;
const outDir = path.join(BASE, 'out', PREVIEW ? '_preview' : '');
fs.mkdirSync(outDir, { recursive: true });
// 檔名唯一性（阿澤規則）：正式產物帶日期戳
const stamp = process.env.SUMMARY_STAMP ||
  new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' }).replace(/-/g, '');

(D.cards || []).filter((c) => !ONLY || c.no === ONLY).forEach((card) => {
  const svg = renderCard(card);
  const suffix = PREVIEW ? '' : `-${stamp}`;
  const outBase = `${D.slug}-p${card.no}${suffix}`;
  fs.writeFileSync(path.join(outDir, `${outBase}.svg`), svg);
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: W * 2 },
    font: { fontFiles, loadSystemFonts: true, defaultFontFamily: CFG.font },
    background: C.bg,
  }).render().asPng();
  fs.writeFileSync(path.join(outDir, `${outBase}.png`), png);
  console.log('PNG ->', `${outBase}.png`, `(${(png.length / 1024).toFixed(0)} KB)`);
});
