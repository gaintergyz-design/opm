/**
 * OPM 品牌標識（左上角）· 2026-11-10 阿澤欽定：所有 OPM 卡左上角放 OPM logo
 * 素材：assets/opm_logo.png（880×400，透明底，寬高比 2.2:1）
 * 用法：const { brandMark } = require('./lib/brand');
 *       brandMark(a);                      // 預設 x=48, y=18, h=36
 *       brandMark(a, { y: 8, h: 30 });     // 緊湊版（ownership / etf 等標題高的卡）
 */
const fs = require('fs');
const path = require('path');

const B64 = fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'opm_logo.png')).toString('base64');
const B64_WHITE = fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'opm_logo_white.png')).toString('base64');

function brandMark(a, { x = 48, y = 18, h = 36, white = false } = {}) {
  const w = +(h * 2.2).toFixed(1);
  a.push(`<image x="${x}" y="${y}" width="${w}" height="${h}" href="data:image/png;base64,${white ? B64_WHITE : B64}"/>`);
}

module.exports = { brandMark };
