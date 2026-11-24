# 接入平台能力

本文件将官方第 3 章按开发意图整理。先选择能力，再核对版本、授权、业务结果和失败分支。接口未公开的字段不要传，未列出的端能力不要调用。SDK 由容器注入，无需打包 SDK 脚本。

## 先判断可用性，再处理两层结果

官方：[调用约定](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-1)、[接口范围](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-2)、[版本判断](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-6)。

1. 先检查 `window.xhs` 和 `window.xhs.miniTool` 是否存在，再检查要调用的方法是否为函数。
2. 先读 `window.xhs.launchOptions.miniToolEnv.buildVersion`。同步值缺失时，检查并调用异步 `miniTool.getLaunchOptions()`，再读返回的 `miniToolEnv.buildVersion`。
3. 将版本转为数值后执行 `Math.floor(buildVersion / 1000)`。例如 `9462004` 得到 `9462`，末三位编译号不参与比较。无法获得版本时按不支持处理。
4. 一次性异步方法不传回调时返回 Promise。传入 `success`、`fail`、`complete` 中任意一个后返回 `undefined`，不要再 `await` 该返回值来判断完成。
5. 成功结果含 `errMsg: "<api>:ok"`。失败进入 reject 或 fail，收到 `{ errMsg, errCode? }`。参数错误可能在本地直接失败，未发送请求。
6. 调用成功后仍要判断业务字段。例如关注状态 `-1` 是业务失败；云存储批量写可能部分成功。方法存在也不保证客户端支持，必须保留降级。

| 能力 | 最低客户端 | 比较值 |
| --- | --- | --- |
| 保存相册 | 9.42 | 9420 |
| postNote 的 pageType、实况照片 | 9.43 | 9430 |
| 本地键值缓存 | 9.46.0 | 9460 |
| 文件系统、评论、窗口信息、单次定位 | 9.49 | 9490 |
| 短振、长振、陀螺仪 | 9.50 | 9500 |
| 关注、云存储、排行榜 | 9.51 | 9510 |
| 分享 | 9.53 | 9530 |
| 赞赏、赞赏挽留 | 9.53.3，双端 | 9533 |

官方未给 `writeTempFile`、基础 `postNote` 和 AI 单独声明最低版本，不能把相邻接口版本当作它们的保证。

## 把生成结果保存或交给用户发布

官方：[发布笔记](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-3)、[保存相册](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-4)、[临时文件](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-5)。

- 小图可将 Canvas PNG Data URI 直接交给保存相册或笔记媒体字段。大图先调用 `writeTempFile({ data })`，再使用返回的 `filePath`，减少长 base64 的跨端传递。
- `writeTempFile` 接受 base64，也接受带 `data:` 前缀的 Data URI；常见支持类型为 png、jpeg、webp、gif、mp4，其他类型会失败。临时路径即取即用，不存进长期存档。
- 用户点击保存后调用 `saveImageToPhotosAlbum({ filePath })`。`filePath` 可为图片 Data URI 或临时文件路径，不接受网络 URL。首次可能请求相册授权，拒绝进入失败分支。
- `postNote` 必填 `mediaInfo`，图片、视频、实况三类至少提供一类，也可同时提供。标题最多 20 字，正文最多 1000 字。
- 图文使用 `mediaInfo.image_resources: [{ url }]`，数量 1–18；视频使用单个 `mediaInfo.video_resources: { video_url, cover_url? }`；实况使用 `mediaInfo.live_photo_resources: [{ url, video_url }]`，数量 1–18。媒体引用只支持 base64 或本地路径，不支持网络地址。
- `pageType` 可选 `photo_publish`、`video_publish`、`slides_edit`，仅在 9.43+ 使用。用户进入发布页后仍可编辑或取消。
- `postNote` 成功表示发布页唤起且用户点击发布，不代表笔记审核通过。不能据此兑现依赖最终发布状态的业务。

## 把结果带到评论区

官方：[评论草稿](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-9)。

由用户操作调用 `interactionOpenApi({ payload, saveToAlbum? })`。容器会先关闭小工具再打开评论区。`payload.action` 发布评论时使用 `post_comment`，可带 `content` 文本。

