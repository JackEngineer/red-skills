# 小工具能做什么

新人可按下表的“想做的事”查能力；熟手直接描述目标，AI 应自行匹配能力、核对条件并提出可落地方案，不要求用户先背接口名。

本表依据 2026-11-19 获取的[官方能力清单](https://miniapp-sandbox.xiaohongshu.com/minitool/doc)，页面标注更新日期为 2026-11-13。覆盖官方 §2 的全部类别、§3 的平台能力、§4 的禁用类别及 §5 图形边界。它是需求索引；调用细节见 [platform.md](platform.md)，运行与资源细节见 [runtime.md](runtime.md)。平台调整后需重新核对，不能将此快照当作永久保证。

## 第一次做，可以从哪里开始？

| 你感兴趣的方向 | 可以从这个功能开始 | 想再加一步时留意 |
| --- | --- | --- |
| 拍照和手作 | 选一张照片、加字，做一张旅行明信片 | 画好预览就能看；保存到手机相册需要相应版本和权限 |
| 测验和小游戏 | 从包里的题库抽题、本地计分 | 记住上次进度需要本地缓存；公开排行榜另有内测资格 |
| 城市和出行 | 手选地点生成打卡海报 | 单次定位需要授权；关闭页面后连续记路线当前不支持 |
| 写作和灵感 | 从自带词库随机组合一句话 | 平台 AI 可在开通内测后根据文字生成；清单没有开放照片识别接口 |

有具体点子时，直接描述用户从打开到完成会做什么。下表按动作查找，每行末尾可回到官方原文。

## 先读状态

| 状态 | 含义 |
| --- | --- |
| 可用 | 官方列出支持，仍须满足兼容基线与资源规则，并验证目标设备 |
| 有条件 | 受版本、权限、容器形态、设备或资源规则约束 |
| 内测 | 还需平台开放或配置，不默认任何账号已获准 |
| 禁用／不支持 | 官方明确禁止，或明确说明当前移动端不支持；不能用另一种调用绕过 |
| 未公开 | 官方未给出接口或保证，不能编造；不等于官方明确宣布该需求永久禁用 |

共用条件：运行环境是隔离的 Web 沙箱。Android 按 Android 8.1 出厂 Chrome / WebView 61、最终 JS 按 ES2017 / Chrome 61 交付；iOS 最低 18.4。新 Web API 与 CSS 只能检测后增强。平台 SDK 由容器注入；普通浏览器缺少 `window.xhs` 时应保留基本页面。平台方法先检查是否存在并处理调用结果；官方标有版本门槛的方法还要核对版本，版本未知时按不支持处理。官方未为基础发笔记、临时文件、AI 单列最低版本，不能自行补上。[运行环境 §1](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s1) · [兼容基线 §2.2](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s2-2) · [调用约定 §3.1](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-1) · [版本判断 §3.6](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-6)

## 画页面、做互动、处理素材

| 想做的事 | 状态与可用方式 | 关键限制与降级方向 | 官方依据 |
| --- | --- | --- | --- |
| 做表单、卡片、抽签、动画页面 | 可用：HTML、CSS、JS；内联样式可用 | 按 Chrome 61 交付；脚本须外置，事件用 `addEventListener`；现代效果保留基础样式 | [§2.1](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s2-1)、[§2.2](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s2-2) |
| 画海报、拼图、涂鸦、合成图片 | 可用：Canvas 2D | 素材须来自允许来源；导出给用户走平台相册或发布能力，不走浏览器下载 | [§2.1](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s2-1)、[§3.4](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-4) |
| 做 3D、粒子、着色器效果 | 有条件：WebGL / WebGL 2 纯渲染 | 检测实际上下文和扩展；失败退到 Canvas 2D 或静态画面。引擎能安装不等于依赖能运行 | [§5](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s5) |
| 选择照片、拍照、选择视频 | 有条件：系统接管的文件选择器 | 仅图片和视频，改变 `accept` 不能导入 CSV、PDF 等任意文件；取消选择时保留原内容 | [§2.3](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s2-3) |
| 使用摄像头、麦克风 | 有条件：`getUserMedia` | 需要系统弹窗授权；处理拒绝与设备不可用。摄像头功能可按产品需要退到选图 | [§2.3](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s2-3) |
| 播放音频、视频 | 有条件：`audio`、`video` 内联播放 | 播放支持不代表任意媒体能入包；当前包类型白名单没有音视频扩展名，也不允许外部媒体 URL。需核对实际媒体来源 | [§2.3](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s2-3)、[§2.6](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s2-6) |
| 让用户选择文字、确认操作 | 可用：文本选择、原生 `alert` / `confirm` | 文本选择不等于可程序化复制，长按菜单已禁用；输入和复杂确认可做页面内表单、弹层 | [§2.1](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s2-1)、[§2.5](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s2-5) |
| 使用图片、字体、脚本和静态数据 | 有条件：完整打包并按同源路径引用 | 图片另可用 `data:` / `blob:`；脚本不能用这些来源。包白名单为 html、css、js、png、jpg、jpeg、gif、webp、svg、woff、woff2、json，必须有且只有一个入口 | [§2.6](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s2-6) |
| 减小启动主包、延后加载大素材 | 有条件：平台静态资源优化，9.53.3+ | 素材以独立文件放根目录 `assets/`，不能 base64 内联，完整 ZIP 仍要包含它们；范围以平台通知为准，仅新发布生效。平台透明取回不开放外网；准备弱网、离线占位和重试 | [§2.7](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s2-7) |
| 把耗时计算移出主线程 | 有条件：9.53+ classic Dedicated Worker | 包内 `.js` 入口，每页同时最多一个；不能用 module、嵌套 Worker、追加脚本、外域或临时脚本。低版本可分批计算。连续隐藏 30 秒会回收，回前台需重建恢复；错误或 `self.close()` 后仍由页面 `terminate()` 释放名额 | [§2.8](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s2-8) |
| 用 Worker 做离屏绘制 | 有条件：9.53+ 且内核支持 OffscreenCanvas / WebGL | 同时满足单 Worker 和资源规则；不能只检测 `Worker` 存在。失败退到主线程绘制或基础画面 | [§5](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s5) |

## 记住数据、跨设备继续使用

| 想做的事 | 状态与可用方式 | 关键限制与降级方向 | 官方依据 |
| --- | --- | --- | --- |
| 记住偏好、草稿、聊天记录 | 有条件：9.46.0+ Storage JS API | JSON 字符串，单 key 1MB、总量 10MB；支持读写、查容量、删单项和清空当前工具。低版本关闭持久缓存并提示升级，方法缺失或失败时说明不能保存，保留本次内存状态 | [§2.4](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s2-4)、[§3.7](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-7) |
| 保存图片文件、二进制或大文件 | 有条件：9.49+ 文件系统 JS API | 支持保存临时文件、覆盖写、追加、分片读、目录、属性、删除和容量查询；只在 `userDataPath` 下管理持久文件，按接口返回的分片限制读写。低版本关闭持久文件功能；清数据、卸载等仍可能丢失 | [§3.8](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-8) |
| 将生成数据交给端内其他能力 | 有条件：`writeTempFile` | base64 / Data URI 换临时文件路径；常见类型 png、jpeg、webp、gif、mp4，其他会失败。临时路径即取即用，不是永久存档；未单列最低版本 | [§3.5](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-5) |
| 同账号换设备继续存档、草稿 | 内测：9.51+ 云存储增删改查 | 按用户和工具隔离，创作者看不到内容，不是任意用户共享数据库。需开放；未授权隐藏入口，按本地存储条件保留本地玩法。批量写可能部分成功或结果未知，未知先查询对账，不能盲目重发 | [§3.16](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-16) |
| 展示公开成绩与本人排名 | 内测：9.51+ 排行榜 | `submitScore` 需配置“用户头像昵称授权”；支持 5 个榜、总/月/周/日周期，保留最好分。公开前 100 名，本人精确到 500 名；未授权退到本地成绩，不编造历史榜、任意分页或好友榜接口 | [§3.17](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-17) |

**存储文档存在冲突。** §2.4 及 §3.7 示例含低版本浏览器存储回退，但 §3.7 正文明确禁止使用 `localStorage`、`sessionStorage`、IndexedDB、Cookie、Cache API。此指南采用更严格的正文，不将它们作为降级。只允许为迁移一次性读取旧数据，迁移后停止读写。所有存档都须容忍缺失，不能承诺永久存在。[Storage 正文 §3.7](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-7)

## 生成文字、感知设备、适配窗口

| 想做的事 | 状态与可用方式 | 关键限制与降级方向 | 官方依据 |
| --- | --- | --- | --- |
| AI 对话、写文案、生成解读 | 内测：`xhs.AI.createModel(...).generateText(...)` | 仅 App 容器，提交 uid 后由平台为 appId 加白；非流式文本，无 API key、自定义地址或 token 费用。每用户每天最多 100 次，输入输出审核；处理未加白、额度用完、审核拦截、空结果。可退到预制内容，但须清楚区分 | [§3.10](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-10) |
| 判断客户端版本、读取启动参数 | 有条件：同步 `xhs.launchOptions`，缺失时用 `getLaunchOptions` | 版本从 `miniToolEnv.buildVersion` 取值，按官方算法比较，缺失不猜测支持；不是任意设备信息查询接口 | [§3.6](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-6) |
| 避开状态栏、返回和分享按钮 | 有条件：9.49+ `getWindowInfo` | 返回窗口、安全区、顶部按钮的逻辑像素矩形；按钮可能 null，窗口变化时重新取值。低版本采用保守布局并实测，不硬编码成所有设备保证 | [§3.11](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-11) |
| 获取当前位置 | 有条件：9.49+ `getLocation` 单次定位 | 系统权限及定位开关由客户端处理；字段可能缺失。拒绝或失败可退到手动选择地区；不做持续、后台定位和轨迹轮询 | [§3.12](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-12) |
| 点击后振一下 | 有条件：9.50+ `vibrateShort` / `vibrateLong` | 无需运行时系统权限；短振指定轻/中/重，不能自定义时长或波形。设备无马达或关闭反馈时成功也可能无体感，始终保留可见反馈 | [§3.13](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-13) |
| 随手机转动做互动 | 有条件：9.50+ 平台陀螺仪 | 获取 x/y/z 角速度，不是姿态角；先监听再采集，结束停止并移除监听。硬件不支持会失败，后台暂停、前台自动续采；可退到触摸操作，不把它扩展为加速度计或指南针 | [§3.14](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-14) |

AI 需单独核对交付渠道。官方注明使用内测 AI 接口的小工具暂不支持通过第三方 Agent 上传；“平台能生成文本”和“当前渠道能交付”是两项判断。不能默认加白后就能通过该渠道上传。[第三方 Agent 指南 §1.1](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s1-1)

## 保存、发布、分享、支持作者

| 想做的事 | 状态与可用方式 | 关键限制与降级方向 | 官方依据 |
| --- | --- | --- | --- |
| 把生成图片存进相册 | 有条件：9.42+ `saveImageToPhotosAlbum` | 接受图片 Data URI 或临时路径，不接受网络 URL；首次可能请求相册权限。拒绝后保留预览与重试，不改用下载绕过 | [§3.4](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-4) |
| 把结果发成笔记 | 有条件：`postNote` 唤起发布页 | 基础接口未单列最低版本；9.43+ 支持 `pageType` 与实况照片。媒体为本地路径/base64，用户仍能编辑或取消；成功不代表审核通过。失败保留结果 | [§3.3](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-3) |
| 把文字、图片带到评论区 | 有条件：9.49+ `interactionOpenApi` | 关闭工具并打开评论编辑器；图片只接受容器可访问本地文件句柄，不接受网络 URL、Data URI、绝对路径；无视频/实况。路由成功不等于评论发布；状态快照最多 2KB，恢复由业务实现 | [§3.9](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-9) |
| 分享小工具或结果图 | 有条件：9.53+ `share`，仅全屏容器 | 每用户每工具每天最多 10 次；指定图片用于站内私信，站外为当前页面截图的 H5 海报。成功只代表触发流程，不代表送达；不支持时隐藏入口，保留结果 | [§3.18](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-18) |
| 关注作者、显示关注状态 | 有条件：9.51+ `followAuthor` / `getFollowStatus` | 仅当前工具作者；由用户点击关注，每账号每工具自然日最多展示 10 次确认框。业务状态可能失败、未登录或作者本人；处理取消与频控，不承诺跨入口即时一致 | [§3.15](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-15) |
| 让用户赞赏作者 | 内测：双端 9.53.3+ `rewardAuthor` | 先开通并核对发布配置中的赞赏开关，用户主动点击；无已公开配置查询 API。成功不含金额或到账结论；低版本隐藏入口，避免未知事件一直等待 | [§3.19](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-19) |
| 关闭时允许展示赞赏挽留 | 内测：双端 9.53.3+ `setCloseRetentionEnabled` | 必须配合赞赏开通，不能单独用。默认关闭，仅当前容器有效；设为 true 不立即弹窗，是否展示由客户端决定。低版本跳过设置 | [§3.20](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-20) |

## 明确做不了什么

下面覆盖官方 §4 各类限制及 §5 的额外限制。替代方向是工程建议，不增加平台权限；未列出的原生能力不受支持，不能试探私有接口。[平台接口范围 §3.2](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-2)

| 想做的事／类别 | 禁用或不支持的能力 | 可考虑的方向 | 官方依据 |
| --- | --- | --- | --- |
| 请求自己的服务器、加载线上素材 | 对外 `fetch` / XMLHttpRequest、外域图片、字体、媒体、脚本和样式；不能直连 CDN | 数据和资源完整入包，或使用已公开的平台能力 | [§4.2](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s4-2)、[§2.6](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s2-6) |
| 实时联机、推送、自建服务轮询 | WebRTC、WebSocket、EventSource / SSE，以及对外轮询 | 改为本地玩法；云存储不等于实时通信 | [§4.1](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s4-1)、[§4.2](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s4-2) |
| 动态执行、下载代码、WASM 加速 | `eval`、`new Function`、WASM 编译执行，内联脚本、行内事件、`javascript:`、外域/data/blob 脚本 | 构建期生成并打包经典外置脚本 | [§4.2](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s4-2)、[§2.6](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s2-6) |
| 运行抠图模型、图像 AI 或压缩模型解码器 | 依赖 WASM 的 Draco、Basis、ONNX、抠图库；外部模型请求；平台 AI 不提供图像生成或图像处理 | 开发期备好素材，运行期用 Canvas / 可支持的 WebGL 合成 | [§5](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s5) |
| 用线上图做纹理、共享内存多线程 | 外域图片纹理、SharedArrayBuffer 多线程 | 本地资源、Canvas、内存纹理；符合规则的单 Worker | [§5](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s5) |
| 网页定位和运动传感器 | `navigator.geolocation`、Web 加速度计、陀螺仪、磁力计、环境光、设备运动/朝向 | 平台单次定位、平台角速度；其余改为手动输入或触摸 | [§4.1](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s4-1) |
| 一键复制、读取或粘贴剪贴板 | `navigator.clipboard`、`execCommand` 的 copy/cut/paste | 展示可选择文本；不承诺有程序化复制替代或长按菜单 | [§4.1](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s4-1)、[§4.2](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s4-2) |
| 连接硬件 | 蓝牙、USB、HID、串口 | 当前清单没有通用硬件连接替代 | [§4.1](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s4-1) |
| 跨页面共享线程、常驻后台 | SharedWorker、Service Worker、后台同步/下载 | 前台任务与可恢复的单 Dedicated Worker；不承诺后台持续运行 | [§4.1](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s4-1)、[§4.3](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s4-3) |
| 屏幕共享、网页强制全屏 | 屏幕共享、`requestFullscreen` | 全屏由容器管理，按窗口信息适配 | [§4.1](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s4-1) |
| 查询系统设备详情 | 电池状态、网络信息、媒体设备枚举 | 仅使用已公开的窗口等必要信息，不编造替代接口 | [§4.1](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s4-1) |
| 持久化浏览器存储、跨域存储、系统凭据 | 持久化存储、跨域存储访问、WebAuthn、`navigator.credentials`、Web Locks | 采用平台存储；不将其视为身份认证替代 | [§4.1](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s4-1) |
| 开新窗口、弹输入框、跳转其他站点或工具 | `window.open`、`window.prompt`、`target="_blank"`、站外跳转、小工具互跳、表单提交跳转 | 页面内输入和交互，平台明确支持的发布/分享流程 | [§4.1](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s4-1)、[§4.2](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s4-2) |
| 嵌入网页、浏览器插件 | iframe（含被外部嵌入）、object、Flash 等插件 | 将所需内容实现为当前工具的页面 | [§4.2](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s4-2)、[§2.6](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s2-6) |
| 下载任意文件、使用长按菜单 | `a[download]`、blob 下载、长按菜单 | 图片走相册；任意文件导出没有公开通用替代 | [§4.2](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s4-2) |
| 网页支付、系统通知、NFC 等移动能力 | PaymentRequest、系统通知/推送、NFC、MIDI、XR/AR/VR、PWA 安装、窗口管理、指针/键盘锁定 | 当前移动端不支持；平台赞赏是单独受限能力，不等于通用支付 | [§4.3](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s4-3) |

## AI 如何替用户判断

先将需求拆成页面展示、数据来源、输入、计算、保存和分享动作，再逐项匹配上表。用户只说“做一个记住口味、随机推荐午餐的小工具”，AI 就应选择本地菜品与图片、抽选动画、符合版本条件的 Storage；只有确实需要生成文本时才评估内测 AI 与交付渠道。

遇到条件能力，输出可用条件和降级后的体验；遇到明确禁用，说明不能实现的部分并给可用替代；遇到未公开需求，标为“当前文档未提供支持接口”，不要扩大成“平台禁止一切相关场景”。确认失败、取消、未授权和低版本时仍能使用核心流程，再进入实现。浏览器预览只能验证页面，平台能力最终需在目标容器实测。
