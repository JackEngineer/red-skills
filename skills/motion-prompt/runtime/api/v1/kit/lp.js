// Motion Prompt #073-096 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#073
//
// 以下为素材包 "lp"（落地页与网页效果）各元素共用的常量和辅助函数。
// 元素 #073-096 · 539x208 px · 循环时长 4.8 秒
// 元素代码（简体中文）：../zh-Hans/e/<id>.txt（相对于本辅助代码文件）
// 其他语言：../en/e/<id>.txt（英文）、../ja/e/<id>.txt（日文）
//
// 在浏览器中单独运行一个元素：
//   1. 将本文件内容粘贴到 <script> 中。
//   2. 在其后粘贴元素代码。元素代码会设置 CELLS[n - 1]，其中 n 是元素在素材包内的编号。
//   3. 接着添加以下代码。
//        const c = document.createElement('canvas'); c.width = 539; c.height = 208; document.body.append(c);
//        const k = c.getContext('2d'), cell = CELLS.find(Boolean), t0 = performance.now();
//        (function loop() {
//          const u = ((performance.now() - t0) / 1000) % 4.8;   // 单位为秒，0 <= u < 4.8
//          k.setTransform(1, 0, 0, 1, 0, 0); k.clearRect(0, 0, 539, 208);
//          k.save(); cell(k, 539, 208, u); k.restore();
//          requestAnimationFrame(loop);
//        })();
// 各元素的画面只取决于 u，因此可用同一个函数渲染视频帧。将 u 设为 frame / fps。

