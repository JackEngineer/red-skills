# 移植 Motion Prompt 元素

`get <id>` 为每个元素返回一个文本文件。文件头包含原作者署名与中文规格，格式如下。

```js
// Motion Prompt #012 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#012
// 名称、示例内容、规格、用途、尺寸、周期、依赖的共用辅助代码、动态示例的引用
// @element 12
CELLS[11] = (k, w, h, u) => { … };     // k = CanvasRenderingContext2D，w/h 为卡片尺寸，u 为 [0, cycle) 内的秒数
```

`kit <pack>` 返回元素依赖的代码，包括卡片尺寸、周期、调色板对象 `C`、字体栈，以及缓动、文字、形状等辅助函数。kit 文件头说明如何独立运行一个元素。按该说明将共用代码放在同包各元素之前。

选择页面的临时 URL 随会话结束而失效。需要之后复查时，保留 `get` 返回的本地规格引用，或记录可以再次运行的完整命令。

移植前先读元素的**规格**。其中写明运动顺序和所有关键数值。代码是最终依据，规格用文字描述同一信息。

根据目标环境选择移植方式。

- **直接运行代码**，见第 1、2 节。项目能在 Canvas 2D 上下文绘图，元素函数保持不变，只需提供 `u`、尺寸和位置。
- **迁移参数**，见第 3、4 节。项目使用其他动画技术，需要用目标工具重建运动，沿用时序、缓动和幅度。

## 时间：循环或单次播放

每个元素都写成 `cycle` 秒的循环，多数包含入场、停留和退场或复位，让循环闭合。

- **循环播放**，如背景、状态指示器或示例库：`u = t % cycle`，其中 `t` 是场景开始后的时间。
- **播放一次并停留**，如入场后保持的标题或字幕：`u = Math.min(t, uHold)`。`uHold` 是入场完成后、停留阶段内的时刻，可从规格或代码中的阶段边界找到。不要让 `u` 继续进入退场。
- **播放一次并退场**：先驱动 `u` 完成入场，然后按场景需要将它保持在 `uHold`；场景结束时从退场起点继续。这样无论场景多长，入场和退场都保持设计速度。
- **适配固定时段**，如替换已有场景：延长或缩短停留阶段。只有时段短于入场与退场总和时，才均匀缩放时间 `u = t * k`，并在交付中说明。
- `u` 不得超出 `[0, cycle)`。场景从能给出干净首帧的时刻开始，通常为 `0`，但应逐项核对。

## 1. 原生 Canvas 引擎

同一素材包只初始化一次，放在同一个作用域内，顺序为：

1. kit，保留首行署名。
2. 获取的元素区块，分别保留首行署名。
3. 实际使用的 cell 引用，例如 `const morph = CELLS[11];`。

模块项目可以将这些内容放在一个文件中并导出 cells。不要为每个元素重复复制辅助函数，它们共用 kit。

**两个素材包不能共用作用域。** 各 kit 都声明相同的顶层名称，例如 `CW`、`CH`、`CYC`、`C`、`CELLS` 及各自辅助函数。把两个 kit 粘进同一个脚本或模块会产生语法错误。为各包使用独立模块或函数作用域，并以能区分来源的名称导出：

```js
// motion-prompt-motion.js      （kit "motion" + 元素 #012 等）
export const morph = CELLS[11];  export const MOTION = { w: CW, h: CH, cycle: CYC };
// motion-prompt-camera.js      （kit "camera" + 元素 #045 等）
export const wipe = CELLS[20];   export const CAMERA = { w: CW, h: CH, cycle: 9.4 };  // 使用元素头部的周期；此 kit 中 CYC 是它的一半
```

各包卡片尺寸和周期可能不同，始终将所属包的尺寸和周期传给相应 cell。

**将卡片放入 1920×1080 画面。** 元素在卡片坐标中绘制，宽高取自文件头。缩放上下文，不改内部数值：