图片使用 `payload.media_bean: [{ media_type: "image", cover_image_url: fileHandle }]`。这里比笔记接口更严格，只接受容器可访问的本地文件句柄；网络 URL、Data URI、绝对路径均不可用。视频、实况不支持。

`payload.miniToolSnapshotInfo` 是最多 2KB 的 JSON 字符串，超限字段无效。有效时可在从评论区重开工具后读取并恢复业务状态，恢复代码由开发者实现，不要臆造未公开的读取接口。

`saveToAlbum` 默认 `true`。结果的 `routed` 说明路由状态，`savedToAlbum` 说明相册保存状态，保存失败可能带 `albumFailReason`。分别处理路由与相册结果，不能把路由成功当评论已发布。

## 保存本地偏好、草稿与大文件

官方：[键值缓存](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-7)、[文件系统](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-8)。

### 键值缓存

先检查 9460 版本门槛。`setStorage({ key, data, encrypt? })` 中 `data` 必须是 JSON 字符串，先捕获序列化失败。`getStorage({ key, encrypt? })` 返回 `{ data }`，先处理 `null`，再捕获 JSON 解析失败。`encrypt` 默认 `false`，读写必须一致。

`getStorageInfo()` 返回 `{ keys, usedBytes, limitBytes }`，容量字段单位为字节。单 key 上限 1MB，工具全部缓存上限 10MB。删除单项用 `removeStorage({ key })`；`clearStorage()` 会清空当前工具全部缓存，不可作为普通写入失败的兜底。

来源存在冲突：§2.4 以及 §3.7 的示例代码保留低版本浏览器存储回退，但 §3.7 正文明确禁止。采用正文的保守规则：低于 9.46.0 禁用本地键值缓存并提示升级；版本未知或方法缺失时提示不可用，不回退 `localStorage`、`sessionStorage`、IndexedDB、Cookie 或 Cache API。仅迁移已有老数据时允许一次性读取旧存储，迁移后不再读写。不要复制官方示例中的 `localStorage.setItem` 分支。

### 文件与二进制

从启动参数取得 `miniToolEnv.userDataPath`，缺失时停止持久写入。仅在该根路径后追加业务相对路径，不硬编码、解析或改写端返回的文件句柄。先用 `mkdir({ dirPath, recursive? })` 准备需要的目录。

| 意图 | 调用和结果 |
| --- | --- |
| 持久化临时文件 | `saveFile({ tempFilePath, filePath? })`，可选目的路径也可为 null；移动临时文件，返回 `{ savedFilePath }` |
| 首片或覆盖文件 | `writeFile({ filePath, data, encoding })`，返回 `{ writtenBytes }` |
| 追加后续片 | `appendFile({ filePath, data, encoding })`，返回 `{ writtenBytes }` |
| 读取分片 | `readFile({ filePath, encoding, position?, length? })`，返回 `{ data, bytesRead, eof }` |
| 列目录直接子项 | `readDir({ dirPath })`，返回 `{ files, truncated }`，检查截断状态 |
| 查文件或目录 | `statFile({ filePath })`，返回 `{ size, lastModified, isDir }` |
| 删除持久文件 | `unlink({ filePath })` |
| 查容量和分片限制 | `getFileStorageInfo()` 返回 `usedBytes`、`limitBytes`、`fileCount`、`tmpUsedBytes`、`writeChunkMaxBytes`、`readChunkMaxBytes` |

读写的 `encoding` 仅为 `utf8` 或 `base64`。先查询分片上限，大文件第一片覆盖写，后续片串行追加，不硬编码块大小。显示图片或视频时直接将文件句柄交给 `img.src`、`video.src` 或 CSS，确需字节时才读文件。

持久目录不随容器关闭清空，但卸载、清数据、包清理仍可能导致丢失。存档应能重建或导出，不把本地工作区当备份。

## 用平台模型生成文本

官方：[AI 文本生成](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-10)。

先确认在 App 容器内且存在 `window.xhs.AI`。内测需要提交 uid，由平台给对应 appId 加白。无需 API key、自定义模型地址或 token 费用，不在包内保留外部模型密钥。

