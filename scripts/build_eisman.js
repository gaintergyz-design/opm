/**
 * OPM 專題卡 · Steve Eisman「Four Scenarios / Five Risks of the AI Boom」· 1080×1350 ×2
 *
 * 🔴 OPM 是純英文號（X起號方案-美股英文版/美股數據號：語言＝全英文）。
 *    卡片上不出現任何中文；金額一律用 $B 口徑（$30B、$6.7B…），不用「億」。
 *
 * 版面（2026-11-12，阿澤指定）：不要純文字，用顏色區塊區分情境／風險，
 *   每塊再配一個資料小圖形（柱、閘門、濃度條、價格條）。
 *   純淺色底 + 右上角 OPM 標識 + 統一頁腳聲明。
 *
 * 資料：data/eisman-ai-boom.json（富途牛牛 2026-11-11 文章整理）
 * 字體：repo 內 assets/fonts 的 MiSans 子集（英文一致），完整版 fallback。
 *
 * 用法：NODE_PATH=<ws>/node_modules node scripts/build_eisman.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');
const { brandMark } = require('./lib/brand');
const { textWidth } = require('./lib/fontwidths');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'eisman-ai-boom.json'), 'utf8'));

const W = 1080, H = 1350, M = 48, CW = W - M * 2;
const C = {
  bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3',
  line: '#E4E7EC', body: '#3A4453',
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

/** 中文按 1em、ASCII 查 MiSans 實測表、其餘 0.6em */
function cw(s, size, weight = 400) {
  let w = 0;
  for (const ch of String(s == null ? '' : s)) {
    const c = ch.codePointAt(0);
    if (c >= 0x2E80 && c <= 0xFFEF) w += 100;
    else if (c >= 32 && c <= 126) w += textWidth(ch, 100, weight);
    else w += 60;
  }
  return w * size / 100;
}
const fit = (s, size, max, weight = 700) =>
  cw(s, size, weight) > max ? Math.floor(size * max / cw(s, size, weight)) : size;

/* ---------------- 共用骨架 ---------------- */
function start(ruleStops) {
  const a = [], defs = [];
  a.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  defs.push(`<linearGradient id="bgG" x1="0" y1="0" x2="0.3" y2="1">
    <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.58" stop-color="#FAFCFE"/>
    <stop offset="1" stop-color="#F1F5F9"/></linearGradient>`);
  defs.push(`<linearGradient id="ruleG" x1="0" y1="0" x2="1" y2="0">${ruleStops}</linearGradient>`);
  a.push(rr(0, 0, W, H, 0, 'url(#bgG)'));
  a.push(`<g transform="translate(${W / 2} ${H / 2}) rotate(-24)" opacity="0.03">
    ${t(0, 0, handle, { size: 132, weight: 700, anchor: 'middle', ls: 6, fill: '#94A3B8' })}</g>`);
  brandMark(a);
  return { a, defs };
}

function header(a, { kicker, title, subtitle }) {
  a.push(t(M, 76, kicker, { size: 16, weight: 500, fill: '#8B95A5', ls: 3 }));
  const TS = 66, avail = CW - 104;
  a.push(t(M, 154, title, { size: fit(title, TS, avail), weight: 700, ls: -1.6 }));
  a.push(t(M, 198, subtitle, { size: fit(subtitle, 22, CW, 400), fill: C.gray }));
  a.push(rr(M, 218, CW, 6, 3, 'url(#ruleG)'));
}

