import { Cue } from '../domain/cues';

/** 显示设置（持久化）。 */
export interface Settings {
    /** 字号（vw 单位的倍数，1-10） */
    fontScale: number;
    /** 文字颜色 */
    color: string;
    /** 额外压暗（0 = 不压，0.8 = 很暗） */
    dim: number;
}

export const COLORS: { id: string; label: string; value: string }[] = [
    { id: 'white', label: '白', value: '#e8e8e8' },
    { id: 'gray', label: '灰', value: '#9a9a9a' },
    { id: 'amber', label: '琥珀', value: '#c8963c' },
    { id: 'red', label: '红', value: '#b03030' },
];

const SETTINGS_KEY = 'cinesub-settings';
const SESSION_KEY = 'cinesub-session';

export function loadSettings(): Settings {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (raw) return { fontScale: 5, color: '#e8e8e8', dim: 0, ...JSON.parse(raw) };
    } catch { /* stockage indisponible */ }
    return { fontScale: 5, color: '#e8e8e8', dim: 0 };
}

export function saveSettings(s: Settings): void {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* plein/privé */ }
}

/** 会话：已加载的字幕 + 播放位置（崩溃/误刷新后恢复）。 */
export interface Session {
    fileName: string;
    cues: Cue[];
    positionMs: number;
    savedAt: number;
}

export function saveSession(s: Session): void {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch { /* fichier trop gros : tant pis */ }
}

export function loadSession(): Session | null {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const s = JSON.parse(raw) as Session;
        if (!Array.isArray(s.cues) || s.cues.length === 0) return null;
        return s;
    } catch {
        return null;
    }
}

export function clearSession(): void {
    try { localStorage.removeItem(SESSION_KEY); } catch { /* rien */ }
}
