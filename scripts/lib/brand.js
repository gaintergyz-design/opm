/**
 * OPM 品牌標識（右上角）· 2026-11-10 阿澤欽定（二改：放右上角、取代原 @onepagemarket 名字 pill）
 * 素材：assets/opm_logo.png（880×400，透明底，寬高比 2.2:1）
 * 用法：const { brandMark } = require('./lib/brand');
 *       brandMark(a);                         // 右上角，cy=91（原 pill 的視覺中線）, h=36
 *       brandMark(a, { cy: 80, h: 30 });      // 緊湊版（summary 卡 kicker 行）
 *       brandMark(a, { white: true });        // 黑底卡用白色版
 */
const fs = require('fs');
const path = require('path');

const B64 = fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'opm_logo.png')).toString('base64');
const B64_WHITE = fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'opm_logo_white.png')).toString('base64');

/**
 * 右上角品牌標識：右緣貼齊 W-M，垂直中心 cy
 */
function brandMark(a, { W = 1080, M = 48, cy = 91, h = 36, white = false } = {}) {
  const w = +(h * 2.2).toFixed(1);
  const x = +(W - M - w).toFixed(1);
  const y = +(cy - h / 2).toFixed(1);
  a.push(`<image x="${x}" y="${y}" width="${w}" height="${h}" href="data:image/png;base64,${white ? B64_WHITE : B64}"/>`);
}

module.exports = { brandMark };