function finish(a, defs, stem) {
  pushFooter(t, a, { M, W, H, C: { line: C.line, dim: C.dim }, meta: D.asof, handle });
  a.push('</svg>');
  a.splice(1, 0, `<defs>${defs.join('')}</defs>`);
  const svgStr = a.join('\n');
  const outDir = path.join(BASE, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${stem}.svg`), svgStr);

  const sub = path.join(BASE, 'assets', 'fonts');
  const full = path.join(process.env.HOME || '', 'Library', 'Fonts');
  // 全英文卡：優先用 repo 內的子集字體（跨設備／CI 一致），完整版只作 fallback
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
}

/* ---------------- 迷你資料圖形 ---------------- */
function mini(a, cx, by, type, color, tag, tagInk) {
  // 純圖形：所有對比說明交給右上的 stat / 底部 tag，避免文字互撞
  const bar = (x, h, w = 30, fill = color, op = 1) =>
    a.push(rr(x, by - h, w, h, 5, fill, `opacity="${op}"`));
  if (type === 'up' || type === 'down') {
    const hs = type === 'up' ? [22, 40, 60] : [60, 40, 22];
    hs.forEach((h, i) => bar(cx - 57 + i * 42, h, 30, color, 0.35 + i * 0.28));
  } else if (type === 'double') {
    bar(cx - 58, 60, 46, color, 0.95);
    bar(cx + 12, 30, 46, color, 0.32);
  } else if (type === 'zero') {
    a.push(`<circle cx="${cx}" cy="${by - 34}" r="30" fill="none" stroke="${color}" stroke-width="7" opacity="0.45"/>`);
    a.push(`<line x1="${cx - 24}" y1="${by - 10}" x2="${cx + 24}" y2="${by - 58}" stroke="${color}" stroke-width="7" stroke-linecap="round" opacity="0.75"/>`);
  } else if (type === 'debt') {
    bar(cx - 58, 28, 46, color, 0.35);
    bar(cx + 12, 58, 46, color, 0.95);
  } else if (type === 'gates') {
    for (let i = 0; i < 3; i++) {
      const x = cx - 66 + i * 46;
      a.push(rr(x, by - 58, 34, 58, 6, color, `opacity="${0.25 + i * 0.28}"`));
      a.push(rr(x, by - 58, 34, 7, 3, '#FFFFFF', 'opacity="0.85"'));
    }
  } else if (type === 'concentration') {
    [0, 1].forEach((i) => {
      const y = by - 56 + i * 30;
      a.push(rr(cx - 66, y, 132, 19, 9.5, '#E7EBF0'));
      a.push(rr(cx - 66, y, 132 * 0.7, 19, 9.5, color, `opacity="${0.55 + i * 0.4}"`));
    });
  } else if (type === 'gap') {
    bar(cx - 58, 28, 46, color, 0.35);
    bar(cx + 12, 58, 46, color, 0.95);
  } else if (type === 'price') {
    a.push(rr(cx - 66, by - 56, 132, 18, 9, color, 'opacity="0.95"'));
    a.push(rr(cx - 66, by - 28, Math.max(11, 132 * 0.04), 18, 9, color, 'opacity="0.4"'));
  }
  if (tag) a.push(t(cx, by + 20, tag, { size: 14, weight: 500, fill: tagInk || color, anchor: 'middle' }));
}

/* ================= 卡 1：四大情景 ================= */
{
  const stops = `<stop offset="0" stop-color="#00A98C"/><stop offset="0.3" stop-color="#00A98C"/>
    <stop offset="0.3" stop-color="#F1541E"/><stop offset="0.6" stop-color="#F1541E"/>
    <stop offset="0.6" stop-color="#FFB01C"/><stop offset="1" stop-color="#FFB01C" stop-opacity="0.35"/>`;
  const { a, defs } = start(stops);
  header(a, { kicker: D.scenario_kicker, title: D.scenario_title, subtitle: D.scenario_subtitle });

  /* 三顆 KPI 膠囊 */
  const KY = 244, KH = 64, KG = 14, KW = (CW - KG * 2) / 3;
  const kpiColors = ['#2B6FE8', '#F08A00', '#E8481A'];
  D.context_kpis.forEach((k, i) => {
    const x = M + i * (KW + KG);
    a.push(rr(x, KY, KW, KH, 14, '#F5F8FC', `stroke="#E7ECF3" stroke-width="1"`));
    a.push(rr(x, KY + 12, 4, KH - 24, 2, kpiColors[i]));
    a.push(t(x + 20, KY + 32, k.value, { size: 27, weight: 700, fill: kpiColors[i] }));
    a.push(t(x + 20, KY + 53, k.label, { size: fit(k.label, 14, KW - 34, 400), fill: C.gray }));
  });

  /* 100% 機率堆疊帶 */
  const BY = 356, BH = 78;
  a.push(t(M, BY - 14, D.scenario_band_label, { size: 17, weight: 500, fill: C.gray }));
  a.push(t(W - M, BY - 14, D.scenario_band_total, { size: 17, fill: C.dim, anchor: 'end' }));
  defs.push(`<clipPath id="bandClip"><rect x="${M}" y="${BY}" width="${CW}" height="${BH}" rx="16"/></clipPath>`);
  a.push(`<g clip-path="url(#bandClip)">`);
  let bx = M;
  D.scenarios.slice(0, 3).forEach((s) => {
    const segW = CW * s.prob / 100;
    a.push(rr(bx, BY, segW, BH, 0, s.color));
    const segInk = s.short === 'MIDDLE' ? '#5A3200' : '#FFFFFF';   // 亮金段用深字保對比
    a.push(t(bx + segW / 2, BY + 46, `${s.prob}%`, { size: 40, weight: 700, fill: segInk, anchor: 'middle' }));
    a.push(t(bx + segW / 2, BY + 68, s.short, { size: 17, weight: 500, fill: segInk, anchor: 'middle', op: 0.92, ls: 1.5 }));
    bx += segW;
    a.push(`<line x1="${bx.toFixed(1)}" y1="${BY}" x2="${bx.toFixed(1)}" y2="${BY + BH}" stroke="#FFFFFF" stroke-width="2.5" opacity="0.75"/>`);
  });
  a.push('</g>');
  a.push(rr(M, BY, CW, BH, 16, 'none', `stroke="#FFFFFF" stroke-width="1.5" opacity="0.6"`));

  /* 70% 括號 */
  const b1 = M + CW * 0.30, b2 = W - M, ly = 470;
  a.push(`<line x1="${b1}" y1="${ly}" x2="${b2}" y2="${ly}" stroke="#F1541E" stroke-width="3"/>`);
  [b1, b2].forEach((x) => a.push(`<line x1="${x}" y1="${ly - 9}" x2="${x}" y2="${ly + 9}" stroke="#F1541E" stroke-width="3"/>`));
  const pl = D.scenario_bracket;
  const pw = cw(pl, 19, 700) + 40, px = (b1 + b2) / 2 - pw / 2;
  a.push(rr(px, ly - 19, pw, 38, 19, '#FFFFFF', `stroke="#F1541E" stroke-width="1.6"`));
  a.push(t((b1 + b2) / 2, ly + 7, pl, { size: 19, weight: 700, fill: '#F1541E', anchor: 'middle' }));

  /* 四張色塊卡 */
  const CY0 = 508, CH = 158, CG = 14;
  D.scenarios.forEach((s, i) => {
    const y = CY0 + i * (CH + CG);
    a.push(rr(M, y, CW, CH, 18, s.tint, `stroke="${s.color}" stroke-opacity="0.14" stroke-width="1"`));
    a.push(rr(M, y + 18, 7, CH - 36, 3.5, s.color));
    a.push(t(M + 30, y + 96, `${s.prob}%`, { size: 64, weight: 700, fill: s.ink }));
    a.push(t(M + 32, y + 124, D.scenario_odds_label, { size: 15, fill: C.gray }));

    a.push(t(M + 208, y + 50, s.name, { size: 30, weight: 700 }));
    a.push(t(M + 208, y + 76, s.key, { size: 14, weight: 500, fill: s.ink, ls: 2 }));
    a.push(t(M + 208, y + 106, s.lines[0], { size: fit(s.lines[0], 18, 534, 400), fill: C.body }));
    a.push(t(M + 208, y + 132, s.lines[1], { size: fit(s.lines[1], 18, 534, 400), fill: C.body }));

    const rx = M + CW - 232;
    const tagW = cw(s.tag, 14, 500) + 26;
    a.push(rr(rx + 210 - tagW, y + 22, tagW, 30, 15, '#FFFFFF', `stroke="${s.color}" stroke-opacity="0.35" stroke-width="1"`));
    a.push(t(rx + 210 - tagW / 2, y + 42, s.tag, { size: 14, weight: 500, fill: s.ink, anchor: 'middle' }));
    mini(a, rx + 105, y + 126, s.mini, s.color, s.stat, s.ink);
  });

  finish(a, defs, `eisman-scenarios-${D.stamp}`);
}

/* ================= 卡 2：五大風險 ================= */
{
  const stops = `<stop offset="0" stop-color="#FFB01C"/><stop offset="0.25" stop-color="#FF8A1E"/>
    <stop offset="0.5" stop-color="#FB6A1C"/><stop offset="0.75" stop-color="#F1541E"/>
    <stop offset="1" stop-color="#D1400F"/>`;
  const { a, defs } = start(stops);
  header(a, { kicker: D.risk_kicker, title: D.risk_title, subtitle: D.risk_subtitle });

  /* 引言條 */
  a.push(rr(M, 240, CW, 62, 14, '#F5F8FC', `stroke="#E7ECF3" stroke-width="1"`));
  a.push(rr(M, 252, 5, 38, 2.5, '#F1541E'));
  a.push(t(M + 22, 266, D.risk_quote, { size: fit(D.risk_quote, 17, CW - 44, 400), fill: C.gray }));
  a.push(t(M + 22, 290, D.risk_quote_by, { size: 14, weight: 500, fill: C.dim }));

  /* 風險升溫色階條 */
  const SY = 332, SH = 30;
  a.push(t(M, SY - 10, D.risk_scale_label, { size: 16, weight: 500, fill: C.gray, ls: 1 }));
  a.push(t(W - M, SY - 10, D.risk_scale_note, { size: 16, weight: 500, fill: '#C93C10', anchor: 'end' }));
  defs.push(`<clipPath id="scaleClip"><rect x="${M}" y="${SY}" width="${CW}" height="${SH}" rx="15"/></clipPath>`);
  a.push(`<g clip-path="url(#scaleClip)">`);
  D.risks.forEach((r, i) => {
    const sw = CW / 5, x = M + i * sw;
    a.push(rr(x, SY, sw, SH, 0, r.color));
    // 前三段亮金／亮橙用深字，後兩段紅改用白字，兩端都維持對比
    a.push(t(x + sw / 2, SY + 21, r.no, { size: 16, weight: 700, fill: i < 3 ? '#6B3A00' : '#FFFFFF', anchor: 'middle' }));
  });
  a.push('</g>');
  a.push(t(M, SY + SH + 18, D.risk_scale_left, { size: 14, fill: C.dim, ls: 0.6 }));
  a.push(t(W - M, SY + SH + 18, D.risk_scale_right, { size: 14, fill: C.dim, anchor: 'end', ls: 0.6 }));

  /* 五張色塊卡 */
  const CY0 = 410, CH = 150, CG = 12;
  D.risks.forEach((r, i) => {
    const y = CY0 + i * (CH + CG);
    a.push(rr(M, y, CW, CH, 18, r.tint, `stroke="${r.color}" stroke-opacity="0.16" stroke-width="1"`));
    a.push(rr(M, y + 16, 7, CH - 32, 3.5, r.color));
    a.push(t(M + 28, y + 66, r.no, { size: 48, weight: 700, fill: r.color, op: 0.32 }));
    a.push(t(M + 28, y + 104, 'RISK', { size: 13, weight: 500, fill: r.color, ls: 2 }));

    a.push(t(M + 150, y + 48, r.name, { size: fit(r.name, 27, 600), weight: 700 }));
    a.push(t(M + 150, y + 72, r.key, { size: 13, weight: 500, fill: r.ink, ls: 1.8 }));
    a.push(t(M + 150, y + 102, r.lines[0], { size: fit(r.lines[0], 17, 600, 400), fill: C.body }));
    a.push(t(M + 150, y + 128, r.lines[1], { size: fit(r.lines[1], 17, 600, 400), fill: C.body }));

    const rx = M + CW - 226;
    a.push(t(rx + 200, y + 40, r.stat, { size: fit(r.stat, 23, 200), weight: 700, fill: r.ink, anchor: 'end' }));
    a.push(t(rx + 200, y + 60, r.stat_label, { size: 14, fill: C.gray, anchor: 'end' }));
    mini(a, rx + 100, y + 138, r.mini, r.color, null);
  });

  finish(a, defs, `eisman-risks-${D.stamp}`);
}
