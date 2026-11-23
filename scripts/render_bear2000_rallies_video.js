/**
 * OPM-專題卡影片：2000 年熊市十二次反彈 → 12 秒 MP4（1080×1350，24fps）
 *
 * 🔴 阿澤欽定：唯二動效 = ①走勢線（含 12 段 green 反彈）從左到右延展
 *    ②每一段反彈走完時，對應的幅度標籤依次彈出。
 *    其餘元素（標題、日期、網格、圖下註、頁尾）逐幀完全不動。
 *    做法：逐幀呼叫 build_bear2000_rallies.js 的 buildCardSvg(progress)，
 *    progress=1 已與靜態卡 SVG 位元組比對一致。
 *
 * 用法：
 *   FFMPEG_BIN=$(python3 -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())") \
 *   NODE_PATH=./node_modules node scripts/render_bear2000_rallies_video.js
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { Resvg } = require('@resvg/resvg-js');
const { buildCardSvg } = require('./build_bear2000_rallies');

const BASE = path.join(__dirname, '..');
const W = 1080, H = 1350;
const FPS = 24, DURATION = 12;
const N = FPS * DURATION;
const START = 0.6, SPAN = 9.2;          /* 0.6s 起跑，跑 9.2s，尾段定格 2.2s（阿澤 11/23 嫌 9s 太快）*/
const FONT_DIRS = [path.join(BASE, 'assets', 'fonts'), path.join(process.env.HOME || '', 'Library', 'Fonts')];
const fontFiles = ['MiSans-Bold.ttf', 'MiSans-Medium.ttf', 'MiSans-Regular.ttf']
  .map((f) => FONT_DIRS.map((d) => path.join(d, f)).find((p) => fs.existsSync(p)))
  .filter(Boolean);
const rendererOpts = {
  fitTo: { mode: 'width', value: W },
  /* 🔴 逐幀渲染必須 loadSystemFonts:false —— 每幀重掃系統字體會慢到 ~20s/幀 */
  font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'MiSans' },
  background: '#FFFFFF',
};
/* 溫和 ease-in-out：頭尾慢一點，中間均勻推進，12 個標籤節奏穩定 */
const ease = (u) => u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;

const ffmpegBin = process.env.FFMPEG_BIN || 'ffmpeg';
const outPath = path.join(BASE, 'out', 'bear2000-rallies-20261123-silent.mp4');
const ff = spawn(ffmpegBin, [
  '-y', '-hide_banner', '-loglevel', 'error',
  '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  outPath,
], { stdio: ['pipe', 'inherit', 'inherit'] });

(async () => {
  for (let i = 0; i < N; i++) {
    const sec = i / FPS;
    const u = Math.max(0, Math.min(1, (sec - START) / SPAN));
    const svgStr = buildCardSvg(ease(u));
    const png = new Resvg(svgStr, rendererOpts).render().asPng();
    if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 48 === 0) console.log(`frame ${i}/${N}  t=${sec.toFixed(2)}s  p=${ease(u).toFixed(3)}`);
  }
  ff.stdin.end();
  const code = await new Promise((r) => ff.on('close', r));
  if (code !== 0) { console.error('ffmpeg failed', code); process.exit(1); }
  console.log('MP4 ->', outPath, `(${(fs.statSync(outPath).size / 1024 / 1024).toFixed(2)} MB, ${DURATION}s @ ${FPS}fps)`);
})().catch((e) => { console.error(e); ff.kill(); process.exit(1); });
