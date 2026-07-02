import { describe, expect, it } from 'vitest';
import { parseSrt } from '../src/domain/parseSrt';
import { parseVtt } from '../src/domain/parseVtt';
import { parseAss } from '../src/domain/parseAss';
import { parseSubtitle, decodeSubtitleBytes } from '../src/domain/parse';

describe('parseSrt', () => {
    it('解析标准块并清理 HTML 标签', () => {
        const srt = `1
00:00:01,000 --> 00:00:03,500
<i>你好</i>，世界

2
00:00:04,000 --> 00:00:06,000
第二句
跨两行`;
        const cues = parseSrt(srt);
        expect(cues).toHaveLength(2);
        expect(cues[0]).toEqual({ start: 1000, end: 3500, text: '你好，世界' });
        expect(cues[1].text).toBe('第二句\n跨两行');
    });

    it('容忍缺序号、\\r\\n、点号毫秒与 {\\an8} 定位码', () => {
        const srt = '00:00:01.000 --> 00:00:02.000\r\n{\\an8}顶部字幕\r\n';
        const cues = parseSrt(srt);
        expect(cues).toHaveLength(1);
        expect(cues[0].text).toBe('顶部字幕');
    });

    it('丢弃结束时间早于开始时间的块', () => {
        expect(parseSrt('1\n00:00:05,000 --> 00:00:04,000\n倒流')).toHaveLength(0);
    });

    it('输出按开始时间排序', () => {
        const srt = `1
00:00:10,000 --> 00:00:11,000
后

2
00:00:01,000 --> 00:00:02,000
前`;
        const cues = parseSrt(srt);
        expect(cues[0].text).toBe('前');
    });
});

describe('parseVtt', () => {
    it('解析 WEBVTT，忽略 NOTE 与 cue 设置', () => {
        const vtt = `WEBVTT

NOTE 这是注释

00:01.000 --> 00:03.000 position:50% line:90%
<v 旁白>短时间戳（无小时）

00:00:04.000 --> 00:00:05.000
完整时间戳`;
        const cues = parseVtt(vtt);
        expect(cues).toHaveLength(2);
        expect(cues[0]).toEqual({ start: 1000, end: 3000, text: '短时间戳（无小时）' });
        expect(cues[1].start).toBe(4000);
    });
});

describe('parseAss', () => {
    it('按 Format 行解析 Dialogue，处理 \\N 与特效标签', () => {
        const ass = `[Script Info]
Title: test

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:03.00,Default,,0,0,0,,{\\fad(200,200)}第一行\\N第二行
Dialogue: 0,0:00:04.50,0:00:06.00,Default,,0,0,0,,含逗号,的文本`;
        const cues = parseAss(ass);
        expect(cues).toHaveLength(2);
        expect(cues[0]).toEqual({ start: 1000, end: 3000, text: '第一行\n第二行' });
        expect(cues[1].text).toBe('含逗号,的文本');
        expect(cues[1].start).toBe(4500);
    });
});

describe('parseSubtitle 调度', () => {
    it('按扩展名/内容选择解析器', () => {
        expect(parseSubtitle('a.srt', '1\n00:00:01,000 --> 00:00:02,000\nx')).toHaveLength(1);
        expect(parseSubtitle('b.vtt', 'WEBVTT\n\n00:01.000 --> 00:02.000\nx')).toHaveLength(1);
        expect(parseSubtitle('c.txt', '00:00:01,000 --> 00:00:02,000\nx')).toHaveLength(1); // 未知扩展名回退 SRT
    });
});

describe('decodeSubtitleBytes', () => {
    it('UTF-8 正常解码', () => {
        const bytes = new TextEncoder().encode('中文字幕').buffer;
        expect(decodeSubtitleBytes(bytes)).toBe('中文字幕');
    });

    it('GBK 字节回退到 GB18030 解码', () => {
        // "中文" 的 GBK 编码：D6 D0 CE C4（不是合法 UTF-8）
        const gbk = new Uint8Array([0xd6, 0xd0, 0xce, 0xc4]).buffer;
        expect(decodeSubtitleBytes(gbk)).toBe('中文');
    });
});
