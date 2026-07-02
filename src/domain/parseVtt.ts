import { Cue, sortCues } from './cues';

/** "01:23:45.678" 或 "23:45.678" → ms（VTT 用点号，小时可省略）。 */
function vttTime(t: string): number | null {
    const m = t.trim().match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{1,2})\.(\d{1,3})$/);
    if (!m) return null;
    const h = m[1] ? parseInt(m[1], 10) : 0;
    return (
        h * 3600000 +
        parseInt(m[2], 10) * 60000 +
        parseInt(m[3], 10) * 1000 +
        parseInt(m[4].padEnd(3, '0'), 10)
    );
}

function cleanText(s: string): string {
    return s
        .replace(/<[^>\n]{1,64}>/g, '') // <v Speaker> <c.class> <i> 等
        .trim();
}

/** 解析 WebVTT (.vtt)。忽略 NOTE/STYLE/REGION 块与 cue 设置（position: 等）。 */
export function parseVtt(content: string): Cue[] {
    const cues: Cue[] = [];
    const body = content.replace(/\r\n?/g, '\n').replace(/^﻿/, '');
    const blocks = body.split(/\n{2,}/);
    for (const block of blocks) {
        const lines = block.split('\n').filter((l) => l.trim() !== '');
        if (lines.length === 0) continue;
        const first = lines[0].trim();
        if (first === 'WEBVTT' || first.startsWith('WEBVTT ')) continue;
        if (/^(NOTE|STYLE|REGION)\b/.test(first)) continue;
        const tIdx = lines.findIndex((l) => l.includes('-->'));
        if (tIdx === -1) continue;
        const [rawStart, rawRest] = lines[tIdx].split('-->');
        if (rawRest === undefined) continue;
        const start = vttTime(rawStart);
        // "-->" 之后是结束时间 + 可选布局设置
        const endToken = rawRest.trim().split(/\s+/)[0];
        const end = vttTime(endToken);
        if (start === null || end === null || end <= start) continue;
        const text = cleanText(lines.slice(tIdx + 1).join('\n'));
        if (text) cues.push({ start, end, text });
    }
    return sortCues(cues);
}
