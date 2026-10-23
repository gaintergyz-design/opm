/**
 * OPM 卡統一聲明（2026-10-23 阿澤定稿）
 *
 * 所有 OPM 格式卡片（On Deck / The Close / Winners / Week Ahead / Who Owns X）
 * 頁腳必須用這一份文字，不要各自寫死。
 *
 * 斷行：用 MiSans-Regular 15px 實測寬度做「最小可容納寬度」三等分，
 *       三行實際寬度 732 / 689 / 708px（卡寬 984，左右各留 48）。
 *       改文字或字級就要重新量一次，否則會溢出或出現第四行。
 */
const DISCLAIMER =
  'For informational purposes only. Not investment advice. The relevant data and content ' +
  'are obtained from public sources and for reference only. All third-party trademarks, ' +
  'brand names and logos displayed are for identification purposes only and remain the ' +
  'property of their respective owners.';

const DISCLAIMER_LINES = [
  'For informational purposes only. Not investment advice. The relevant data and content are obtained',
  'from public sources and for reference only. All third-party trademarks, brand names and logos',
  'displayed are for identification purposes only and remain the property of their respective owners.',
];

const DISCLAIMER_SIZE = 15;
const DISCLAIMER_LH = 19;       // 行距

/**
 * 在 svg push 陣列裡畫聲明（三行）
 * ⚠️ 2026-10-23 阿澤定稿：**不要寫 Source**，不論數據來自哪裡都不寫；
 *    免責區只放上面那三段文字。（meta 只留給「數據截止日」這類非來源資訊）
 * @param {(x,y,s,opt)=>string} t  文字產生器
 * @param {string[]} a             svg 片段陣列
 * @param {object} o               { M, W, H, C, meta, handle }
 */
function pushFooter(t, a, o) {
  const { M, W, H, C } = o;
  a.push(`<rect x="${M}" y="${H - 118}" width="${W - M * 2}" height="1" fill="${C.line}"/>`);
  DISCLAIMER_LINES.forEach((line, i) => {
    a.push(t(M, H - 94 + i * DISCLAIMER_LH, line, { size: DISCLAIMER_SIZE, fill: C.dim }));
  });
  const yMeta = H - 94 + DISCLAIMER_LINES.length * DISCLAIMER_LH + 7;
  if (o.meta) a.push(t(M, yMeta, o.meta, { size: 15, fill: C.dim }));
  if (o.handle) a.push(t(W - M, yMeta, o.handle, { size: 15, fill: C.dim, anchor: 'end' }));
}

module.exports = { DISCLAIMER, DISCLAIMER_LINES, DISCLAIMER_SIZE, DISCLAIMER_LH, pushFooter };