通过 `xhs.AI.createModel("deepseek-v4-flash")` 创建模型，再 `await model.generateText({ messages, max_output_tokens?, temperature? })`。默认推荐模型为 `deepseek-v4-flash`，另有带点点人格的 `dots-3-note-prev`。仅支持非流式文本，不设计流式增量或图像生成链路。

`messages` 使用 `system`、`user`、`assistant` 角色，最多 40 条、合计最多 12000 字符。`max_output_tokens` 最大 2048，超出会收敛；`temperature` 范围 0–1.5。平台不保留会话，每次传完整裁剪后的上下文，保留 system 与最近对话，同时按条数和字符数裁剪。跨次会话用平台本地缓存保存，存储失败不得掩盖已经收到的回复。

读取 `result.choices[0].message.content` 前逐级检查，空 `choices` 单独展示空结果。用 `textContent` 渲染模型输出。请求中禁用重复发送并显示等待，成功或失败均在 finally 恢复控件。保留成功结果 `request_id` 供排查。

- `AI_NOT_ALLOWED`：未加白，禁用 AI 入口并保留非 AI 流程。
- `AI_QUOTA_EXCEEDED`：内测每用户每天 100 次上限，停止当日重复请求。
- `AI_CONTENT_BLOCKED`：system、用户输入、输出均可能触发审核，提示调整内容，不自动重复提交相同请求。

## 避让容器按钮，获取一次位置

官方：[窗口信息](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-11)、[单次定位](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-12)。

`getWindowInfo()` 无业务参数。用 `windowWidth`、`windowHeight` 布局，用 `safeArea` 与 `menuButtons.back/me/share` 避让。按钮集合始终存在，但单个按钮不可见时是 `null`。矩形的 `left/top/right/bottom/width/height` 均为容器坐标的逻辑像素，可有小数，不能再乘 DPR 当 CSS 位置。

`pixelRatio` 是无单位像素比；`screenWidth/screenHeight` 是屏幕或承载窗口尺寸，不保证是完整物理屏；`statusBarHeight` 为逻辑高度；`screenTop` 是容器顶部相对承载窗口原点的 y 坐标。不要把 `screenTop` 再加进已经处于容器坐标的安全区矩形。窗口变化后需要最新值时重新读取。

用户发起定位后调用 `getLocation({ type? })`。地图场景显式使用 `gcj02`，GPS 坐标使用 `wgs84`；省略由客户端决定。结果所有业务字段均可缺失，包括 `latitude`、`longitude`、`speed`、`accuracy`、`altitude`、`verticalAccuracy`、`horizontalAccuracy`。经纬度以有限数检查，零是合法值；纬度范围 ±90，经度 ±180。速度单位 m/s，其余高度与精度单位 m。缺失不补零，精度零也不等于完全精确。

权限拒绝、系统定位关闭、定位失败要有用户可继续操作的分支。定位仅一次，不支持后台、持续定位或轨迹，不轮询代替。精确坐标只交给需要的业务，不写日志和埋点。

## 加入触感或动作控制

官方：[振动](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-13)、[陀螺仪](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-14)。

用户操作时调用 `vibrateShort({ type })`，`type` 必填且只能为 `light`、`medium`、`heavy`；长振调用 `vibrateLong()`。无运行时系统权限要求。成功只表示触发，不表示结束；无马达或系统关闭触感时也可能成功但无体感。不能设置自定义波形、时长、数值强度，避免高频触发。

陀螺仪按以下顺序接入，启动前同时检查四个方法并获取当前 `miniTool` 引用，不直接照抄官方示例中未在函数内定义的引用。

1. 使用稳定函数引用调用 `onGyroscopeChange(handler)` 注册。
2. `await startGyroscope({ interval: "ui" })` 启动，失败后移除刚注册的 handler。`ui` 约 60ms，默认 `normal` 约 200ms，实际频率受设备影响。
3. handler 收到 `{ x, y, z }`，单位 rad/s，含义为角速度，不是姿态角。回调不含 errMsg。
4. 业务结束后 `await stopGyroscope()`，finally 中调用 `offGyroscopeChange(handler)`，不等页面卸载才做异步清理。

