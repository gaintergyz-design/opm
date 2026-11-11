/**
 * OPM 專題卡 · OpenAI vs Anthropic 對比記分板 · 1080×1350
 *
 * 阿澤 2026-11-11 指定版式：淺色底、左右兩欄、上方兩家大 logo、下方逐項數據對比。
 *   頁首   kicker + 大標題 + 副標 + 漸變條（右上 OPM 標識）
 *   Logo  三欄結構：左 OpenAI mark / 中 VS / 右 Anthropic mark（官方 simple-icons path）
 *   主圖  兩組季度營收柱（Q1–Q3 '26，同一刻度），OpenAI Q3 未披露以虛線框標 n/d
 *   表格  中欄指標名 + 左右欄數值對決（7 項）
 *   股東  圓形 logo 徽章（logos.json）
 *   頁腳  口徑註 + 統一聲明 + handle
 *
 * 2026-11-11 三改（阿澤「backers 標題也居中、每行上下空間更大」）：
 *   backers_label 從「表格下方左對齊獨佔一行」改為「左右兩組徽章之間的中間欄、
 *   折兩行置中」，字級/字重/顏色與中欄 metric（如 Compute commitments）完全一致；
 *   省下的整行高度還給表格：ROW_H 60→66、數值/小字往行中央收、表頭 44→40，
 *   季度柱區上提 12px 騰空間，徽章區與註腳同步重排，文字不再貼分割線。
 *   所有區塊座標集中在下方常數，改版只需調這些值。
 *
 * 數據：data/ai-labs-scorecard.json
 *   OpenAI  = 媒體披露的投資人材料（Bloomberg / Reuters / 財聯社），非審計財報
 *   Anthropic = SEC S-1（2026-10-26 遞表、11-02 更新）
 *   ⚠️ 兩家收入確認口徑不同（淨額 vs 總額），卡上已明示不可直接比較。
 *
 * 用法：NODE_PATH=<ws>/node_modules LABS_STAMP=20261111-0940 node scripts/build_ai_labs_scorecard.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./lib/disclaimer');
const { brandMark } = require('./lib/brand');
const { textWidth } = require('./lib/fontwidths');

const BASE = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'ai-labs-scorecard.json'), 'utf8'));
const LOGO_PATH = path.join(BASE, 'data', 'logos.json');
const LOGOS = fs.existsSync(LOGO_PATH) ? JSON.parse(fs.readFileSync(LOGO_PATH, 'utf8')) : {};

const W = 1080, H = 1350, M = 48, CW = W - M * 2;
const C = { bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3', line: '#E4E7EC' };
const OAI = '#1E293B';        // OpenAI 墨黑
const ANT = '#D97757';        // Anthropic 陶土橘（官方品牌色）
const FONT = 'MiSans';
const handle = '@onepagemarket';

/* 三欄：左 392 / 中 200 / 右 392 */
const LC = 244, MC = 540, RC = 836;
const COL_L_X = M, COL_M_X = 440, COL_R_X = 640, COL_W = 392;

/* 官方 mark（simple-icons，24×24 viewBox，純 path） */
const MARK_OAI = 'M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z';
const MARK_ANT = 'M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z';

