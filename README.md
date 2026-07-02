**English** | [中文](README.zh-CN.md)

# 🎬 CineSub — Your Subtitle Companion for the Cinema

Watching a film abroad, the theatre often has no subtitles in your language. **CineSub lets you bring your own subtitles into the cinema:** download the film's subtitle file ahead of time, then play it in sync on your phone as the movie starts — on a pure-black screen you can dim even further, held in your hand, without disturbing anyone around you.

**Live site:** https://cinesub.snownamida.top/

## Features

- 📄 Supports **.srt / .vtt / .ass (.ssa)** with automatic encoding detection (UTF-8 → GB18030 → Windows-1252, so old Chinese subtitles never turn to mojibake)
- 🈁 **Furigana / pinyin ruby**: `<ruby>漢字<rt>かんじ</rt></ruby>` in VTT is rendered with the browser's native ruby support, so the reading floats correctly above the characters instead of leaking into the line
- 🔝 **Top & bottom on screen at once**: detects top positioning (VTT `line:≤20%`, SRT/ASS `{\an7/8/9}`) and shows signs / narration notes one size smaller above the main subtitle
- ⏱ **Sync nudging**: one-tap ±0.5s / ±5s offset; **drag the progress bar** or type a timecode (`1:23:45`) to jump
- 🎯 **Drift correction**: mark two sync points and straighten out a track that "starts on time but drifts further off as it goes" (progressive drift from differing frame rates / versions) — rarely found in manual-sync tools
- 👥 **Dual subtitles**: load a second file and show your native language + the original stacked together (great for language learners)
- ⏸ Pause / resume (handy for intermissions)
- 🌑 Pure-black background (OLED pixels off) + an in-app **extra-dim** slider
- 🎨 Text color: white / gray / **amber / red** (red is easiest on the eyes in a dark room); font-size slider
- 🔆 **Wake Lock keeps the screen on** — no locking during a two-hour movie
- 💾 **Resume where you left off**: autosaves every 5 seconds, so an accidental refresh or exit is one tap from continuing
- 📴 **Works offline as a PWA**: open it once at home and it runs even without signal in the theatre
- 🔒 Privacy: files are parsed only on your device — **zero upload, zero backend**
- 🌍 **Multilingual UI**: 中文 / English / 日本語 / Français / Español / 한국어, auto-following your browser language, switchable and remembered
- 🍿 Built-in demo subtitle so you can rehearse the whole flow at home (demo text follows the UI language)

## Tech

Vite + TypeScript (strict) + Vitest, zero frameworks and zero runtime dependencies (everything is a devDependency); the build is about 49 KB (including all 6 languages). The domain layer (parsers / clock / cue lookup / drift calibration) is written as pure functions, covered by 33 unit tests.

```
src/
  domain/   Pure logic: parseSrt / parseVtt / parseAss / parse (encoding sniff + dispatch)
            cues (binary-search lookup / time formatting) / clock (playback clock)
  app/      store (settings + session persistence)
  i18n/     messages (6-language strings) / index (detect · switch · t() interpolation + fallback)
  ui/       SetupView (file pick / drag-drop / resume / demo / language switch)
            PlayerView (playback + control layer) / wakeLock / dom
tests/      Vitest unit tests
```

## Development

```bash
npm install
npm run dev      # dev server
npm run check    # tsc + vitest
npm run build    # production build -> dist/
```

## Deployment

Cloudflare Pages: build command `npm run build`, output directory `dist`.

## License

MIT © Snownamida