// @kit
// 每张卡片为 539 × 208 像素，循环时长为 4.8 秒。每帧仅由时间 u 决定。
const CW = 539, CH = 208;
const CYC = 4.8;
const C = {
  desk: '#E7EAF0', win: '#FFFFFF', bar: '#F3F5F8', rule: '#E2E6ED', ink: '#1C2333', sub: '#7D879B',
  faint: '#DCE1EA', soft: '#F3F5F9', skel: '#E4E8EF', acc: '#FF5A2C', accL: '#FFE5DB', blue: '#3B64E8', blueL: '#E1E8FF'
};
const JP = '"PingFang SC","Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", system-ui, sans-serif';
const EN = '"Avenir Next", "Helvetica Neue", system-ui, sans-serif';
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, x) => a + (b - a) * x;
const P = (t, a, b) => clamp((t - a) / (b - a));
const eIO = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;   // 三次缓入缓出。
const eIOs = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;      // 二次缓入缓出。
const eOut = x => 1 - Math.pow(1 - x, 3);                                      // 三次缓出。
const eIn = x => x * x * x;
const mod = (a, n) => ((a % n) + n) % n;
// 沿用 GSAP 的 elastic.out(1, 0.3) 公式。
const eEl = x => x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x - 0.075) * 2 * Math.PI / 0.3) + 1;
function rr(k, x, y, w, h, r) { k.beginPath(); k.roundRect(x, y, w, h, r); }
function txt(k, s, x, y, font, col, align = 'left', base = 'alphabetic', ls = '0px') {
  k.font = font; k.fillStyle = col; k.textAlign = align; k.textBaseline = base; k.letterSpacing = ls; k.fillText(s, x, y); k.letterSpacing = '0px';
}
// 输入关键帧 [[秒数, 值], …]。用三次缓入缓出连接各帧，u 按周期折返。
function steps(keys, u) {
  u = mod(u, CYC);
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (u < keys[i][0]) { const [t0, a] = keys[i - 1], [t1, b] = keys[i]; return lerp(a, b, eIO((u - t0) / (t1 - t0))); }
  return keys[keys.length - 1][1];
}
// 输入光标路径 [[秒数, x, y], …]，用三次缓入缓出连接各点。
function path(keys, u) {
  u = mod(u, CYC);
  if (u <= keys[0][0]) return [keys[0][1], keys[0][2]];
  for (let i = 1; i < keys.length; i++) if (u < keys[i][0]) { const a = keys[i - 1], b = keys[i], f = eIO((u - a[0]) / (b[0] - a[0])); return [lerp(a[1], b[1], f), lerp(a[2], b[2], f)]; }
  const l = keys[keys.length - 1]; return [l[1], l[2]];
}
// 向前回溯 on(t) 最近一次状态切换，模拟持续 dur 秒的 CSS 过渡。
function trans(on, u, dur, ease = eOut) {
  const s = on(u);
  for (let i = 0, t = u; i < 600; i++, t -= 1 / 120) if (on(t - 1 / 120) !== s) { const q = ease(P(u, t, t + dur)); return s ? q : 1 - q; }
  return s ? 1 : 0;
}
// 浏览器窗口内的页面使用 V 的 511 × 168 坐标系。
const WIN = { x: 14, y: 8, w: 511, h: 192, r: 10, bar: 24 };
const VW = WIN.w, VH = WIN.h - WIN.bar;
function frame(k, url = 'example.com') {
  k.fillStyle = C.desk; k.fillRect(0, 0, CW, CH);
  k.save(); k.shadowColor = 'rgba(28,35,51,.16)'; k.shadowBlur = 16; k.shadowOffsetY = 4;
  k.fillStyle = C.win; rr(k, WIN.x, WIN.y, WIN.w, WIN.h, WIN.r); k.fill(); k.restore();
  k.save(); rr(k, WIN.x, WIN.y, WIN.w, WIN.h, WIN.r); k.clip();
  k.fillStyle = C.bar; k.fillRect(WIN.x, WIN.y, WIN.w, WIN.bar); k.fillStyle = C.rule; k.fillRect(WIN.x, WIN.y + WIN.bar - 1, WIN.w, 1); k.restore();
  for (let i = 0; i < 3; i++) { k.fillStyle = '#CDD3DD'; k.beginPath(); k.arc(WIN.x + 15 + i * 12, WIN.y + 12, 3.6, 0, 7); k.fill(); }
  k.fillStyle = '#E6E9EF'; rr(k, WIN.x + WIN.w / 2 - 110, WIN.y + 5, 220, 14, 7); k.fill();
  txt(k, url, WIN.x + WIN.w / 2, WIN.y + 12.5, `500 9.5px ${EN}`, C.sub, 'center', 'middle');
}
function view(k, fn) {
  k.save(); rr(k, WIN.x, WIN.y + WIN.bar, VW, VH, [0, 0, WIN.r, WIN.r]); k.clip(); k.translate(WIN.x, WIN.y + WIN.bar);
  k.fillStyle = '#fff'; k.fillRect(0, 0, VW, VH); fn(); k.restore();
}
// 只绘制滚动滑块。pos 为归一化位置，ratio 为内容的可见比例。
function sbar(k, pos, ratio = 0.42) { const th = (VH - 8) * ratio; k.fillStyle = 'rgba(28,35,51,.38)'; rr(k, VW - 9, 4 + (VH - 8 - th) * clamp(pos), 5, th, 2.5); k.fill(); }
// 用 n 条横线模拟文字，末行稍短。
function bars(k, x, y, w, n, col = C.faint, hh = 6, gap = 11, last = 0.62) {
  k.fillStyle = col; for (let i = 0; i < n; i++) { rr(k, x, y + i * gap, i === n - 1 && n > 1 ? w * last : w, hh, hh / 2); k.fill(); }
}
// v 切换配色，z 只缩放图像内容，外框保持原尺寸。
const PICS = [
  { sky: ['#A9C0FF', '#E4EBFF'], sun: '#FF5A2C', sx: .74, sy: .32, m1: '#7D9AF4', m2: '#4B6BDB' },
  { sky: ['#FFC7B2', '#FFEDE5'], sun: '#FFFFFF', sx: .28, sy: .34, m1: '#F4977A', m2: '#DD5F3B' },
  { sky: ['#3A4884', '#7484CC'], sun: '#FFE5DB', sx: .6, sy: .3, m1: '#2B3770', m2: '#1C2349' }
];
const M1 = [[0, .62], [.22, .4], [.42, .56], [.66, .3], [.86, .5], [1, .42]], M2 = [[0, .8], [.28, .6], [.5, .76], [.76, .58], [1, .74]];
function mount(k, w, h, pts, col, flip) { k.fillStyle = col; k.beginPath(); k.moveTo(flip ? w : 0, h + 1); pts.forEach(([a, b]) => k.lineTo((flip ? 1 - a : a) * w, b * h)); k.lineTo(flip ? 0 : w, h + 1); k.closePath(); k.fill(); }
function pic(k, x, y, w, h, v = 0, r = 6, z = 1) {
  const p = PICS[v % PICS.length];
  k.save(); rr(k, x, y, w, h, r); k.clip();
  k.translate(x + w / 2, y + h / 2); k.scale(z, z); k.translate(-w / 2, -h / 2);
  const g = k.createLinearGradient(0, 0, 0, h); g.addColorStop(0, p.sky[0]); g.addColorStop(1, p.sky[1]); k.fillStyle = g; k.fillRect(-1, -1, w + 2, h + 2);
  k.fillStyle = p.sun; k.beginPath(); k.arc(w * p.sx, h * p.sy, Math.min(w, h) * 0.13, 0, 7); k.fill();
  mount(k, w, h, M1, p.m1, v % 2); mount(k, w, h, M2, p.m2, (v + 1) % 2);
  k.restore();
}
function btn(k, x, y, w, h, label, col = C.acc, tcol = '#fff', fs = 12) {
  k.fillStyle = col; rr(k, x, y, w, h, h / 2); k.fill(); txt(k, label, x + w / 2, y + h / 2 + 0.5, `700 ${fs}px ${JP}`, tcol, 'center', 'middle');
}
function logo(k, x, y, col = C.ink) { k.fillStyle = C.acc; rr(k, x, y - 7, 14, 14, 4); k.fill(); txt(k, '示例', x + 20, y + 0.5, `800 12px ${EN}`, col, 'left', 'middle', '1px'); }
const NAVX = [300, 346, 392];
function header(k, y, active = -1) {
  k.fillStyle = '#fff'; k.fillRect(0, y, VW, 34); k.fillStyle = C.rule; k.fillRect(0, y + 33, VW, 1);
  logo(k, 18, y + 17);
  ['特色', '价格', '常见问题'].forEach((s, i) => txt(k, s, NAVX[i], y + 17.5, `600 12px ${JP}`, active === i ? C.acc : C.ink, 'left', 'middle'));
  btn(k, 428, y + 7, 70, 20, '免费试用', C.acc, '#fff', 10.5);
}
function cursor(k, x, y, press = 0) {
  const s = 1.2 * (1 - 0.12 * press);
  k.save(); k.translate(x, y); k.scale(s, s); k.beginPath();
  [[0, 0], [0, 16.5], [4.2, 12.6], [7, 19], [9.8, 17.8], [7.1, 11.6], [12.6, 11.6]].forEach(([a, b], i) => i ? k.lineTo(a, b) : k.moveTo(a, b));
  k.closePath(); k.lineJoin = 'round'; k.lineWidth = 1.6; k.strokeStyle = '#fff'; k.fillStyle = C.ink; k.fill(); k.stroke(); k.restore();
}
// 点击圆环持续 0.35 秒，按下期间缩小光标。
function click(k, x, y, u, times) {
  let press = 0;
  for (const tc of times) {
    const d = mod(u - tc + 0.1, CYC) - 0.1;
    if (d > -0.1 && d < 0.12) press = Math.max(press, 1 - Math.abs(d - 0.01) / 0.11);
    if (d >= 0 && d < 0.35) { const q = d / 0.35; k.strokeStyle = `rgba(28,35,51,${0.45 * (1 - q)})`; k.lineWidth = 2; k.beginPath(); k.arc(x, y, 5 + 13 * eOut(q), 0, 7); k.stroke(); }
  }
  cursor(k, x, y, clamp(press));
}
function spinner(k, x, y, r, u, col = C.acc) {
  const a = u / 0.8 * Math.PI * 2;
  k.lineCap = 'round'; k.lineWidth = r * 0.28; k.strokeStyle = C.faint; k.beginPath(); k.arc(x, y, r, 0, 7); k.stroke();
  k.strokeStyle = col; k.beginPath(); k.arc(x, y, r, a, a + Math.PI * 0.6); k.stroke(); k.lineCap = 'butt';
}
// 回溯最近 CYC 秒，查找页面中 top 位置的元素越过判定线 line 的时刻。元素退回显示区下方时重置。
function enteredAt(sy, top, line, u) {
  const dt = 1 / 120, y = t => top - sy(t);
  if (y(u) >= VH) return null;
  for (let t = u; t > u - CYC; t -= dt) {
    const a = y(t), b = y(t - dt);
    if (a >= VH) return null;
    if (a < line && b >= line) return t - dt + dt * (b - line) / (b - a);
  }
  return y(u) < line ? -1e9 : null;
}
const CELLS = [];
