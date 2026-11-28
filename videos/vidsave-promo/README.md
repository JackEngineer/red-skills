# VidSave 宣传片

31 秒竖屏合成，1080 × 1920，30 fps。主合成为 `VidSavePromo`，五个镜头也可在 Studio 中分别预览。

```sh
npm ci
npm run studio
npm run render
```

主时间线和字幕在 `src/index.jsx`。镜头组件位于 `src/`，图片和旁白混音位于 `public/`。如需修改旁白，替换 `public/audio/vidsave-mix.m4a`，并按新音轨调整字幕时间。

## 素材

- 动画界面是用法示意。里面的「日落骑行」和「雨夜电车」属于虚构示例。
- 两张缩略图由 Codex 内置 ImageGen 生成，等比缩放至 1200 × 800，并转为不透明 JPEG。生成工具未提供具体模型版本。
- 中文旁白由火山方舟 Ark CLI 调用豆包语音合成 2.0 生成，音色为 Vivi 2.0。配乐和操作音效使用本地原创合成音。

### 缩略图提示词

- `public/stills/ridge.jpg` — Create a single landscape cinematic outdoor sports editorial photograph, approximately 3:2, without text, logo, watermarks, prominent brands, UI, borders, grid or split panels. It will be a fictional video thumbnail inside an original motion-graphics advertisement about saving video clips, so clear silhouette at small size. Wild golden hour in the southern European highlands. A tiny mountain cyclist wearing a muted orange jacket, moving across a sweeping winding rocky ridgeline, seen from behind slightly to the right of center with distant layered olive charcoal mountains. A hazy apricot sun and soft saturated orange sky. Shot on warm fine-grain 35mm film, low sun, organic texture, deep shaded foreground, large scale, understated indie documentary art direction, realistic, tasteful, immediately readable. Keep the cyclist and ridgeline in the central 60% for cropping.
- `public/stills/rain-city.jpg` — 横构图 3:2，写实 35mm 电影感的蓝绿色雨夜高架电车和街区，湿地反光与少量暖琥珀窗光，无可读文字、外部品牌及界面。
