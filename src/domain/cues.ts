/** 富文本片段：t = 正文；rt 存在时表示 t 头顶的注音（假名/拼音）。 */
export interface RubySeg {
    t: string;
    rt?: string;
}

/** 一条字幕：时间窗（毫秒）+ 文本（可多行）。 */
export interface Cue {
    /** 开始时间（ms） */
    start: number;
    /** 结束时间（ms） */
    end: number;
    /** 纯文本（注音不混入正文——供检索/降级显示） */
    text: string;
    /** 顶部字幕（{\an7/8/9} 等）：渲染为主字幕上方的小字注释 */
    top?: boolean;
    /** 含注音时的结构化内容；无注音的字幕不携带此字段 */
    rich?: RubySeg[];
}

/** 按开始时间排序（解析器的输出都应经过这一步）。 */
export function sortCues(cues: Cue[]): Cue[] {
    return [...cues].sort((a, b) => a.start - b.start || a.end - b.end);
}

/**
 * 返回时刻 t 应显示的字幕文本（可能多条重叠，按开始时间拼接）。
 * cues 必须已按 start 排序。二分定位后向前回扫少量条目以覆盖重叠场景。
 */
export function activeText(cues: Cue[], t: number): string {
    return activeCues(cues, t).map((c) => c.text).join('\n');
}

/**
 * 返回时刻 t 命中的全部字幕（按开始时间排序）。
 * 播放器用它拿到 top/rich 结构；activeText 仍返回拼接纯文本。
 */
export function activeCues(cues: Cue[], t: number): Cue[] {
    if (cues.length === 0) return [];
    let lo = 0, hi = cues.length - 1, idx = -1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (cues[mid].start <= t) { idx = mid; lo = mid + 1; }
        else hi = mid - 1;
    }
    if (idx === -1) return [];
    const hits: Cue[] = [];
    for (let i = Math.max(0, idx - 8); i <= idx; i++) {
        const c = cues[i];
        if (c.start <= t && t < c.end) hits.push(c);
    }
    return hits;
}

/** 字幕总时长（最后一条的结束时间，ms）。 */
export function totalDuration(cues: Cue[]): number {
    let max = 0;
    for (const c of cues) if (c.end > max) max = c.end;
    return max;
}

/** ms → "HH:MM:SS" */
export function formatTime(ms: number): string {
    const neg = ms < 0;
    const s = Math.floor(Math.abs(ms) / 1000);
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${neg ? '-' : ''}${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}

/** "HH:MM:SS" / "MM:SS" / "SS" → ms；非法输入返回 null。 */
export function parseTimeInput(input: string): number | null {
    const m = input.trim().match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{1,2})$|^(\d+)$/);
    if (!m) return null;
    if (m[4] !== undefined) return parseInt(m[4], 10) * 1000;
    const h = m[1] ? parseInt(m[1], 10) : 0;
    const min = parseInt(m[2], 10);
    const sec = parseInt(m[3], 10);
    if (min > 59 || sec > 59) return null;
    return ((h * 60 + min) * 60 + sec) * 1000;
}