```js
function drawElement(ctx, cell, u, x, y, scale, W, H) {   // W、H 为文件头中的卡片尺寸
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();        // 元素可能绘制到卡片边界外
  cell(ctx, W, H, u);
  ctx.restore();
}
// 铺满 1920 宽的画面，并垂直居中：
const s = 1920 / W;  drawElement(ctx, typewriter, u, 0, (1080 - H * s) / 2, s, W, H);
```

- 始终传卡片自身的 `w, h`。传入 `1920, 1080` 会改变布局，因为元素内部尺寸按卡片设计。
- 卡片宽高比不是 16:9。可以将它作为条带或面板放入版式，也可以放大铺满并接受裁切；需要检查重要内容仍在画面内。
- 很多元素会绘制自己的背景，常见形式是元素第一行调用 kit 辅助函数。要叠加到视频或其他图层上，应找到对应调用或填充并删除或替换，在交付中说明改动。
- 缩放上下文会保持文字和形状的矢量绘制，无需额外锐化步骤。画布像素尺寸应采用最终画面尺寸。

**同一画面放多个元素。** 按从后到前的顺序调用，每项分别包在 `save()`/`restore()` 中，并根据自己的起点计算 `u = sceneClock(t - start)`。如果引擎尚未处理，应在各 cell 间复位 `globalAlpha`、`filter` 和 `globalCompositeOperation`。

**使用离屏画布的元素。** 某些元素通过 `document.createElement('canvas')` 实现遮罩、模糊或合成。

- 浏览器中可直接运行。
- Node 中的 node-canvas、skia-canvas、@napi-rs/canvas 没有 `document`。在 kit 运行前补充所需调用，例如 `globalThis.document = { createElement: () => createCanvas(1, 1) }`，其中 `createCanvas` 使用所选库的实现。
- 离屏画布按卡片像素设置尺寸，卡片放大很多时内容会被放大而变软。如果出现此问题，还需在离屏画布内按更大比例绘制，再与动态示例对比一帧。
- 不是所有 Canvas 库都支持 `ctx.filter`。元素使用它时，尽早试渲染一帧。

**字体。** kit 使用系统字体栈。渲染器缺少字体时可能静默回退，导致布局变化。可以注册项目字体并修改 kit 的字体常量，或确认渲染机器能正确解析原字体栈。素材包声明了字体文件时，应在首帧前加载完成。

## 2. Remotion

根据当前帧在 `<canvas>` 上绘图。元素仍是纯函数，预览和导出时同一帧会得到相同结果。

```tsx
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { useEffect, useRef } from 'react';
import { typewriter, CARD_W, CARD_H, CYCLE } from './motion-prompt-motion';   // 每包一个模块，包含 kit 与元素，保留署名行

export const Typewriter: React.FC<{ hold?: number }> = ({ hold }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const t = frame / fps;
  const u = hold === undefined ? t % CYCLE : Math.min(t, hold);   // 循环，或播放一次后停留
  useEffect(() => {
    const ctx = ref.current!.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, CARD_W, CARD_H);
    ctx.save();
    typewriter(ctx, CARD_W, CARD_H, u);
    ctx.restore();
  }, [u]);
  return <canvas ref={ref} width={CARD_W} height={CARD_H} style={{ width: '100%' }} />;
};
```

- `<Sequence>` 内的 `useCurrentFrame()` 从 0 开始，因此 `t` 已经是场景内部时间。
- 为保证清晰，画布像素尺寸应与屏幕显示尺寸匹配：将 `width`、`height` 设为卡片尺寸乘以缩放比例，并在调用 cell 前执行 `ctx.scale(scale, scale)`。
- 不使用 `requestAnimationFrame`、`Date.now()` 或 `performance.now()`，时间只来自帧编号。
- 素材包需要加载字体文件时，通过 `delayRender()` / `continueRender()` 等待。

## 3. 将参数迁移到 CSS、SVG、Lottie 或 After Effects

这里不直接运行参考代码，而是用目标工具重建运动并沿用数值。