let uid = 0, defs = [];
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function t(x, y, s, { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0 } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text>`;
}
const tw = (s, size, weight = 400) => textWidth(s, size, weight);
const rrect = (x, y, w, h, r, fill, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;
function mark(cx, cy, S, d, fill) {
  const k = +(S / 24).toFixed(4);
  return `<g transform="translate(${(cx - S / 2).toFixed(2)} ${(cy - S / 2).toFixed(2)}) scale(${k})"><path d="${d}" fill="${fill}"/></g>`;
}

/* ---------------- 背景 ---------------- */
let svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
defs.push(`<linearGradient id="bgG" x1="0" y1="0" x2="0.35" y2="1">
  <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.55" stop-color="#FAFCFE"/>
  <stop offset="1" stop-color="#F1F6FA"/></linearGradient>`);
defs.push(`<linearGradient id="ruleG" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="${OAI}"/><stop offset="0.5" stop-color="#B9C3CF"/>
  <stop offset="1" stop-color="${ANT}"/></linearGradient>`);
svg.push(`<rect width="${W}" height="${H}" fill="url(#bgG)"/>`);
svg.push(`<g transform="translate(${W / 2} ${H / 2}) rotate(-24)" opacity="0.03">
  ${t(0, 0, handle, { size: 132, weight: 700, anchor: 'middle', ls: 6 })}
</g>`);
brandMark(svg);

/* ---------------- 頁首 ---------------- */
const Y_KICKER = 70, Y_TITLE = 138, Y_SUB = 188, Y_RULE = 204;
svg.push(t(M, Y_KICKER, D.kicker, { size: 16, weight: 700, fill: C.dim, ls: 2.6 }));
const TS = 84;
const AVAIL_T = CW - 104;   // 右上預留 OPM 標識
const twTitle = tw(D.title, TS, 700);
const titleSize = twTitle > AVAIL_T ? Math.floor(TS * AVAIL_T / twTitle) : TS;
svg.push(t(M, Y_TITLE, D.title, { size: titleSize, weight: 700, ls: -2 }));
const SUB = 23;
const twSub = tw(D.subtitle, SUB, 400);
svg.push(t(M, Y_SUB, D.subtitle, { size: twSub > CW ? Math.floor(SUB * CW / twSub) : SUB, fill: C.gray }));
svg.push(`<rect x="${M}" y="${Y_RULE}" width="${CW}" height="5" fill="url(#ruleG)"/>`);

/* ---------------- 大 logo 區（左右 + 中 VS） ---------------- */
const CARD_Y = 222, CARD_H = 186;          // 卡高 158 → 186
const MARK_S = 92, MARK_CY = CARD_Y + 62;  // mark 底 330
const NAME_Y = CARD_Y + 152;               // 名稱字面頂約 344 → 與 mark 留 14px
const STATUS_Y = CARD_Y + 176;
const VS_CY = CARD_Y + 76;
svg.push(rrect(COL_L_X, CARD_Y, COL_W, CARD_H, 18, '#F5F8FB'));
svg.push(rrect(COL_R_X, CARD_Y, COL_W, CARD_H, 18, '#FDF6F2'));
svg.push(mark(LC, MARK_CY, MARK_S, MARK_OAI, OAI));
svg.push(mark(RC, MARK_CY, MARK_S, MARK_ANT, ANT));
svg.push(t(LC, NAME_Y, 'OpenAI', { size: 38, weight: 700, fill: OAI, anchor: 'middle' }));
svg.push(t(RC, NAME_Y, 'Anthropic', { size: 38, weight: 700, fill: ANT, anchor: 'middle' }));
svg.push(t(LC, STATUS_Y, 'PRIVATE  ·  $1.25T', { size: 14, weight: 600, fill: C.dim, anchor: 'middle', ls: 1.2 }));
svg.push(t(RC, STATUS_Y, 'S-1 FILED  ·  OCT 26', { size: 14, weight: 600, fill: C.dim, anchor: 'middle', ls: 1.2 }));
svg.push(`<circle cx="${MC}" cy="${VS_CY}" r="34" fill="#FFFFFF" stroke="${C.line}" stroke-width="1.5"/>`);
svg.push(t(MC, VS_CY + 7, 'VS', { size: 21, weight: 700, fill: C.dim, anchor: 'middle', ls: 1 }));

/* ---------------- 季度營收柱（同一刻度） ---------------- */
const SEC_Y = 430;
svg.push(t(M, SEC_Y + 4, 'QUARTERLY REVENUE  ·  $B', { size: 16, weight: 700, fill: C.dim, ls: 1.6 }));
const BASE_Y = 546, MAX_H = 80, SCALE = D.quarter_scale_max;
const BW = 76, BGAP = 32, GROUP_W = BW * 3 + BGAP * 2;
const gxL = LC - GROUP_W / 2, gxR = RC - GROUP_W / 2;

function barGroup(gx, key, color) {
  D.quarters.forEach((q, i) => {
    const bx = gx + i * (BW + BGAP);
    const v = q[key];
    if (v == null) {
      // 未披露：虛線佔位框，不畫數值柱
      svg.push(rrect(bx, BASE_Y - 34, BW, 34, 5, 'none',
        `stroke="#CFD7E1" stroke-width="1.4" stroke-dasharray="5 4"`));
      svg.push(t(bx + BW / 2, BASE_Y - 10, 'n/d', { size: 15, weight: 600, fill: C.dim, anchor: 'middle' }));
    } else {
      const h = Math.max(4, +(v / SCALE * MAX_H).toFixed(1));
      const top = BASE_Y - h;
      svg.push(rrect(bx, top, BW, h, 4, color));
      svg.push(t(bx + BW / 2, top - 9, `$${v.toFixed(2).replace(/0$/, '')}`,
        { size: 16, weight: 700, fill: color, anchor: 'middle' }));
    }
    svg.push(t(bx + BW / 2, BASE_Y + 22, q.q, { size: 15, fill: C.dim, anchor: 'middle' }));
  });
}
barGroup(gxL, 'oai', OAI);
barGroup(gxR, 'ant', ANT);
svg.push(`<rect x="${M}" y="${BASE_Y + 0.5}" width="${CW}" height="1" fill="${C.line}"/>`);
svg.push(t(MC, SEC_Y + 4, 'SAME SCALE', { size: 14, weight: 700, fill: C.dim, anchor: 'middle', ls: 1.2 }));

/* ---------------- 逐項對比表 ---------------- */
const TBL_Y = 580, HDR_H = 40, ROW_H = 66;   // 行高 60→66，每行上下留白加大
const TBL_BOTTOM = TBL_Y + HDR_H + D.rows.length * ROW_H;
svg.push(rrect(COL_M_X, TBL_Y, 200, TBL_BOTTOM - TBL_Y, 0, '#F5F8FC'));
svg.push(`<rect x="${COL_M_X}" y="${TBL_Y}" width="1" height="${TBL_BOTTOM - TBL_Y}" fill="#E9EDF2"/>`);
svg.push(`<rect x="${COL_M_X + 200}" y="${TBL_Y}" width="1" height="${TBL_BOTTOM - TBL_Y}" fill="#E9EDF2"/>`);
svg.push(t(LC, TBL_Y + 27, 'OPENAI', { size: 16, weight: 700, fill: OAI, anchor: 'middle', ls: 2 }));
svg.push(t(MC, TBL_Y + 27, 'METRIC', { size: 14, weight: 700, fill: C.dim, anchor: 'middle', ls: 2 }));
svg.push(t(RC, TBL_Y + 27, 'ANTHROPIC', { size: 16, weight: 700, fill: ANT, anchor: 'middle', ls: 2 }));
svg.push(`<rect x="${M}" y="${TBL_Y + HDR_H}" width="${CW}" height="1" fill="${C.line}"/>`);

D.rows.forEach((r, i) => {
  const y = TBL_Y + HDR_H + i * ROW_H;
  if (i > 0) svg.push(`<rect x="${M}" y="${y}" width="${CW}" height="1" fill="#EEF1F5"/>`);
  // 行高 66：數值 baseline +33 / 小字 +56 → 上留 ~11px、下留 ~8px，不再貼分割線
  svg.push(t(LC, y + 33, r.oai, { size: 30, weight: 700, fill: r.oai === 'n/d' ? C.dim : OAI, anchor: 'middle' }));
  svg.push(t(RC, y + 33, r.ant, { size: 30, weight: 700, fill: ANT, anchor: 'middle' }));
  svg.push(t(LC, y + 56, r.oaiSub, { size: 13.5, fill: C.dim, anchor: 'middle' }));
  svg.push(t(RC, y + 56, r.antSub, { size: 13.5, fill: C.dim, anchor: 'middle' }));
  const lw = tw(r.label, 15, 600);
  svg.push(t(MC, y + 40, r.label,
    { size: lw > 186 ? Math.floor(15 * 186 / lw) : 15, weight: 600, fill: C.gray, anchor: 'middle' }));
});
svg.push(`<rect x="${M}" y="${TBL_BOTTOM}" width="${CW}" height="1" fill="${C.line}"/>`);

/* ---------------- 著名企業持股 / 夥伴徽章 ----------------
 * 標題改置中於左右兩組徽章之間（中欄 x=540）、折兩行，
 * 字級 / 字重 / 顏色比照中欄 metric（如 Compute commitments）：15 / 600 / C.gray。
 * 不再獨佔表格下方一整行，騰出的高度還給表格行距。 */
const BADGE_CY = TBL_BOTTOM + 52, BADGE_R = 24;
const BK_LINES = Array.isArray(D.backers_label) ? D.backers_label : [D.backers_label];
const BK_GAP = 310;   // 兩組徽章中間的可用寬度（左組右緣 ~384、右組左緣 ~696）
BK_LINES.forEach((s, i) => {
  const w = tw(s, 15, 600);
  const sz = w > BK_GAP - 16 ? Math.floor(15 * (BK_GAP - 16) / w) : 15;
  svg.push(t(MC, BADGE_CY - 7 + i * 20, s,
    { size: sz, weight: 600, fill: C.gray, anchor: 'middle' }));
});
function backers(list, centerX) {
  list.forEach((b, i) => {
    const cx = centerX + (i - 1) * 116;
    const uri = LOGOS[b.t];
    if (uri) {
      const cid = `bk${uid++}`;
      defs.push(`<clipPath id="${cid}"><circle cx="${cx}" cy="${BADGE_CY}" r="${BADGE_R}"/></clipPath>`);
      const ein = BADGE_R * 2 * 0.9, eoff = (BADGE_R * 2 - ein) / 2;
      svg.push(`<g clip-path="url(#${cid})"><image x="${cx - BADGE_R + eoff}" y="${BADGE_CY - BADGE_R + eoff}" width="${ein}" height="${ein}" href="${uri}" image-rendering="optimizeQuality"/></g>`);
      svg.push(`<circle cx="${cx}" cy="${BADGE_CY}" r="${BADGE_R}" fill="none" stroke="#DDE6EF" stroke-width="1.2"/>`);
    } else {
      svg.push(`<circle cx="${cx}" cy="${BADGE_CY}" r="${BADGE_R}" fill="#E9EDF2"/>`);
      svg.push(t(cx, BADGE_CY + 6, b.t.slice(0, 2), { size: 16, weight: 700, fill: C.gray, anchor: 'middle' }));
    }
    svg.push(t(cx, BADGE_CY + BADGE_R + 18, b.n, { size: 13, fill: C.gray, anchor: 'middle' }));
  });
}
backers(D.backers.oai, LC);
backers(D.backers.ant, RC);

/* ---------------- 口徑註 ---------------- */
const NOTE_Y = BADGE_CY + BADGE_R + 41;
const NOTE_SIZE = 12.5;
D.notes.forEach((n, i) => {
  const w = tw(n, NOTE_SIZE, 400);
  const sz = w > CW - 10 ? +(NOTE_SIZE * (CW - 10) / w).toFixed(1) : NOTE_SIZE;
  svg.push(t(M, NOTE_Y + i * 17, n, { size: sz, fill: C.dim }));
});

/* ---------------- 頁腳 ---------------- */
pushFooter(t, svg, { M, W, H, C, meta: D.meta, handle });

svg.push('</svg>');
svg.splice(1, 0, `<defs>${defs.join('')}</defs>`);
const svgStr = svg.join('\n');

const outDir = path.join(BASE, 'out');
fs.mkdirSync(outDir, { recursive: true });
const stamp = process.env.LABS_STAMP || new Date().toISOString().slice(0, 10).replace(/-/g, '');
const stem = `ai-labs-scorecard-${stamp}`;
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
