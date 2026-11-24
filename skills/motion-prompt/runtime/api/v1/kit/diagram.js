// Motion Prompt #217-240 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#217
//
// 以下为素材包 "diagram"（资料中常用的图解与图表名称）各元素共用的常量和辅助函数。
// 元素 #217-240 · 539x208 px · 循环时长 4.7 秒
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
//          const u = ((performance.now() - t0) / 1000) % 4.7;   // 单位为秒，0 <= u < 4.7
//          k.setTransform(1, 0, 0, 1, 0, 0); k.clearRect(0, 0, 539, 208);
//          k.save(); cell(k, 539, 208, u); k.restore();
//          requestAnimationFrame(loop);
//        })();
// 各元素的画面只取决于 u，因此可用同一个函数渲染视频帧。将 u 设为 frame / fps。

// @kit
// 每张卡片为 539 × 208 像素，循环时长为 4.7 秒。每帧仅由时间 u 决定。
// 卡片从空白开始，图形依次出现并停留，在 4.1 至 4.5 秒间淡出。第 4.7 秒与起始帧一致。
// 第 09 至 16 张卡片始终显示坐标轴、刻度和网格，只改变数据图形。
const CW = 539, CH = 208, CYC = 4.7;
const C = {
  stage: '#F1F0EE', sub: '#8E8E93', mark: '#3A3A3E',
  blue: '#2F6BEB', blueM: '#9DB8F6', blueL: '#C9D8FB', g2: '#E2E1DE', g3: '#CFCECB', g4: '#A9A8A5'
};
const FONT = '"PingFang SC","Hiragino Sans", "Helvetica Neue", "PingFang SC", "Noto Sans", "Noto Sans CJK JP", system-ui, sans-serif';
const TAU = Math.PI * 2;

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, x) => a + (b - a) * x;
const P = (t, a, b) => clamp((t - a) / (b - a));                       // t 在 a 到 b 区间内的进度，限制在 0 到 1。
const easeInOut = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;   // cubic-bezier(0.65,0,0.35,1)
const easeOut = x => 1 - Math.pow(1 - x, 3);                                       // cubic-bezier(0.33,1,0.68,1)
const easeOutBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };  // cubic-bezier(0.34,1.56,0.64,1)
function rand(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; } // 使用种子生成可复现的随机数。
function rr(k, x, y, w, h, r) { k.beginPath(); k.roundRect(x, y, w, h, r); }
function txt(k, s, x, y, font, col, align = 'left', base = 'alphabetic') {
  k.font = font; k.fillStyle = col; k.textAlign = align; k.textBaseline = base; k.fillText(s, x, y);
}
function bg(k, w, h) { k.fillStyle = C.stage; k.fillRect(0, 0, w, h); }
function fade(u) { return 1 - easeInOut(P(u, 4.1, 4.5)); }
const CELLS = [];