1. 从代码和规格中为每个动画属性列一张小表，包含起止时间、起止值和缓动。所有数值取自源代码。距离按卡片相同的比例换算，例如 `1920 / W`；角度、缩放倍率和时长保持不变。
2. 映射缓动，在 kit 中找到对应辅助函数并转换：
   - cubic-bezier 在 CSS 中对应 `cubic-bezier(a, b, c, d)`，SVG 中对应 `keySplines`，Lottie 和 After Effects 关键帧使用相同四个数值的贝塞尔手柄。
   - 幂函数或指数缓动，选择最接近的标准贝塞尔，并说明所选曲线。
   - 弹簧或过冲，按原数值在峰值和稳定点建立关键帧，例如在规定时间让缩放经历 `0 → 1.12 → 1.0`。也可使用 CSS `linear()` 或采样关键帧，不应改成普通 ease-out。
3. 使用目标工具的图形原语，按元素比例重建形状。
4. 交错动画保持每项延迟和顺序。

各工具注意事项：

- **CSS**：每组属性使用一个 `@keyframes`，`animation-duration` 等于周期；单次入场时等于入场时长，并设置 `animation-fill-mode: both`。百分比为 `time / duration`。
- **SVG**：描边绘制对应 `stroke-dasharray` / `stroke-dashoffset`；遮罩对应 `clipPath` 或 `mask`。
- **Lottie**：关键帧时间采用帧数 `time * fps`，保持项目原帧率。
- **After Effects**：按上述数值设置关键帧，或使用 `time - inPoint` 作为 `u` 编写属性表达式。表达式是 JavaScript，可以粘贴 kit 的缓动函数并应用到相同数值。脚本文件中用注释保留许可证行；若数值手动写入关键帧，在图层或合成注释中注明元素。

逐像素效果，如模糊、辉光、颗粒和离屏画布合成，往往没有完全对应的实现。使用目标工具中最接近的效果，与示例对比，并报告差异。

## 4. 视频生成模型提示词

使用元素英文名和规格，以句子描述，不传代码：

- 屏幕上有什么，什么在运动。
- 运动顺序，以及每部分的秒数。
- 如何缓动，例如开始快再稳定、略微过冲后返回、匀速。
- 在哪里停止，保持多久。
- 镜头元素还需说明运动、方向、速度，以及开始和结束时的构图。

再加入用户主体、视觉风格、宽高比和片段时长。每个镜头保持一个明确运动，模型通常比处理一长串动作更可靠。画面文字应逐字写明，并准备核对，因为模型生成文字可能出错。交付时称为“基于 #ID”，不要称为精确移植。

## 颜色

元素颜色来自 kit 的调色板对象 `C`。先读 kit，确定各键负责背景、文字还是强调色，各素材包键名可能不同。更换主题时统一修改一次 `C`，不要逐元素修改颜色字面量，除非元素本身定义了专用颜色。保持原有对比关系，确保文字在背景上仍然可读，各强调色的作用不变。如果项目有品牌色，将其映射到调色板角色，并在交付中列出映射。

## 内容

元素中的文字、数字和名称是示例内容，应替换为用户内容。文字测量和布局按原示例长度设计，长文本替换后应检查；可减小字体常量或换行，不能让文字溢出卡片。日文和拉丁文字在同字号下宽度不同，双语视频应分别检查。中文替换也应核对字形、宽度和换行。

## 许可证行

将元素首行 `// Motion Prompt #ID · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#ID` 保留在衍生代码上方，kit 首行也应保留在 kit 上方。仅迁移数值时，见第 3 节，也要在目标格式允许注释的位置放置同样署名。

## 交付前检查

- 每个移植场景的首帧、运动中途帧和停留帧；能查看示例时进行对比。
- 循环元素的首尾衔接，检查末帧与首帧一致。
- 场景边界，确保没有内容突然出现或消失。
- 替换文字放得下，渲染机器使用预期字体。
- 输出使用项目的尺寸和帧率，而非卡片的尺寸和帧率。