启停由单一业务串行管理。注册不启动采集，移除不停止采集；停止保留监听，未启动时停止也可成功。同函数重复注册会去重，无参 off 清除全部监听，共享场景只移除自身监听。on/off 同步返回 undefined，不支持通用回调，非法参数同步抛 TypeError。设备不支持会在 start 失败时给 `10002`。进入后台或隐藏时采集暂停，回前台自动恢复。

## 关注作者、分享工具、接受赞赏

官方：[关注](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-15)、[分享](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-18)、[赞赏](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-19)、[挽留开关](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-20)。

### 关注

`getFollowStatus()` 查询，`followAuthor()` 由用户点击触发。均无业务参数，只针对当前工具作者，不能传其他用户 ID。对 resolve 的 `follow_status` 分别处理：`-1` 是业务失败，`0` 未关注或未登录，`1` 已关注含互关，`2` 作者本人。已关注或本人可直接返回，不一定弹窗。

调用层也可能失败：`20002` 是关闭确认框或放弃登录，`15404` 是每日确认框频控，`10003` 是已有确认流程未结束。每账号每工具自然日最多展示 10 次确认框，不弹窗调用不计数。设置 pending 防重复，finally 恢复控件。查询业务失败 resolve 为 -1 且不缓存，可后续查询。其他入口取关可能受进程缓存影响，App 重启后查询才读到更新，不能承诺即时一致。

### 分享

用户点击后调用 `share({ type: "card" })` 或 `share({ type: "image", image_resource })`。图片支持 Data URI 和本地路径，不支持网络 URL。仅全屏容器有效，流程结束前禁用重复调用。每用户每工具每天最多拉起 10 次。

指定图片只用于站内私信；站外使用当前页面截图生成的 H5 海报。成功仅说明触发了分享流程，用户取消也不能据此判消息送达。错误 `10001` 是参数，`15501` 是图片来源、格式、权限、大小等校验，`15502` 是面板或分发、模拟器、非全屏、重复调用，`15503` 是频控或频控记录校验。

### 赞赏与关闭挽留

两者均为内测，先开通赞赏能力。展示自定义入口前按发布配置核对赞赏开关，再检查 9533 门槛与方法。官方本章未公开配置查询 API，不凭空新增调用。低版本隐藏入口并跳过设置，旧客户端可能静默忽略未知事件造成 Promise 一直等待。

用户点击调用 `rewardAuthor()`，无业务参数。成功仅有通用 errMsg，无金额、支付成功字段，不据此判断到账。赞赏对象、面板、协议、支付、频控由客户端处理。

`setCloseRetentionEnabled({ enabled: true })` 或 `setCloseRetentionEnabled({ enabled: false })` 必须显式布尔值，默认 false。重复设置取最后一次，只属于当前容器，再次打开恢复默认；必须配合赞赏，不能单独开通能力。成功仅表示开关更新，true 不立即展示挽留，关闭时是否展示由客户端决定。`10001` 是参数类型，`10002` 是无可用容器。Android、iOS 均需验证支持和不支持场景。

## 跨设备保存个人数据与展示排行榜

官方：[云存储](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-16)、[排行榜及错误码](https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s3-17)。

两者均为 9.51+ 内测能力，不能成为核心功能唯一依赖。云存储按用户和工具隔离，同账号可跨设备恢复，创作者看不到用户内容。云存储未授权 `1006`、排行榜未授权 `1005` 时隐藏相应入口并降级。

### 云存储写入与对账

`collection` 是分类字符串，`content` 是完整 JSON 对象，不是 JSON 字符串。

