/**
 * OPM 股權卡引擎（3D 立體空心環 + 正交引導線 + 同心等比橢圓軌道標籤）
 *   —— 由 build_ownership_spcx.js 抽出，供 SpaceX / Meta / 後續標的共用。
 *   阿澤定的硬規則：淺底、環空心有厚度、中心金屬圓盤、標籤等距、
 *   引導線必須橫平豎直（零斜段），L1 單直角優先。
 *
 *   用法：
 *     const build = require('./lib/ownership_card');
 *     build({ data, assetsDir, ramp, start, ring, ... });
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { pushFooter } = require('./disclaimer');

const BASE = path.join(__dirname, '..', '..');

module.exports = function build(OPTS) {
  const O = OPTS;
  const D = O.data;
  const A = (f) => path.join(O.assetsDir, f);

  const CFG = {
    W: 1080, H: 1350, M: 48,
    colors: { bg: '#FFFFFF', ink: '#0B1220', gray: '#5C6675', dim: '#98A2B3', line: '#E4E7EC' },
    font: 'MiSans',
    watermark: { text: '@onepagemarket', size: 132, opacity: 0.045, angle: -24 },
    ring: O.ring || { CX: 550, CY: 760, RX: 245, RY: 162, D: 50, IX: 115, IY: 66 },
    start: O.start == null ? -106 : O.start,
    ramp: O.ramp,
  };
  const PAL = Object.assign({
    bgTop: '#FFFFFF', bgMid: '#F7FAFD', bgBot: '#EDF2F8',
    glowA: ['#1B4C8F', 0.10], glowB: ['#5C6B80', 0.10],
    orbitStroke1: '#C9D6E4', orbitStroke2: '#D7E1EC',
    title2: ['#0B1220', '#8C97A6'],
    handlePill: '#FAEEDA', handleInk: '#854F0B',
    pillBg: '#0B1220', pillFg: '#FFFFFF',
    lead: '#9AA5B1', anchorFill: '#FFFFFF',
  }, O.palette || {});
  const { W, H, M, colors: C } = CFG;
  const { CX, CY, RX, RY, IX, IY, D: DEPTH } = CFG.ring;

  let uid = 0, defs = [];
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function t(x, y, s, o = {}) {
    const { size = 24, weight = 400, fill = C.ink, anchor = 'start', ls = 0 } = o;
    return `<text x="${x}" y="${y}" font-family="${CFG.font}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text>`;
  }
  const rad = (d) => d * Math.PI / 180;
  const px = (d, rx = RX, cy = CY) => CX + rx * Math.cos(rad(d));
  const py = (d, ry = RY, cy = CY) => cy + ry * Math.sin(rad(d));

  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const mix = (v) => Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f));
    return `#${((1 << 24) | (mix(r) << 16) | (mix(g) << 8) | mix(b)).toString(16).slice(1)}`;
  }

  /* ---------- 幾何 ---------- */
  let deg = CFG.start;
  const segs = D.segments.map((s, i) => {
    const a0 = deg, a1 = deg + s.pct / 100 * 360;
    deg = a1;
    return { ...s, a0, a1, aMid: (a0 + a1) / 2, i };
  });
  segs.forEach((s) => {
    if (!s.color) s.color = CFG.ramp[Math.min(s.i, CFG.ramp.length - 1)];
  });
  const HERO_S = D.segments.find((s) => s.hero) || null;
  const HERO = O.hero || (HERO_S ? HERO_S.name : null);
  const HERO_ROLE = O.heroRole || (HERO_S ? HERO_S.role : null) || null;

  function topFace(s) {          // 環形扇區（空心）
    const large = (s.a1 - s.a0) > 180 ? 1 : 0;
    return `M ${px(s.a0)} ${py(s.a0)} ` +
           `A ${RX} ${RY} 0 ${large} 1 ${px(s.a1)} ${py(s.a1)} ` +
           `L ${px(s.a1, IX)} ${py(s.a1, IY)} ` +
           `A ${IX} ${IY} 0 ${large} 0 ${px(s.a0, IX)} ${py(s.a0, IY)} Z`;
  }
  function wallPath(s) {         // 外側壁（僅下半可見）
    const a0 = Math.max(s.a0, 0), a1 = Math.min(s.a1, 180);
    if (a1 - a0 <= 0.5) return '';
    const large = (a1 - a0) > 180 ? 1 : 0;
    return `M ${px(a0)} ${py(a0)} ` +
           `A ${RX} ${RY} 0 ${large} 1 ${px(a1)} ${py(a1)} ` +
           `L ${px(a1, RX, CY + DEPTH)} ${py(a1, RY, CY + DEPTH)} ` +
           `A ${RX} ${RY} 0 ${large} 0 ${px(a0, RX, CY + DEPTH)} ${py(a0, RY, CY + DEPTH)} Z`;
  }
  function holeWallPath() {      // 洞內壁（遠側上半）
    return `M ${px(180, IX)} ${py(180, IY)} ` +
           `A ${IX} ${IY} 0 0 1 ${px(360, IX)} ${py(360, IY)} ` +
           `L ${px(360, IX, CY + DEPTH)} ${py(360, IY, CY + DEPTH)} ` +
           `A ${IX} ${IY} 0 0 0 ${px(180, IX, CY + DEPTH)} ${py(180, IY, CY + DEPTH)} Z`;
  }

  /* ---------- 底圖 ---------- */
  const a = [];
  a.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);

  defs.push(`<linearGradient id="bgL" x1="0" y1="0" x2="0" y2="${H}" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="${PAL.bgTop}"/><stop offset="0.55" stop-color="${PAL.bgMid}"/><stop offset="1" stop-color="${PAL.bgBot}"/></linearGradient>`);
  a.push(`<rect width="${W}" height="${H}" fill="url(#bgL)"/>`);

  defs.push(`<radialGradient id="glowA" cx="0.88" cy="0.10" r="0.52"><stop offset="0" stop-color="${PAL.glowA[0]}" stop-opacity="${PAL.glowA[1]}"/><stop offset="1" stop-color="${PAL.glowA[0]}" stop-opacity="0"/></radialGradient>`);
  defs.push(`<radialGradient id="glowB" cx="0.08" cy="0.86" r="0.5"><stop offset="0" stop-color="${PAL.glowB[0]}" stop-opacity="${PAL.glowB[1]}"/><stop offset="1" stop-color="${PAL.glowB[0]}" stop-opacity="0"/></radialGradient>`);
  a.push(`<rect width="${W}" height="${H}" fill="url(#glowA)"/>`);
  a.push(`<rect width="${W}" height="${H}" fill="url(#glowB)"/>`);

  // 細軌道弧
  a.push(`<ellipse cx="${CX}" cy="${CY + 8}" rx="${RX + 72}" ry="${RY + 58}" fill="none" stroke="${PAL.orbitStroke1}" stroke-width="1" stroke-dasharray="5 9" opacity="0.5"/>`);
  a.push(`<ellipse cx="${CX}" cy="${CY + 8}" rx="${RX + 150}" ry="${RY + 130}" fill="none" stroke="${PAL.orbitStroke2}" stroke-width="1" stroke-dasharray="4 12" opacity="0.4"/>`);

  // 水印
  const wm = CFG.watermark;
  a.push(`<g transform="translate(${W / 2} ${H / 2}) rotate(${wm.angle})" opacity="${wm.opacity}">${t(0, 0, wm.text, { size: wm.size, weight: 700, anchor: 'middle', fill: C.ink, ls: 6 })}</g>`);

  // 右上 handle pill
  const handle = '@onepagemarket';
  const pw = Math.round(handle.length * 17.6) + 44;
  a.push(`<rect x="${W - M - pw}" y="62" width="${pw}" height="58" rx="12" fill="${PAL.handlePill}"/>`);
  a.push(t(W - M - pw / 2, 101, handle, { size: 32, weight: 500, fill: PAL.handleInk, anchor: 'middle' }));

  // 品牌 wordmark
  if (O.wordmark) {
    const wmk = O.wordmark;
    const b64 = fs.readFileSync(A(wmk.file)).toString('base64');
    a.push(`<image x="${W - M - wmk.w}" y="${wmk.y == null ? 132 : wmk.y}" width="${wmk.w}" height="${wmk.h}" href="data:image/png;base64,${b64}" opacity="${wmk.opacity == null ? 0.86 : wmk.opacity}"/>`);
  }

  // 標題 + 副題
  defs.push(`<linearGradient id="steelTxt" x1="0" y1="120" x2="0" y2="185" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="${PAL.title2[0]}"/><stop offset="1" stop-color="${PAL.title2[1]}"/></linearGradient>`);
  a.push(t(M, 96, D.title_line1, { size: 74, weight: 700, fill: C.ink, ls: -1.5 }));
  a.push(`<text x="${M}" y="172" font-family="${CFG.font}" font-size="74" font-weight="700" fill="url(#steelTxt)" letter-spacing="-1.5">${esc(D.title_line2)}</text>`);
  a.push(`<rect x="${M}" y="200" width="420" height="44" rx="22" fill="none" stroke="${C.line}" stroke-width="1.5"/>`);
  a.push(t(M + 24, 229, D.subtitle, { size: 20, fill: C.gray }));
  const NOTE_FS = O.noteSize || 22;
  if (D.summary_note) a.push(t(M + 444, 229, D.summary_note, { size: NOTE_FS, fill: C.gray }));

  /* --- 地面投影 --- */
  defs.push(`<radialGradient id="floorG" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#0B1220" stop-opacity="0.16"/><stop offset="0.72" stop-color="#0B1220" stop-opacity="0.07"/><stop offset="1" stop-color="#0B1220" stop-opacity="0"/></radialGradient>`);
  a.push(`<ellipse cx="${CX}" cy="${CY + DEPTH + 42}" rx="${RX + 140}" ry="66" fill="url(#floorG)"/>`);

  /* --- 3D 空心環 --- */
  // 1) 外側壁
  segs.forEach((s) => {
    const w = wallPath(s);
    if (w) a.push(`<path d="${w}" fill="${shade(s.color, O.wallShade == null ? -0.34 : O.wallShade)}"/>`);
  });
  const DISC = Object.assign({
    dx: 0, dy: 16, drx: 108, dry: 62, dd: 18,
    top: ['#FFFFFF', '#CBD3DD', '#8B96A4'],
    rim: ['#6E7887', '#A5AFBC', '#5A6472'],
    under: '#8C97A5', underOp: 0.5,
    hole: '#6F7A89', holeShade: -0.25,
    file: null, imgW: 96, imgH: 40, imgDx: -2, imgDy: -2,
  }, O.disc || {});
  // 2) 洞內壁（遠側）
  a.push(`<path d="${holeWallPath()}" fill="${shade(DISC.hole, DISC.holeShade)}"/>`);
  // 3) 中心金屬圓盤
  {
    const DX = CX + DISC.dx, DY = CY + DISC.dy, DRX = DISC.drx, DRY = DISC.dry, DD = DISC.dd;
    const g1 = `discTop${uid++}`, g2 = `discRim${uid++}`;
    defs.push(`<radialGradient id="${g1}" cx="0.38" cy="0.30" r="0.75">` +
      `<stop offset="0" stop-color="${DISC.top[0]}"/><stop offset="0.55" stop-color="${DISC.top[1]}"/><stop offset="1" stop-color="${DISC.top[2]}"/></radialGradient>`);
    defs.push(`<linearGradient id="${g2}" x1="${DX - DRX}" y1="0" x2="${DX + DRX}" y2="0" gradientUnits="userSpaceOnUse">` +
      `<stop offset="0" stop-color="${DISC.rim[0]}"/><stop offset="0.5" stop-color="${DISC.rim[1]}"/><stop offset="1" stop-color="${DISC.rim[2]}"/></linearGradient>`);
    // 盤緣（側面）
    a.push(`<path d="M ${DX - DRX} ${DY} A ${DRX} ${DRY} 0 1 0 ${DX + DRX} ${DY} ` +
           `L ${DX + DRX} ${DY + DD} A ${DRX} ${DRY} 0 1 1 ${DX - DRX} ${DY + DD} Z" fill="url(#${g2})"/>`);
    a.push(`<ellipse cx="${DX}" cy="${DY + DD}" rx="${DRX}" ry="${DRY}" fill="${DISC.under}" opacity="${DISC.underOp}"/>`);
    // 盤在洞內的投影
    a.push(`<ellipse cx="${DX}" cy="${DY + DD + 12}" rx="${DRX * 0.92}" ry="14" fill="#0B1220" opacity="0.13"/>`);
    // 盤頂面
    a.push(`<ellipse cx="${DX}" cy="${DY}" rx="${DRX}" ry="${DRY}" fill="url(#${g1})" stroke="#FFFFFF" stroke-width="1.5"/>`);
    a.push(`<ellipse cx="${DX}" cy="${DY}" rx="${DRX - 7}" ry="${DRY - 5}" fill="none" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="1.2"/>`);
    // 盤面圖標
    if (DISC.file) {
      const b64 = fs.readFileSync(A(DISC.file)).toString('base64');
      a.push(`<image x="${DX - DISC.imgW / 2 + DISC.imgDx}" y="${DY - DISC.imgH / 2 + DISC.imgDy}" width="${DISC.imgW}" height="${DISC.imgH}" href="data:image/png;base64,${b64}"/>`);
    }
  }
  // 4) 頂面（環形扇區）
  segs.forEach((s) => {
    a.push(`<path d="${topFace(s)}" fill="${s.color}" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"/>`);
  });
  // 5) 輪廓
  a.push(`<ellipse cx="${CX}" cy="${CY}" rx="${RX}" ry="${RY}" fill="none" stroke="#0B1220" stroke-opacity="0.10" stroke-width="1.5"/>`);
  // 6) 全局光澤（環形）
  {
    const id = `gloss${uid++}`;
    defs.push(`<linearGradient id="${id}" x1="${CX - RX}" y1="${CY - RY}" x2="${CX + RX}" y2="${CY + RY}" gradientUnits="userSpaceOnUse">` +
      `<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.26"/>` +
      `<stop offset="0.45" stop-color="#FFFFFF" stop-opacity="0"/>` +
      `<stop offset="1" stop-color="#0B1220" stop-opacity="0.14"/></linearGradient>`);
    a.push(`<path d="M ${px(-90)} ${py(-90)} A ${RX} ${RY} 0 1 1 ${px(270)} ${py(270)} ` +
           `L ${px(270, IX)} ${py(270, IY)} A ${IX} ${IY} 0 1 0 ${px(-90, IX)} ${py(-90, IY)} Z" fill="url(#${id})"/>`);
  }
  // 7) 前緣高光
  a.push(`<path d="M ${px(0)} ${py(0)} A ${RX} ${RY} 0 0 1 ${px(180)} ${py(180)}" fill="none" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="2"/>`);

  /* --- 標籤（badge + 名稱 + % pill + moneywise 式正交折線）--- */
  const badgeCache = {};
  const GLYPH = {
    bank: (c) => `<path d="M -11 -1 L 0 -7 L 11 -1 Z" fill="${c}"/>` +
                 `<rect x="-9" y="0" width="18" height="1.8" fill="${c}"/>` +
                 `<rect x="-7" y="2" width="2.4" height="6" fill="${c}"/><rect x="-1.2" y="2" width="2.4" height="6" fill="${c}"/><rect x="4.6" y="2" width="2.4" height="6" fill="${c}"/>` +
                 `<rect x="-10" y="8.4" width="20" height="1.8" fill="${c}"/>`,
    people: (c) => `<circle cx="-5" cy="-4" r="3.6" fill="${c}"/><path d="M -12 6 A 7 7 0 0 1 2 6 Z" fill="${c}"/>` +
                   `<circle cx="6" cy="-2.4" r="3" fill="${c}" opacity="0.72"/><path d="M 1.6 6 A 6 6 0 0 1 12.4 6 Z" fill="${c}" opacity="0.72"/>`,
  };
  function badgeImg(s, size) {
    const { badge, icon, mono, monoBg } = s;
    if (mono) {   // 品牌色圓形字標（wordmark 型機構在 46px 下不可讀，改用字母牌）
      const fs_ = Math.round(size * 0.46);
      return `<circle r="${size / 2}" fill="${monoBg || '#111827'}" stroke="#0B1220" stroke-opacity="0.10" stroke-width="1.5"/>` +
             t(0, Math.round(fs_ * 0.355) + 1, mono, { size: fs_, weight: 700, fill: '#FFFFFF', anchor: 'middle', ls: 0.5 });
    }
    if (icon) {
      const g = GLYPH[icon];
      if (!g) return '';
      return `<circle r="${size / 2}" fill="#FFFFFF" stroke="#DDE2E9" stroke-width="1.5"/>` +
             `<g transform="scale(${(size / 44).toFixed(3)})">${g('#5C6675')}</g>`;
    }
    const f = [A(`badge-${badge}.png`), A(`${badge}.png`)].find((p) => fs.existsSync(p));
    if (!f) { console.warn('missing badge asset:', badge); return ''; }
    if (!badgeCache[badge]) badgeCache[badge] = fs.readFileSync(f).toString('base64');
    return `<circle r="${size / 2}" fill="#FFFFFF" stroke="#DDE2E9" stroke-width="1.5"/>` +
           `<image x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" href="data:image/png;base64,${badgeCache[badge]}"/>`;
  }

  const estW = (txt, fs_) => txt.length * 0.62 * fs_;
  const pillW = (disp, pfs) => disp.length * 0.6 * pfs + 34;

  const chip = (x, y, txt, anchor, fs_, h) => {
    const w = Math.round(pillW(txt, fs_));
    const x0 = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x;
    return { rect: `<rect x="${x0}" y="${y}" width="${w}" height="${h}" rx="${Math.round(h * 0.24)}" fill="${PAL.pillBg}"/>`,
             txt: t(x0 + w / 2, y + h / 2 + fs_ * 0.365, txt + '%', { size: fs_, weight: 700, fill: PAL.pillFg, anchor: 'middle' }),
             x0, w };
  };

  // 統一的區塊量測：render 與碰撞盒共用
  function metrics(s, opt) {
    const { nfs = 23, pfs = 34, role = null, lines = null } = opt;
    const nameLines = lines || s.name.split('|');
    const nameH = Math.round(nfs * 1.3);
    const pillH = Math.max(50, Math.round(pfs * 1.32));
    const roleH = role ? 22 : 0;
    const gap = 8, padT = 3, padB = 3;
    const tw = Math.max(...nameLines.map((l) => estW(l, nfs)), role ? estW(role, 17) : 0, pillW(s.disp, pfs));
    const lastBase = padT + nfs + (nameLines.length - 1) * nameH;
    const pillY = lastBase + roleH + gap;
    return { nameLines, nameH, pillH, tw, pillY, blockH: pillY + pillH + padB, padT };
  }

  function block(s, badgeCx, badgeCy, opt = {}) {
    const { bsize = 46, nfs = 23, pfs = 34, badgeName = s.badge, icon = s.icon, role = null, mirror = false } = opt;
    const m = metrics(s, opt);
    const bs = (badgeName || icon || s.mono) ? bsize : 0;
    const top = badgeCy - m.blockH / 2;
    const tx = mirror ? badgeCx - bs / 2 - 12 : badgeCx + bs / 2 + 12;
    const anc = mirror ? 'end' : 'start';
    let out = (badgeName || icon || s.mono)
      ? `<g transform="translate(${badgeCx.toFixed(1)} ${badgeCy.toFixed(1)})">${badgeImg(s, bsize)}</g>`
      : '';
    m.nameLines.forEach((ln, j) => {
      out += t(tx, top + m.padT + nfs + j * m.nameH, ln, { size: nfs, weight: 500, fill: C.ink, anchor: anc });
    });
    if (role) out += t(tx, top + m.padT + nfs + (m.nameLines.length - 1) * m.nameH + 20, role, { size: 17, fill: C.dim, anchor: anc });
    const c = chip(tx, top + m.pillY, s.disp, anc, pfs, m.pillH);
    return out + c.rect + c.txt;
  }

  function blockBox(s, badgeCx, badgeCy, opt) {
    const { bsize = 46, badgeName = s.badge, icon = s.icon, mirror = false } = opt;
    const m = metrics(s, opt);
    const bs = (badgeName || icon || s.mono) ? bsize : 0;
    const x0 = mirror ? badgeCx - bs / 2 - 12 - m.tw : badgeCx - bs / 2;
    return { x0, y0: badgeCy - m.blockH / 2, x1: x0 + bs + 12 + m.tw, y1: badgeCy + m.blockH / 2 };
  }

  /* --- 軌道槽位：標籤等角落在與環「同心等比放大」的橢圓軌道上 --- */
  const NAME_LINES = O.nameLines || {};
  const boxesHit = (a, b, gap = 0) => !(a.x1 + gap < b.x0 || b.x1 + gap < a.x0 || a.y1 + gap < b.y0 || b.y1 + gap < a.y0);

  const HS = Object.assign({ badge: 84, nfs: 31, pfs: 44 }, O.heroSize || {});
  // 段落多（9 段以上）時標籤盒會互相擠壓，可用 labelSize 統一縮小一號
  const LS = Object.assign({ badge: 46, nfs: 23, pfs: 34 }, O.labelSize || {});
  function buildSlot(s, th, ORB) {
    const cosT = Math.cos(rad(th)), sinT = Math.sin(rad(th));
    const big = HERO && s.name === HERO;
    const bsize = big ? HS.badge : LS.badge;
    const opt = {
      bsize,
      mirror: cosT < -0.15,
      nfs: big ? HS.nfs : LS.nfs,
      pfs: big ? HS.pfs : LS.pfs,
      lines: NAME_LINES[s.name] || null,
      role: big ? (HERO_ROLE || null) : null,
    };
    const slot = { x: ORB.cx + ORB.rxg * cosT, y: ORB.cy + ORB.ryg * sinT };
    const badgeC = { x: slot.x + cosT * bsize / 2, y: slot.y + sinT * bsize / 2 };
    const box = blockBox(s, badgeC.x, badgeC.y, opt);
    return { s, th, badgeC, bsize, opt, box };
  }

  const circDiff = (a, b) => { const d = Math.abs(((a - b) % 360 + 360) % 360); return Math.min(d, 360 - d); };

  const RINGBOX = { x0: CX - RX - 3, y0: CY - RY - 3, x1: CX + RX + 3, y1: CY + RY + DEPTH + 3 };
  const OBST = (O.obstacles || []).filter(Boolean);
  const NOTEBOX = O.noteBox ||
    { x0: M + 438, y0: 203, x1: M + 444 + estW(D.summary_note || '', NOTE_FS) + 6, y1: 248 };
  const BOUND = O.bounds || { x0: 20, x1: 1062, y0: 254, y1: 1220 };

  function violCount(slots) {
    let v = 0; const det = { bounds: 0, ring: 0, obst: 0, pair: 0 };
    for (const sl of slots) {
      const b = sl.box;
      if (b.x0 < BOUND.x0 || b.x1 > BOUND.x1 || b.y0 < BOUND.y0 || b.y1 > BOUND.y1) { v += 4; det.bounds++; }
      if (boxesHit(b, RINGBOX)) { v += 6; det.ring++; }
      for (const ob of [NOTEBOX, ...OBST]) if (boxesHit(b, ob)) { v += 6; det.obst++; }
    }
    for (let i = 0; i < slots.length; i++)
      for (let j = i + 1; j < slots.length; j++)
        if (boxesHit(slots[i].box, slots[j].box, 3)) { v += 3; det.pair++; }
    return { v, det };
  }

  function refine(slots0, ORB) {
    const slots = slots0.slice();
    const base = slots.map((sl) => sl.th);
    for (let pass = 0; pass < 2; pass++) {
      let passBest = Infinity;
      for (let i = 0; i < slots.length; i++) {
        let bestTh = slots[i].th, bestScore = Infinity;
        for (let dj = -10; dj <= 10; dj += 1) {
          const th = base[i] + dj;
          const trial = slots.map((sl, k) => (k === i ? buildSlot(sl.s, th, ORB) : sl));
          const { v } = violCount(trial);
          const score = v * 1000 + Math.abs(dj);
          if (score < bestScore) { bestScore = score; bestTh = th; }
        }
        slots[i] = buildSlot(slots[i].s, bestTh, ORB);
        passBest = Math.min(passBest, Math.floor(bestScore / 1000));
      }
      if (passBest === 0) break;
    }
    return slots;
  }

  /* 松弛：每個槽位盡量靠近「自己扇區的中點」，讓引導線最短。
     關鍵坑（2026-10-22 記）：舊版 rebuild() 用 slots0 的原位重建，
     等於拿「鄰居的舊位置」做碰撞檢查，結果接受的組合在最終位置上是重疊的
     —— 必須用游標狀態 cur 重建再檢查。 */
  /* 松弛：目標 = ① 盡量均勻（貼近等角基準）② 有空位就往自己扇區中點靠，縮短引導線。
     代價 = |角度 - 等角基準| + 0.55 × |角度 - 扇區中點|，取區間內代價最小且零違反者。
     坑（2026-10-22）：舊版用 slots0 原物件重建鄰居 → 拿舊位置做碰撞檢查，
     接受的組合在最終位置其實重疊；必須用游標 cur 重建。 */
  function relax(cur0, ORB) {
    let cur = cur0.slice();
    const N = cur.length;
    const eq = cur.map((sl) => sl.th);
    const RC = Object.assign({ even: 1, mid: 0.55 }, O.relaxCost || {});
    for (let pass = 0; pass < 12; pass++) {
      let moved = false;
      for (let i = 0; i < N; i++) {
        const prev = i === 0 ? cur[N - 1].th - 360 : cur[i - 1].th;
        const next = i === N - 1 ? cur[0].th + 360 : cur[i + 1].th;
        const lo = Math.ceil(prev + 2), hi = Math.floor(next - 2);
        if (hi - lo < 1) continue;
        const mid = cur[i].s.aMid;
        const cost = (tt) => RC.even * Math.abs(tt - eq[i]) + RC.mid * circDiff(tt, mid);
        let bestT = cur[i].th, bestC = cost(cur[i].th) + 1e-6;
        for (let tt = lo; tt <= hi; tt++) {
          const c = cost(tt);
          if (c >= bestC) continue;
          const trial = cur.slice();
          trial[i] = buildSlot(cur[i].s, tt, ORB);
          if (violCount(trial).v === 0) { bestC = c; bestT = tt; }
        }
        if (bestT !== cur[i].th) { cur[i] = buildSlot(cur[i].s, bestT, ORB); moved = true; }
      }
      if (!moved) break;
    }
    return cur;
  }

  // 兩段式：粗網格打分（便宜）→ 只精修前 N 個候選（貴）
  function searchOrbit() {
    const N = segs.length, step = 360 / N;
    const cands = [];
    const OR0 = O.orbit || {};
    const G0 = OR0.g0 || 132, G1 = OR0.g1 || 104;
    const C0 = OR0.c0 || 590, C1 = OR0.c1 || 490;
    for (let g = G0; g >= G1; g -= 4) {
      for (let Cc = C0; Cc >= C1; Cc -= 5) {
        for (let th0 = -80; th0 <= 80; th0 += 2) {
          const ORB = { cx: Cc, cy: CY, rxg: RX + g, ryg: RY + g };
          const slots = segs.map((s, i) => buildSlot(s, th0 + i * step, ORB));
          const { v } = violCount(slots);
          let dev = 0; slots.forEach((sl) => { dev += circDiff(sl.th, sl.s.aMid); });
          cands.push({ v, fit: dev + (G0 - g) * 0.2 + Math.abs(Cc - 540) * 0.2, ORB, th0 });
        }
      }
    }
    cands.sort((x, y) => x.v - y.v || x.fit - y.fit);
    let best = null;
    for (const c of cands.slice(0, 60)) {
      let slots = refine(segs.map((s, i) => buildSlot(s, c.th0 + i * step, c.ORB)), c.ORB);
      if (violCount(slots).v === 0) slots = relax(slots, c.ORB);
      const { v, det } = violCount(slots);
      let dev = 0; slots.forEach((sl) => { dev += circDiff(sl.th, sl.s.aMid); });
      const fit = dev + (G0 - (c.ORB.rxg - RX)) * 0.2 + Math.abs(c.ORB.cx - 540) * 0.2;
      if (!best || v < best.v || (v === best.v && fit < best.fit)) best = { v, det, fit, ORB: c.ORB, slots };
    }
    if (process.env.DIAG) {
      console.log('top5:', cands.slice(0, 5).map((c) => `g${c.ORB.rxg - RX}/C${c.ORB.cx}/t${c.th0} v${c.v}`).join('  '));
    }
    return best;
  }

  const ORBIT = searchOrbit();
  if (!ORBIT) throw new Error('orbit layout: no candidate');
  console.log('orbit:', JSON.stringify(ORBIT.ORB), 'viol', ORBIT.v, JSON.stringify(ORBIT.det));
  if (process.env.DIAG) {
    ORBIT.slots.forEach((sl) => {
      const ed = Math.hypot((sl.badgeC.x - ORBIT.ORB.cx) / ORBIT.ORB.rxg, (sl.badgeC.y - ORBIT.ORB.cy) / ORBIT.ORB.ryg);
      console.log(`  ${sl.s.name.padEnd(20)} th=${sl.th.toFixed(1).padStart(6)} mid=${sl.s.aMid.toFixed(1).padStart(6)} d=${circDiff(sl.th, sl.s.aMid).toFixed(0).padStart(4)} ed=${ed.toFixed(3)}`);
    });
  }

  /* --- 引導線：橫平豎直，L1 單直角優先 --- */
  const distPtSeg = (px0, py0, x1, y1, x2, y2) => {
    const dx = x2 - x1, dy = y2 - y1;
    const L2 = dx * dx + dy * dy || 1;
    const tt = Math.max(0, Math.min(1, ((px0 - x1) * dx + (py0 - y1) * dy) / L2));
    return Math.hypot(px0 - (x1 + dx * tt), py0 - (y1 + dy * tt));
  };
  const drawnSegs = [];
  const segPts = (x1, y1, x2, y2, cb) => {
    const n = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 9));
    for (let k = 0; k <= n; k++) cb(x1 + (x2 - x1) * k / n, y1 + (y2 - y1) * k / n);
  };
  const hitRing = (x, y) => {
    const ryE = (y > CY ? RY + DEPTH : RY) + 3;
    return ((x - CX) / (RX + 3)) ** 2 + ((y - CY) / ryE) ** 2 < 1;
  };
  const segClear = (x1, y1, x2, y2, slots, self, gap) => {
    let ok = true;
    segPts(x1, y1, x2, y2, (x, y) => {
      if (!ok) return;
      if (x < 14 || x > 1066 || y < 256 || y > 1222 || hitRing(x, y)) { ok = false; return; }
      for (const so of slots) {
        if (so === self) continue;
        const b = so.box;
        if (x > b.x0 - gap && x < b.x1 + gap && y > b.y0 - gap && y < b.y1 + gap) { ok = false; return; }
      }
      for (const b of [NOTEBOX, ...OBST]) {
        if (x > b.x0 - gap && x < b.x1 + gap && y > b.y0 - gap && y < b.y1 + gap) { ok = false; return; }
      }
    });
    return ok;
  };
  const segFree = (x1, y1, x2, y2) => {
    const thr = Math.hypot(x2 - x1, y2 - y1) > 120 ? 14 : 3;
    for (const sg of drawnSegs) {
      let bad = false;
      segPts(x1, y1, x2, y2, (x, y) => { if (distPtSeg(x, y, sg[0], sg[1], sg[2], sg[3]) < thr) bad = true; });
      if (bad) return false;
    }
    return true;
  };

  function drawOrbitLabel(sl, slots) {
    const { s, badgeC, bsize, opt } = sl;
    const t0 = rad(s.aMid);
    const ax = px(s.aMid, RX + 6);
    let ay = py(s.aMid, RY + 6);
    if (Math.sin(t0) > 0) ay += DEPTH;
    const nl = Math.hypot(RY * Math.cos(t0), RX * Math.sin(t0)) || 1;
    const nx = (RY * Math.cos(t0)) / nl, ny = (RX * Math.sin(t0)) / nl;
    const hasBadge = !!(s.badge || s.icon || s.mono);
    const bs = hasBadge ? bsize : 0;
    const m = metrics(s, opt);
    const nearX = hasBadge
      ? (opt.mirror ? badgeC.x + bs / 2 + 4 : badgeC.x - bs / 2 - 4)
      : (opt.mirror ? badgeC.x - 4 : badgeC.x + 4);
    const span = hasBadge ? bs / 2 - 8 : m.blockH / 2 - 12;
    const kys = [];
    for (let d = 0; d <= span + 0.1; d += 6) {
      kys.push(badgeC.y - d);
      if (d > 0) kys.push(badgeC.y + d);
    }
    const STUBS = [20, 32, 46, 62, 80, 100, 124];
    const SHIFTS = [0, 14, -14, 28, -28, 44, -44, 62, -62, 84, -84, 110, -110, 140, -140, 175, -175, 210, -210, 250, -250, 300, -300, 340, -340, 380, -380, 420, -420];
    const inXY = (x, y) => x >= 16 && x <= 1064 && y >= 258 && y <= 1218;
    /* 退化段處理（坑 26）：L1/L2 算出的拐角可能與錨點只差 <1.5px（或反之）。
       以前的做法是「丟掉太短的段」，結果剩下的那段起點還是原錨點、
       終點卻是拐角高度 → 出現 1px 的假斜線（肉眼像水平，檢查判 DIAG）。
       正解：以「上一個保留點」為基準吸附，被丟掉的拐角不留殘影。 */
    const trySegs = (raw) => {
      const chain = [[raw[0][0], raw[0][1]]];
      for (const sg of raw) chain.push([sg[2], sg[3]]);
      const pts = [chain[0]];
      for (let i = 1; i < chain.length; i++) {
        const p = pts[pts.length - 1];
        const q = [chain[i][0], chain[i][1]];
        const dx = Math.abs(q[0] - p[0]), dy = Math.abs(q[1] - p[1]);
        if (dx < 1.5 && dy < 1.5) continue;               // 與上一點重合 → 丟棄
        if (dx < 1.5) q[0] = p[0];                        // 吸附成嚴格垂直
        else if (dy < 1.5) q[1] = p[1];                   // 吸附成嚴格水平
        pts.push(q);
      }
      if (pts.length < 2) return null;
      const ss = [];
      for (let i = 1; i < pts.length; i++) ss.push([pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]]);
      for (const sg of ss) {
        if (!segClear(sg[0], sg[1], sg[2], sg[3], slots, sl, 2) || !segFree(sg[0], sg[1], sg[2], sg[3])) return null;
      }
      return ss;
    };
    let plan = null;
    // L1（首選）：錨點垂直段 → 到標籤高度轉水平 → 進徽章。只有一個直角。
    outerL1:
    for (const Ky of kys) {
      const f = trySegs([[ax, ay, ax, Ky], [ax, Ky, nearX, Ky]]);
      if (f) { plan = f; break outerL1; }
    }
    // L2：錨點水平段 → 到徽章邊緣轉垂直 → 進徽章。同樣只有一個直角。
    if (!plan) outerL2:
    for (const Ky of kys) {
      const f = trySegs([[ax, ay, nearX, ay], [nearX, ay, nearX, Ky]]);
      if (f) { plan = f; break outerL2; }
    }
    // B：水平 → 垂直 → 水平
    if (!plan) outerB:
    for (const sh of SHIFTS.slice().sort((p, q) => Math.abs(ax + p - nearX) - Math.abs(ax + q - nearX))) {
      const x1 = ax + sh;
      if (!inXY(x1, ay)) continue;
      for (const Ky of kys) {
        const f = trySegs([[ax, ay, x1, ay], [x1, ay, x1, Ky], [x1, Ky, nearX, Ky]]);
        if (f) { plan = f; break outerB; }
      }
    }
    // C：垂直 → 水平 → 垂直接徽章
    const DVS = [20, -20, 30, -30, 40, -40, 50, -50, 60, -60, 75, -75, 90, -90,
                 110, -110, 130, -130, 170, -170, 220, -220, 280, -280, 340, -340];
    if (!plan) outerC:
    for (const dv of DVS) {
      const y1 = ay + dv;
      if (!inXY(ax, y1)) continue;
      for (const Ky of kys) {
        const f = trySegs([[ax, ay, ax, y1], [ax, y1, nearX, y1], [nearX, y1, nearX, Ky]]);
        if (f) { plan = f; break outerC; }
      }
    }
    // T：垂直 → 水平 → 垂直，改從徽章上／下緣接入
    if (!plan) outerT:
    for (const dv of DVS) {
      const y1 = ay + dv;
      if (!inXY(ax, y1)) continue;
      const half = bs ? bs / 2 + 4 : 10;
      for (const ty of [badgeC.y - half, badgeC.y + half]) {
        if (!inXY(badgeC.x, ty)) continue;
        const f = trySegs([[ax, ay, ax, y1], [ax, y1, badgeC.x, y1], [badgeC.x, y1, badgeC.x, ty]]);
        if (f) { plan = f; break outerT; }
      }
    }
    // S：垂直 → 水平 → 垂直 → 水平，四段全直角
    if (!plan) outerS:
    for (const dv of DVS) {
      const y1 = ay + dv;
      if (!inXY(ax, y1)) continue;
      const half = bs ? bs / 2 + 4 : 10;
      const attaches = [
        ...kys.map((Ky) => ({ ty: Ky, ex: nearX })),
        { ty: badgeC.y - half, ex: badgeC.x },
        { ty: badgeC.y + half, ex: badgeC.x },
      ];
      for (const at of attaches) {
        if (!inXY(at.ex, at.ty)) continue;
        const xcs = [at.ex];
        for (let k = 18; k <= 200; k += 18) { xcs.push(at.ex + k, at.ex - k); }
        for (const xc of xcs) {
          if (!inXY(xc, at.ty)) continue;
          const f = trySegs([[ax, ay, ax, y1], [ax, y1, xc, y1], [xc, y1, xc, at.ty], [xc, at.ty, at.ex, at.ty]]);
          if (f) { plan = f; break outerS; }
        }
      }
    }
    // A（最後手段，帶斜段）
    if (!plan) outerA:
    for (const stub of STUBS) {
      const Dx = ax + nx * stub, Dy = ay + ny * stub;
      if (!inXY(Dx, Dy)) continue;
      const orderA = SHIFTS.slice().sort((p, q) => Math.abs(Dx + p - nearX) - Math.abs(Dx + q - nearX));
      for (const sh of orderA) {
        const Ex = Dx + sh;
        if (!inXY(Ex, Dy)) continue;
        for (const Ky of kys) {
          const f = trySegs([[ax, ay, Dx, Dy], [Dx, Dy, Ex, Dy], [Ex, Dy, Ex, Ky], [Ex, Ky, nearX, Ky]]);
          if (f) { plan = f; break outerA; }
        }
      }
    }
    let pts;
    if (plan) {
      pts = [[ax, ay], ...plan.map((sg) => [sg[2], sg[3]])];
      plan.forEach((sg) => drawnSegs.push(sg));
    } else {
      let K = null;
      for (const stub of [26, 38, 52, 68, 86, 106]) {
        const cand = [ax + nx * stub, ay + ny * stub];
        if (cand[0] > 16 && cand[0] < 1064 && cand[1] > 260 && !hitRing(cand[0], cand[1]) &&
            segClear(ax, ay, cand[0], cand[1], slots, sl, 2) &&
            segClear(cand[0], cand[1], badgeC.x, badgeC.y, slots, sl, 2)) { K = cand; break; }
      }
      if (!K) K = [ax + nx * 26, ay + ny * 26];
      const dl = Math.hypot(K[0] - badgeC.x, K[1] - badgeC.y) || 1;
      const P = [badgeC.x + (K[0] - badgeC.x) / dl * (bsize / 2 + 4), badgeC.y + (K[1] - badgeC.y) / dl * (bsize / 2 + 4)];
      pts = [[ax, ay], K, P];
      drawnSegs.push([ax, ay, K[0], K[1]], [K[0], K[1], P[0], P[1]]);
    }
    const poly = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    a.push(`<polyline points="${poly}" fill="none" stroke="${PAL.lead}" stroke-width="1.2"/>`);
    a.push(`<circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="3.5" fill="${PAL.anchorFill}" stroke="${C.ink}" stroke-width="1.4"/>`);
    a.push(block(s, badgeC.x, badgeC.y, opt));
    return !!plan;
  }
  // 難度優先繪製
  let fallbackCount = 0;
  ORBIT.slots
    .slice()
    .sort((p, q) => Math.hypot(q.badgeC.x - px(q.s.aMid, RX + 6), q.badgeC.y - py(q.s.aMid, RY + 6)) -
                    Math.hypot(p.badgeC.x - px(p.s.aMid, RX + 6), p.badgeC.y - py(p.s.aMid, RY + 6)))
    .forEach((sl) => { if (!drawOrbitLabel(sl, ORBIT.slots)) fallbackCount++; });
  if (fallbackCount) console.log('leader fallback:', fallbackCount);

  /* --- 品牌主體圖形（選配，如星艦 / 標的芯片）--- */
  if (O.figure && O.figure.svg) {
    a.push(`<g>${O.figure.svg({ defs, uid: () => uid++, t, C, W, H })}</g>`);
  }

  /* --- 頁腳（統一聲明三行；不寫 Source，只留數據截止日）--- */
  pushFooter(t, a, { M, W, H, C, handle, meta: `Data as of ${D.data_as_of}` });

  a.push('</svg>');
  a.splice(1, 0, `<defs>${defs.join('')}</defs>`);
  const svgStr = a.join('\n');

  const outDir = path.join(BASE, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = process.env.PAGES_STAMP || new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const stem = `who-owns-${O.outBase}-${stamp}`;
  fs.writeFileSync(path.join(outDir, `${stem}.svg`), svgStr);

  const FONT_DIRS = [path.join(BASE, 'assets', 'fonts'), path.join(process.env.HOME || '', 'Library', 'Fonts')];
  const fontFiles = ['MiSans-Bold.ttf', 'MiSans-Medium.ttf', 'MiSans-Regular.ttf']
    .map((f) => FONT_DIRS.map((d) => path.join(d, f)).find((p) => fs.existsSync(p)))
    .filter(Boolean);
  const png = new Resvg(svgStr, {
    fitTo: { mode: 'width', value: W },
    font: { fontFiles, loadSystemFonts: true, defaultFontFamily: CFG.font },
    background: '#FFFFFF',
  }).render().asPng();
  fs.writeFileSync(path.join(outDir, `${stem}.png`), png);
  console.log('PNG ->', `out/${stem}.png`, `(${(png.length / 1024).toFixed(0)} KB)`);

  /* 貼文文案一併落盤（坑 28）：畫廊只從 out/caption-<stem>.txt 讀文案，
     沒有這個檔，下次 GitHub Action 重生成 index.html 時該則的文案就會變成
     「（這則還沒生成文案）」。手動補文案很容易漏，所以讓產線自己寫。 */
  if (O.caption) {
    const capPath = path.join(outDir, `caption-${stem}.txt`);
    fs.writeFileSync(capPath, String(O.caption).trim() + '\n');
    console.log('CAPTION ->', `out/caption-${stem}.txt`);
  } else {
    console.warn('⚠️ 未提供 caption，畫廊這則會顯示「（這則還沒生成文案）」');
  }
  return { svg: svgStr, png, stem, fallbackCount, orbit: ORBIT.ORB };
};
