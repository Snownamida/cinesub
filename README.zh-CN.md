[English](README.md) | **中文**

# 🎬 CineSub — 影院字幕伴侣

在国外看电影，影院常常没有你语言的字幕。**CineSub 让你把字幕带进影院**：
提前下载电影的字幕文件，开场时在手机上同步播放——纯黑背景、可再压暗，
拿在手里看字幕，不打扰任何人。

**线上地址**：https://cinesub.snownamida.top/

## 功能

- 📄 支持 **.srt / .vtt / .ass(.ssa)**，自动识别编码（UTF-8 → GB18030 → Windows-1252，中文老字幕不乱码）
- 🈁 **假名/拼音注音**：VTT 里的 `<ruby>漢字<rt>かんじ</rt></ruby>` 用浏览器原生 ruby 渲染，注音正确浮在汉字上方，不串进正文
- 🔝 **上下同屏**：识别顶部定位（VTT `line:≤20%`、SRT/ASS `{\an7/8/9}`），招牌/旁白注释以小一号显示在主字幕上方
- ⏱ **同步微调**：±0.5s / ±5s 一键对时；**拖动进度条**或输入时间码（`1:23:45`）跳转
- 🎯 **漂移校正**：标记前后两个同步点，一次拉正「开头对上、越走越偏」（帧率/版本不同导致的渐进漂移）——手动同步类工具里少见
- 👥 **双语同屏**：再加载一个字幕文件，母语 + 原文上下同时显示（语言学习者友好）
- ⏸ 暂停/继续（中场休息友好）
- 🌑 纯黑背景（OLED 熄灭像素）+ 应用内**二次压暗**滑杆
- 🎨 文字颜色：白/灰/**琥珀/红**（暗场里红光最不刺眼）；字号滑杆
- 🔆 **Wake Lock 屏幕常亮**——两小时电影不锁屏
- 💾 **断点恢复**：每 5 秒存档，误刷新/误退出一键续播
- 📴 **PWA 离线可用**：在家打开过一次，影厅没网也能用
- 🔒 隐私：文件只在本机解析，**零上传、零后端**
- 🌍 **多语言界面**：中 / English / 日本語 / Français / Español / 한국어，自动跟随浏览器语言，可手动切换并记住
- 🍿 内置演示字幕，在家先把流程走一遍（演示文案随界面语言）

## 技术

Vite + TypeScript(strict) + Vitest，零框架零运行时依赖（全部 devDependencies），
构建产物约 49 KB（含 6 语文案）。领域层（解析器/时钟/命中查询/漂移校准）为纯函数，33 个单元测试覆盖。

```
src/
  domain/   纯逻辑：parseSrt / parseVtt / parseAss / parse(编码探测+调度)
            cues(二分命中/时间格式) / clock(播放时钟)
  app/      store（设置 + 会话持久化）
  i18n/     messages(6 语文案) / index(检测·切换·t() 插值+回退)
  ui/       SetupView（选文件/拖拽/续播/演示/语言切换）
            PlayerView（播放+控制层）/ wakeLock / dom
tests/      Vitest 单元测试
```

## 开发

```bash
npm install
npm run dev      # 开发服务器
npm run check    # tsc + vitest
npm run build    # 生产构建 -> dist/
```

## 部署

Cloudflare Pages：Build command `npm run build`，输出目录 `dist`。

## 许可

MIT © Snownamida
