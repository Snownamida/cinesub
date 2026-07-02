import { Lang, MESSAGES, SUPPORTED } from './messages';

export { SUPPORTED };
export type { Lang };

const STORAGE_KEY = 'cinesub-lang';
/** html lang 属性用的 BCP-47 标签（影响字体渲染、Ko-fi 面板语言、无障碍）。 */
const HTML_LANG: Record<Lang, string> = {
    zh: 'zh-CN', en: 'en', ja: 'ja', fr: 'fr', es: 'es', ko: 'ko',
};

function isLang(x: string): x is Lang {
    return SUPPORTED.some((l) => l.code === x);
}

/** 首选语言：localStorage > 浏览器语言列表 > 英文回退。 */
function detect(): Lang {
    try {
        if (typeof localStorage !== 'undefined') {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved && isLang(saved)) return saved;
        }
    } catch { /* 隐私模式等 */ }
    if (typeof navigator !== 'undefined') {
        const prefs = navigator.languages?.length ? navigator.languages : [navigator.language];
        for (const raw of prefs) {
            const code = (raw || '').slice(0, 2).toLowerCase();
            if (isLang(code)) return code;
        }
    }
    return 'en';
}

let current: Lang = detect();
const listeners = new Set<() => void>();

export function getLang(): Lang {
    return current;
}

export function setLang(lang: Lang): void {
    if (lang === current) return;
    current = lang;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, lang); } catch { /* 忽略 */ }
    if (typeof document !== 'undefined') document.documentElement.lang = HTML_LANG[lang];
    listeners.forEach((cb) => cb());
}

/** 订阅语言变化，返回取消订阅函数。 */
export function onLangChange(cb: () => void): () => void {
    listeners.add(cb);
    return () => listeners.delete(cb);
}

/** 翻译：查当前语言，缺失回退英文，再缺回退 key 本身；支持 {name} 插值。 */
export function t(key: string, params?: Record<string, string | number>): string {
    let s = MESSAGES[current][key] ?? MESSAGES.en[key] ?? key;
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            s = s.split(`{${k}}`).join(String(v));
        }
    }
    return s;
}

/** 应用启动时把 <html lang> 同步为检测到的语言。 */
export function initHtmlLang(): void {
    if (typeof document !== 'undefined') document.documentElement.lang = HTML_LANG[current];
}
