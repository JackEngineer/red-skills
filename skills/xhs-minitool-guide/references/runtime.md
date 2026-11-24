# 小工具运行环境与能力边界

依据 2026-11-19 获取的官方能力清单整理，页面标注最后更新 2026-11-13。本文件覆盖第 1、2、4、5 章。文末替代方案是依据这些边界提出的工程选择，不代表新增平台能力。

## 运行与交付

小工具运行在隔离沙箱内，交付物为 HTML、CSS、JavaScript 和静态资源组成的 Web 包。各小工具的运行环境与数据互不访问，也不能互相通信或跳转。容器注入 `window.xhs`，无需自行加载 SDK。[官方运行环境](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s1)

设计依赖内测 AI 的功能时，先核对交付渠道。本版官方指南注明，使用该接口的小工具暂不支持通过第三方 Agent 上传。[官方渠道限制](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s1-1)

兼容基线是 Android 8.1 出厂 Chrome 或 WebView 61，iOS 最低支持 18.4。最终 JS 面向 ES2017 与 Chrome 61，CSS 也必须有 Chrome 61 可用样式。新语法需转译，额外 API 和 CSS 能力需检测并提供降级。iOS 的额外能力不能成为双端核心功能的前提。[官方兼容基线](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s2-2)

## 离线资源与包结构

页面不能主动请求外部服务。脚本、图片、字体和静态数据须完整放进 ZIP，页面用小工具同源路径引用。平台资源分发不等于开放外网访问。[官方资源规则](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s2-6)

| 资源 | 可用形式 | 禁止形式 |
| --- | --- | --- |
| 脚本 | 包内 `.js`，通过 `<script src="./app.js">` 引用 | 内联脚本、HTML 行内事件、`javascript:`、外域脚本、`data:` 或 `blob:` 脚本 |
| CSS | 包内样式表、`<style>`、`style` 属性 | 外域样式表 |
| 图片 | 包内路径、`data:`、`blob:` | 外域图片 |
| 字体 | 包内字体文件 | 外域字体 |
| 嵌入页面和对象 | 无 | `iframe`、`object` |

事件绑定使用外置脚本中的 `addEventListener`。选图预览可以使用 `FileReader.readAsDataURL` 或 `URL.createObjectURL`。图片允许内存来源不意味着脚本也允许同样来源。

包内文件白名单为 `.html`、`.css`、`.js`、`.png`、`.jpg`、`.jpeg`、`.gif`、`.webp`、`.svg`、`.woff`、`.woff2`、`.json`。必须有且只有一个入口文件。音视频播放可用不代表音视频文件扩展名已进入这个白名单。[官方文件类型](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s2-6)

以下是按资源职责组织的示例，`critical/` 和 `workers/` 是自定义目录名。

```text
ZIP 根目录/
├── index.html
├── app.js
├── style.css
├── workers/compute.js
├── critical/mark.svg
└── assets/
    ├── dishes/noodles.webp
    └── fonts/display.woff2
```

入口 HTML、JS、CSS 位于 `assets/` 之外。首屏必需且体积小的素材可随主包下发。较大且可延后加载的素材可作为独立文件放在包根 `assets/` 下，参与平台静态资源优化。待优化素材不能 base64 内联，ZIP 仍须包含全部文件。CSS 的相对路径以样式表位置为基准，动态拼接路径对应的文件也必须真实入包。[官方静态资源优化](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s2-7)

该优化最低客户端版本为 9.53.3，范围以平台通知为准，仅新发布生效，存量作品需重新发布。容器透明取回资源，页面继续用包内路径。参与优化的素材不保证全部离线可用，首次加载和再次打开都需要失败占位或重试。首屏大素材应按实测取舍，不能机械地全部移入 `assets/`。

## 页面、媒体与数据

Canvas 2D 可用，WebGL 的额外限制见下文。文本选择不受限制。摄像头与麦克风使用 `getUserMedia`，需要系统授权。文件选择由系统接管，仅支持图片和视频，修改 `accept` 不能扩大范围。`video` 和 `audio` 支持内联播放。`alert` 与 `confirm` 使用原生 UI，振动使用平台接口。[官方页面能力](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s2-1)、[媒体](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s2-3)、[交互](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s2-5)

本地键值数据使用 Storage JS API，持久文件使用文件系统 JS API，后者需客户端 9.49+。同账号跨设备恢复可评估内测云存储，需客户端 9.51+及接口开放条件。任何方案都不能把数据永久存在视为保证。[官方存储总览](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s2-4)

官方 §2.4 的浏览器存储降级说明，以及 §3.7 示例中的 `localStorage` 回退，与 §3.7 正文明示的禁令冲突。本技能采用更严格的 §3.7 正文。禁止用浏览器存储替代容器接口，仅允许一次性读取旧数据用于迁移，迁移后停止读写。低于 9.46.0 时关闭本地键值缓存入口并提示升级。版本未知、SDK 或方法缺失时说明存储不可用，不回退到浏览器存储。[官方 Storage 正文](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-7)

## Worker 的配额与生命周期

客户端 9.53+ 支持 Dedicated Worker。入口只能是包内 classic `.js`。不支持 module Worker、SharedWorker、Service Worker、外域入口、`data:`、`blob:` 或运行时生成的临时脚本。依赖必须预先打进 Worker 入口，不能追加脚本或建立子 Worker，沙箱内的联网和动态执行限制同样生效。[官方 Worker 规则](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s2-8)

每页同时最多一个 Worker，超额抛出 `QuotaExceededError`。页面调用 `terminate()` 或平台回收才释放名额，`error` 和 `self.close()` 后仍需页面调用 `terminate()`。

