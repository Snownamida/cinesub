import { Cue, sortCues } from './cues';

/** "01:23:45,678" → ms（SRT 用逗号，也容忍点号）。 */
function srtTime(t: string): number | null {
    const m = t.trim().match(/^(\d{1,2}):(\d{1,2}):(\d{1,2})[,.](\d{1,3})$/);
    if (!m) return null;
    return (
        parseInt(m[1], 10) * 3600000 +
        parseInt(m[2], 10) * 60000 +
        parseInt(m[3], 10) * 1000 +
        parseInt(m[4].padEnd(3, '0'), 10)
    );
}

/** 是否含顶部定位码：{\an7|8|9}（新）或 {\a5|6|7}（旧 SSA 习惯）。 */
function isTop(s: string): boolean {
    return /\{\\an[789]\}/.test(s) || /\{\\a[567]\}/.test(s);
}

/** 去掉 SRT 里常见的 HTML 标签（<i> <b> <font …>）与 {\an8} 定位码。 */
function cleanText(s: string): string {
    return s
        .replace(/<[^>\n]{1,32}>/g, '')
        .replace(/\{\\[^}]{1,32}\}/g, '')
        .trim();
}

/**
 * 解析 SubRip (.srt)。对常见的“不规范”很宽容：
 * 序号缺失、多余空行、\r\n、时间用点号、文本含 HTML 标签。
 */
export function parseSrt(content: string): Cue[] {
    const cues: Cue[] = [];
    // 统一换行，按空行分块
    const blocks = content.replace(/\r\n?/g, '\n').split(/\n{2,}/);
    for (const block of blocks) {
        const lines = block.split('\n').filter((l) => l.trim() !== '');
        if (lines.length === 0) continue;
        // 找到含 "-->" 的行（序号行可有可无）
        const tIdx = lines.findIndex((l) => l.includes('-->'));
        if (tIdx === -1) continue;
        const [rawStart, rawEnd] = lines[tIdx].split('-->');
        if (rawEnd === undefined) continue;
        const start = srtTime(rawStart);
        // 结束时间后可能跟坐标（X1:… 老格式），先取第一个时间样式片段
        const endMatch = rawEnd.trim().match(/^(\d{1,2}:\d{1,2}:\d{1,2}[,.]\d{1,3})/);
        const end = endMatch ? srtTime(endMatch[1]) : null;
        if (start === null || end === null || end <= start) continue;
        const rawText = lines.slice(tIdx + 1).join('\n');
        const text = cleanText(rawText);
        if (text) cues.push({ start, end, text, ...(isTop(rawText) ? { top: true } : {}) });
    }
    return sortCues(cues);
}