// @shared
// 第 01 至 08 张卡片共用的弹出框、渐进描线和箭头。
function pop(u, a, d = 0.3) { const p = P(u, a, a + d); return p <= 0 ? 0 : easeOutBack(p); }   // 0 -> ~1.1 -> 1
function pen(k, col, lw) { k.strokeStyle = col; k.lineWidth = lw; k.lineCap = 'round'; k.lineJoin = 'round'; }
// 取折线上距起点 d 的点，返回 x、y、方向角 a 和线段终点索引 i。
function along(pts, d) {
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], s = Math.hypot(x1 - x0, y1 - y0);
    if (d <= s || i === pts.length - 1) { const f = s ? clamp(d / s) : 0; return { x: lerp(x0, x1, f), y: lerp(y0, y1, f), a: Math.atan2(y1 - y0, x1 - x0), i }; }
    d -= s;
  }
  return { x: pts[0][0], y: pts[0][1], a: 0, i: 1 };
}
function pathLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
// 描出折线前 t 比例的路径。arrow 为末端箭头的大小，设为 0 时隐藏箭头。
function trace(k, pts, t, arrow = 0, col = null) {
  if (t <= 0) return;
  const L = pathLen(pts), d = t * L, tip = along(pts, d), end = along(pts, Math.max(0, d - arrow * 0.7));
  k.beginPath(); k.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < end.i; i++) k.lineTo(pts[i][0], pts[i][1]);
  k.lineTo(end.x, end.y); k.stroke();
  if (arrow && d > arrow * 0.8) arrowAt(k, tip.x, tip.y, tip.a, arrow, col || k.strokeStyle);
}
function arrowAt(k, x, y, a, s, col) {
  k.save(); k.translate(x, y); k.rotate(a); k.fillStyle = col;
  k.beginPath(); k.moveTo(1, 0); k.lineTo(-s, -s * 0.62); k.lineTo(-s, s * 0.62); k.closePath(); k.fill();
  k.restore();
}
function bezPts(p0, c0, c1, p3, n = 28) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, m = 1 - t;
    out.push([m * m * m * p0[0] + 3 * m * m * t * c0[0] + 3 * m * t * t * c1[0] + t * t * t * p3[0],
              m * m * m * p0[1] + 3 * m * m * t * c0[1] + 3 * m * t * t * c1[1] + t * t * t * p3[1]]);
  }
  return out;
}
function box(k, cx, cy, bw, bh, r, s, col) {
  if (s <= 0.01) return;
  k.save(); k.translate(cx, cy); k.scale(s, s); k.fillStyle = col; rr(k, -bw / 2, -bh / 2, bw, bh, r); k.fill(); k.restore();
}

// @shared
// 第 09 至 16 张卡片共用的坐标轴与绘图函数。坐标轴始终可见，数据在 4.15 至 4.55 秒间淡出。
function hexRGB(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(a, b, t) {   // 接收十六进制颜色值，返回同格式的混合结果。
  const A = hexRGB(a), B = hexRGB(b);
  return '#' + [0, 1, 2].map(i => Math.round(lerp(A[i], B[i], clamp(t))).toString(16).padStart(2, '0')).join('');
}
const dataFade = (u, a = 4.15, b = 4.55) => 1 - easeInOut(P(u, a, b));
function seg(k, x0, y0, x1, y1, col, lw = 2.5, dash) {
  k.strokeStyle = col; k.lineWidth = lw; k.lineCap = 'round'; k.lineJoin = 'round';
  if (dash) k.setLineDash(dash);
  k.beginPath(); k.moveTo(x0, y0); k.lineTo(x1, y1); k.stroke();
  if (dash) k.setLineDash([]);
}
function axes(k, x0, y0, x1, y1, grid = 3) {
  for (let i = 1; i <= grid; i++) { const y = lerp(y1, y0, i / (grid + 0.4)); seg(k, x0 + 4, y, x1, y, C.g2, 2); }
  seg(k, x0, y0, x0, y1, C.g4, 2.5);
  seg(k, x0, y1, x1, y1, C.g4, 2.5);
}
function dot(k, x, y, r, col) { if (r <= 0.05) return; k.fillStyle = col; k.beginPath(); k.arc(x, y, r, 0, Math.PI * 2); k.fill(); }
const SC = { x0: 96, x1: 448, y0: 24, y1: 184 };   // 第 09 张散点图和第 10 张气泡图共用的绘图区。

// @shared
// 第 17 至 24 张卡片共用的入场进度和箭头函数。
const appear = (u, a, d) => easeOut(P(u, a, a + d));
function arrowTo(k, x, y, dx, dy, s, col) {                       // 绘制朝向 (dx, dy) 的实心箭头。
  const L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  k.fillStyle = col; k.beginPath();
  k.moveTo(x + ux * 2, y + uy * 2);
  k.lineTo(x - ux * s - uy * s * 0.6, y - uy * s + ux * s * 0.6);
  k.lineTo(x - ux * s + uy * s * 0.6, y - uy * s - ux * s * 0.6);
  k.closePath(); k.fill();
}
