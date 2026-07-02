import { Cue, RubySeg, sortCues } from './cues';

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

/** 去掉 <v>/<c>/<i> 等行内标签（ruby 已在此之前单独提取）。 */
function stripTags(s: string): string {
    return s.replace(/<[^>\n]{1,64}>/g, '');
}

/**
 * 把一段 VTT cue 文本解析为富文本片段：
 * <ruby>漢字<rt>かんじ</rt></ruby> → { t:'漢字', rt:'かんじ' }
 * （一个 <ruby> 内可交错多组 base/rt，如 <ruby>漢<rt>かん</rt>字<rt>じ</rt></ruby>）
 * 返回 [片段列表, 纯文本]；纯文本不包含注音。
 */
export function parseRichVtt(raw: string): [RubySeg[], string] {
    const segs: RubySeg[] = [];
    const rubyRe = /<ruby>([\s\S]*?)<\/ruby>/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = rubyRe.exec(raw)) !== null) {
        const before = stripTags(raw.slice(last, m.index));
        if (before) segs.push({ t: before });
        const inner = m[1];
        const pairRe = /([^<]+)<rt>([^<]*)<\/rt>/g;
        let innerLast = 0;
        let p: RegExpExecArray | null;
        while ((p = pairRe.exec(inner)) !== null) {
            const base = stripTags(p[1]).trim();
            const rt = stripTags(p[2]).trim();
            if (base) segs.push(rt ? { t: base, rt } : { t: base });
            innerLast = pairRe.lastIndex;
        }
        const tail = stripTags(inner.slice(innerLast)).trim();
        if (tail) segs.push({ t: tail });
        last = rubyRe.lastIndex;
    }
    const rest = stripTags(raw.slice(last));
    if (rest) segs.push({ t: rest });
    const plain = segs.map((s) => s.t).join('');
    return [segs, plain];
}

/** 解析 WebVTT (.vtt)。支持 <ruby> 注音；line:≤20% 的 cue 标记为顶部。 */
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
        const restTokens = rawRest.trim().split(/\s+/);
        const end = vttTime(restTokens[0]);
        if (start === null || end === null || end <= start) continue;

        // cue 设置里 line 很小 → 顶部字幕
        const settings = restTokens.slice(1).join(' ');
        const lineMatch = settings.match(/line:(\d{1,3})%/);
        const top = lineMatch ? parseInt(lineMatch[1], 10) <= 20 : undefined;

        const rawText = lines.slice(tIdx + 1).join('\n').trim();
        const [segs, plain] = parseRichVtt(rawText);
        if (!plain.trim()) continue;
        const hasRuby = segs.some((s) => s.rt);
        cues.push({
            start,
            end,
            text: plain.trim(),
            ...(top ? { top } : {}),
            ...(hasRuby ? { rich: segs } : {}),
        });
    }
    return sortCues(cues);
}