页面连续隐藏 30 秒会触发平台回收。提前返回前台会取消计时，隐藏期间新建 Worker 仍沿用本轮期限。期限已到且仍隐藏时，新建会抛出 `SecurityError`。回到前台后需要重建 Worker 并恢复任务数据。

容器扩展 `worker.onTerminate(callback)`，名额释放后异步通知。官方参数值为 `"主动"` 和 `"system"`，分别对应页面主动终止和平台回收，不应擅自改写为 `"manual"`。同一实例对同一回调只通知一次。`offTerminate(callback)` 移除指定监听，省略参数移除该实例全部终止监听。通知可能延迟，页面或进程销毁时不保证送达。

工程建议是在页面保存可恢复的任务输入、任务标识和进度检查点，用一个 Worker 顺序处理任务。重建后忽略旧实例的过期结果。低版本、实例创建失败或能力缺失时，可将计算拆成主线程小批次。可靠恢复不应只依赖终止通知。

## WebGL 与图形计算

本地资源、Canvas、内存对象可作为纹理，外域图片不可用。纯 WebGL 渲染可用不代表所有引擎、加载器和解码器可用。依赖 WASM 的 Draco、Basis、ONNX 或抠图库不可运行，`SharedArrayBuffer` 多线程不可用。[官方图形边界](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s5)

`OffscreenCanvas + Worker` 同时要求客户端 9.53+、目标内核支持 OffscreenCanvas 与所需 WebGL 能力，并满足单 Worker 规则。不能只检测 `Worker` 存在就启用离屏渲染。

平台 AI 当前提供文本生成，不能充当图像生成或图像处理接口。运行期既不能直连外部图像模型，也不能执行 WASM 模型。工程上可在开发期准备和压缩素材，运行期用 Canvas 2D 或受支持的 WebGL 做本地合成。图形增强应有基础画面和可操作的失败状态。

## 被禁用的能力

以下限制来自 [官方禁用 API](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s4-1)、[禁用行为](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s4-2)和[移动端限制](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s4-3)。

| 类别 | 不可用能力 |
| --- | --- |
| 联网与实时通信 | 外部 `fetch`、`XMLHttpRequest`、外部图片字体媒体，WebSocket、SSE、WebRTC |
| 动态代码 | `eval`、`new Function`、WASM 编译执行 |
| 定位与传感器 | `navigator.geolocation`、Web 加速度计、陀螺仪、磁力计、环境光、设备运动和朝向 |
| 剪贴板 | `navigator.clipboard`、`execCommand` 的复制、剪切和粘贴 |
| 硬件 | 蓝牙、USB、HID、串口 |
| 后台与共享 | SharedWorker、Service Worker、后台同步和下载 |
| 页面与导航 | `window.open`、`window.prompt`、`target="_blank"`、站外跳转、小工具间跳转、表单提交跳转、iframe、插件 |
| 屏幕与设备 | 屏幕共享、`requestFullscreen`、电池状态、网络信息、媒体设备枚举 |
| 凭据与存储 | WebAuthn、`navigator.credentials`、Web Locks、持久化存储、跨域存储访问 |
| 导出与菜单 | `a[download]`、blob 下载、长按菜单 |
| 其他移动端能力 | PaymentRequest、系统通知和推送、NFC、MIDI、XR、AR、VR、PWA 安装、窗口管理、指针锁定、键盘锁定 |

## 实际需求的替代方案

下表是工程建议。替代方案仍需各平台接口的版本、开放状态和参数检查。

| 用户需求 | 可实施方向 | 保留的边界 |
| --- | --- | --- |
| 随机推荐今天吃什么 | 本地菜品数据、预制菜品图、前端抽选和换菜动画 | 不运行时调用外部推荐接口或图像模型 |
| 文案生成、灵感助手 | 获准后使用平台 AI 文本生成 | 不等同于流式、外部模型或图像 AI |
| 生成海报并保存 | Canvas 合成，使用平台临时文件和保存相册接口 | 不使用浏览器文件下载 |
| 保存偏好和草稿 | Storage JS API，文件使用文件系统接口 | 不以浏览器存储作为回退 |
| 跨设备个人存档 | 满足条件后使用内测云存储 | 不等于可访问任意用户的通用数据库 |
| 附近内容或倾斜互动 | 平台单次定位、平台陀螺仪 | 不替代实时追踪、磁力计或全部运动传感器 |
| 分享结果 | 平台分享或发笔记接口 | 不自行打开新窗口或外链 |
| 文本输入、确认动作 | 页面内表单和弹层，必要时 `confirm` | 不用 `window.prompt`，不让表单跳转 |
| 复制文本 | 可选文本展示，明确实际可用操作 | 无受支持的程序化剪贴板替代，不承诺长按菜单 |
| 实时多人联机、服务端推送 | 调整为本地玩法或重新界定产品范围 | 无 WebSocket、SSE、WebRTC 或自建服务轮询替代 |
| CSV、PDF、任意文件导入导出 | 调整为受支持的图像输入与图像结果 | 不假设文件选择和下载支持任意格式 |

## 验收要点

检查最终 ZIP 的文件白名单、唯一入口、全部素材、外置脚本和引用路径。检查第三方依赖实际是否触发外网、动态执行、WASM 或不支持的 Worker。浏览器预览通过不能替代容器验证。

在目标容器覆盖资源缺失、SDK 缺失、低版本、摄像头权限拒绝和数据丢失。使用 Worker 时增加并发超额、错误后释放、隐藏不足与超过 30 秒、恢复任务检查。使用 WebGL 时实际绘制首屏并验证能力不足的替代界面。平台托管素材需要分别检查弱网、离线和重试。
