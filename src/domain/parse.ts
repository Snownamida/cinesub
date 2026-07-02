import { Cue } from './cues';
import { parseAss } from './parseAss';
import { parseSrt } from './parseSrt';
import { parseVtt } from './parseVtt';

/**
 * 字节 → 文本：UTF-8（严格）→ GB18030 → Windows-1252 逐级回退。
 * 中文老字幕大量是 GBK 编码，直接按 UTF-8 读会成乱码。
 */
export function decodeSubtitleBytes(buf: ArrayBuffer): string {
    try {
        return new TextDecoder('utf-8', { fatal: true }).decode(buf);
    } catch {
        /* pas de l'UTF-8 valide */
    }
    try {
        return new TextDecoder('gb18030', { fatal: true }).decode(buf);
    } catch {
        /* pas du GB18030 valide non plus */
    }
    return new TextDecoder('windows-1252').decode(buf);
}

/** 依据文件名与内容自动选择解析器。 */
export function parseSubtitle(fileName: string, content: string): Cue[] {
    const ext = fileName.toLowerCase().split('.').pop() ?? '';
    if (ext === 'vtt' || content.trimStart().startsWith('WEBVTT')) return parseVtt(content);
    if (ext === 'ass' || ext === 'ssa' || /^\[script info\]/im.test(content)) return parseAss(content);
    if (ext === 'srt') return parseSrt(content);
    // 未知扩展名：内容里有 "-->" 就按 SRT 试
    if (content.includes('-->')) return parseSrt(content);
    return [];
}