- `addCloudStorage({ collection, items: [{ content }] })` 的 items 非空。结果 `data` 含逐项 `{ id, status }`，按输入位置匹配。id 为服务端 24 位十六进制，UNKNOWN 且没有返回 id 时为空串，不能用新 id 反查输入位置。
- `updateCloudStorage({ collection, items: [{ id, content }] })` 非空、同批 id 不重复。整行覆盖，保留字段须一并提交，无版本校验，并发以后生效的写入为准；后端未回 id 时结果回退输入 id。
- `removeCloudStorage({ collection, ids })` 的 ids 非空且不重复。硬删不可恢复，目标不存在仍成功；延迟在途写可能重建同 id 数据。
- 写入不是事务。逐项 `SUCCESS` 才已完成，`FAILED` 可重放，`UNKNOWN` 必须通过 query 对账，禁止盲目重发。

`queryCloudStorage({ collection?, ids?, limit?, cursor? })` 返回 `{ items: [{ id, collection, content }], nextCursor?, hasMore? }`。传 ids 时必须同时传 collection，ids 非空且不重复，只返回命中项且没有分页字段。只传 collection 按分类分页，都不传则跨分类分页。limit 为正整数，默认 20；下一页保持查询参数并传 nextCursor，末页不再返回游标。跨页不是一致快照，新增删除可能改变后续页；游标版本变化失效后从首页重查。读取 reject 是失败，只有 `items: []` 才是空数据。

每批最多 100 条，content 经 JSON 序列化后的 UTF-8 字节数最多 65536。不要用 JavaScript 字符串长度当字节数。大存档拆成主记录和分段，但拆分不使批次变成事务。

### 榜单与本人状态

使用 `submitScore` 的前提是小工具已配置“用户头像昵称授权”。昵称由平台填充，仅消费返回字段，不自行采集或保存用户小红书资料。

`board` 是 1–5 的整数，默认 1。`period` 为 `all`、`month`、`week`、`day`，默认 all。

- `submitScore({ board?, score })` 提交绝对分数。score 为有限数，范围 -1000000 至 1000000，平台不缩放、不取整。数值过大时统一换算单位。结果 `{ score }` 是合并本次后的总榜历史最高分，低分提交也成功。
- `getRankList({ board?, period? })` 返回 `data: [{ rank, score, nickname }]`，最多前 100 名，降序，无 limit 参数。昵称可能 null，需兜底。
- `getMyRank({ board?, period? })` 先看 status。`EXACT` 才读取 1–500 的 rank 和本人最好 score；`OVER_LIMIT` 展示 500+；`NO_SCORE` 表示参与但本期无成绩；`NOT_PARTICIPATING` 表示未参与。后三种 rank、score 均为 null，都是成功业务状态。

每周期只保留最好成绩，同分先写入者在前，不并列。一次提交在服务端事务内处理总、月、周、日榜；按北京时间零点重置，周一换周、每月 1 日换月。新周期不继承旧分，不提供历史榜查询。

### 限频与错误分支

云存储和榜单均按“小工具 × 接口”默认 150 QPS 限频，一次批量调用消耗一次额度，频控在鉴权前。写入先本地合并节流，榜单建议缓存 30–60 秒，不在游戏循环或高频计时器直接调用。

| errCode | 实现分支 |
| --- | --- |
| 1001、10001 | 后端或本地参数错，修参数，不直接重试 |
| 1002 | 批量过多，拆批 |
| 1003 | content 超 64KB，精简或分段 |
| 1004 | 分数不合法，修计分或统一换单位 |
| 1005、1006 | 榜单、云存储未授权，隐藏入口并降级 |
| 2001 | 存储失败，展示错误，不能当空数据 |
| 2002 | 榜单未就绪，保留加载态，有限退避如 500ms、1s、2s、4s；不当空榜 |
| 2003 | 部分成功走成功路径，逐项判 status |
| 2004 | 写入未知，标待确认并 query 对账，禁止重发 |
| 2005 | 唯一键冲突，先查冲突来源再决定是否重试 |
| 2008 | 授权服务不可用，稍后重试一次，仍失败降级 |
| 2009 | 降频，不密集轮询 |
| 2999 | 控频后可重试一次 |
| 10003 | 容器白名单拒绝，反馈平台开通 |

判码使用整数 `errCode`。后端业务码原值透传，网关失败可能不带 errCode，应保留通用失败分支。榜单只有成功返回 `data: []` 才是真空榜。
