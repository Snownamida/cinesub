import { Cue, sortCues } from './cues';

/** "1:23:45.67" → ms（ASS 用厘秒）。 */
function assTime(t: string): number | null {
    const m = t.trim().match(/^(\d+):(\d{1,2}):(\d{1,2})\.(\d{1,2})$/);
    if (!m) return null;
    return (
        parseInt(m[1], 10) * 3600000 +
        parseInt(m[2], 10) * 60000 +
        parseInt(m[3], 10) * 1000 +
        parseInt(m[4].padEnd(2, '0'), 10) * 10
    );
}

/** 去掉 {\...} 特效标签，\N/\n → 换行，\h → 空格。 */
function cleanText(s: string): string {
    return s
        .replace(/\{[^}]*\}/g, '')
        .replace(/\\N/g, '\n')
        .replace(/\\n/g, '\n')
        .replace(/\\h/g, ' ')
        .trim();
}

/**
 * 解析 ASS/SSA 的 [Events] 段。按 Format 行确定字段顺序；
 * 无 Format 行时按 ASS 默认（Text 在第 10 个字段起）。
 */
export function parseAss(content: string): Cue[] {
    const cues: Cue[] = [];
    const lines = content.replace(/\r\n?/g, '\n').split('\n');
    let inEvents = false;
    let startIdx = 1, endIdx = 2, nFields = 10;

    for (const raw of lines) {
        const line = raw.trim();
        if (line.startsWith('[')) {
            inEvents = /^\[events\]$/i.test(line);
            continue;
        }
        if (!inEvents || line === '') continue;

        if (/^format\s*:/i.test(line)) {
            const fields = line.slice(line.indexOf(':') + 1).split(',').map((f) => f.trim().toLowerCase());
            startIdx = fields.indexOf('start');
            endIdx = fields.indexOf('end');
            nFields = fields.length; // Text 恒为最后一个字段（可含逗号）
            continue;
        }
        if (!/^dialogue\s*:/i.test(line)) continue;

        // Text 是最后一个字段，可能包含逗号 → 只 split 前 n-1 个
        const body = line.slice(line.indexOf(':') + 1);
        const parts = body.split(',');
        if (parts.length < nFields) continue;
        const head = parts.slice(0, nFields - 1);
        const text = cleanText(parts.slice(nFields - 1).join(','));
        const start = assTime(head[startIdx]);
        const end = assTime(head[endIdx]);
        if (start === null || end === null || end <= start || !text) continue;
        cues.push({ start, end, text });
    }
    return sortCues(cues);
}
