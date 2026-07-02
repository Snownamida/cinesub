import { decodeSubtitleBytes, parseSubtitle } from '../domain/parse';
import { Cue, formatTime, totalDuration } from '../domain/cues';
import { DEMO_ID, Session, clearSession, loadSession } from '../app/store';
import { SUPPORTED, getLang, setLang, t } from '../i18n';
import { el } from './dom';

/** 内置演示字幕（随界面语言生成）：在家先体验一遍流程，并展示注音/顶部字幕。 */
function buildDemoVtt(): string {
    return `WEBVTT

00:00:01.000 --> 00:00:04.000
${t('demo.welcome')}

00:00:05.000 --> 00:00:09.000
${t('demo.start')}

00:00:10.000 --> 00:00:15.000
${t('demo.sync')}

00:00:16.000 --> 00:00:19.000 line:8%
${t('demo.top_note')}

00:00:16.000 --> 00:00:20.000
${t('demo.tap')}

00:00:21.000 --> 00:00:25.000
${t('demo.enjoy_prefix')}<ruby>映画<rt>えいが</rt></ruby>を<ruby>楽<rt>たの</rt></ruby>しんで 🍿`;
}

/**
 * 起始界面：选择/拖入字幕文件 → 解析 → 「开始播放」。
 * 若上次会话存在（2 小时内），提供一键续播。
 * 顶部可切换界面语言，切换后就地重建（保留已加载的文件）。
 */
export class SetupView {
    private readonly container: HTMLElement;
    private readonly onStart: (cues: Cue[], fileName: string, startAt: number, secondaryCues?: Cue[] | null, secondaryName?: string | null) => void;
    private root!: HTMLElement;
    private statusEl!: HTMLElement;
    private startBtn!: HTMLButtonElement;
    private loaded: { cues: Cue[]; fileName: string; secondaryCues?: Cue[]; secondaryName?: string } | null = null;

    constructor(container: HTMLElement, onStart: (cues: Cue[], fileName: string, startAt: number, secondaryCues?: Cue[] | null, secondaryName?: string | null) => void) {
        this.container = container;
        this.onStart = onStart;
        this.render();
    }

    /** 构建并挂载视图；语言切换后重新调用即可。 */
    private render(): void {
        this.root = this.build();
        this.container.replaceChildren(this.root);
        // 语言切换重建后，恢复「已加载文件」的状态提示
        if (this.loaded) {
            this.startBtn.disabled = false;
            this.setStatus(t('setup.status_ok', {
                name: this.loaded.fileName,
                n: this.loaded.cues.length,
                dur: formatTime(totalDuration(this.loaded.cues)),
            }), false);
        }
    }

    private build(): HTMLElement {
        const fileInput = el('input', { type: 'file', accept: '.srt,.vtt,.ass,.ssa,.txt', id: 'file-input', class: 'visually-hidden' });
        fileInput.addEventListener('change', () => {
            const f = (fileInput as HTMLInputElement).files?.[0];
            if (f) void this.loadFile(f);
        });

        this.statusEl = el('div', { class: 'setup-status' });
        this.startBtn = el('button', { class: 'btn-start', text: t('setup.start'), disabled: true, onclick: () => this.start(0) });

        const dropZone = el('label', { class: 'drop-zone', for: 'file-input' }, [
            el('div', { class: 'dz-icon', text: '🎬' }),
            el('div', { class: 'dz-main', text: t('setup.pick_file') }),
            el('div', { class: 'dz-sub', text: t('setup.pick_hint') }),
            fileInput,
        ]);
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('over'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('over'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('over');
            const f = e.dataTransfer?.files?.[0];
            if (f) void this.loadFile(f);
        });

        const session = loadSession();
        const resume = session && Date.now() - session.savedAt < 2 * 3600_000 ? this.resumeCard(session) : null;

        return el('div', { class: 'setup' }, [
            el('div', { class: 'setup-head' }, [
                el('h1', { class: 'setup-title' }, [el('span', { text: 'CineSub' }), el('small', { text: ' ' + t('setup.subtitle_hint') })]),
                this.langPicker(),
            ]),
            el('p', { class: 'setup-tagline', text: t('setup.tagline') }),
            resume,
            dropZone,
            this.statusEl,
            this.startBtn,
            this.secondRow(),
            el('button', { class: 'btn-demo', text: t('setup.demo'), onclick: () => this.loadDemo() }),
            el('ul', { class: 'setup-tips' }, [
                el('li', { text: t('setup.tip_offline') }),
                el('li', { text: t('setup.tip_brightness') }),
                el('li', { text: t('setup.tip_sync') }),
            ]),
            // Ko-fi：href 命中 kofi-widget.js，会在页面内弹窗打开，不跳走
            el('a', { class: 'btn-support', href: 'https://ko-fi.com/snownamida', target: '_blank', rel: 'noopener', text: t('setup.support') }),
        ]);
    }

    /** 双语入口：仅在主字幕已加载后出现；已加载副字幕则显示其名 + 移除。 */
    private secondRow(): HTMLElement | null {
        if (!this.loaded) return null;
        if (this.loaded.secondaryCues) {
            return el('div', { class: 'second-loaded' }, [
                el('span', { text: t('setup.second_loaded', { name: this.loaded.secondaryName ?? '' }) }),
                el('button', {
                    class: 'btn-dismiss', text: '×', title: t('setup.second_remove'),
                    onclick: () => { if (this.loaded) { this.loaded.secondaryCues = undefined; this.loaded.secondaryName = undefined; } this.render(); },
                }),
            ]);
        }
        const input = el('input', { type: 'file', accept: '.srt,.vtt,.ass,.ssa,.txt', id: 'file-input-2', class: 'visually-hidden' });
        input.addEventListener('change', () => {
            const f = (input as HTMLInputElement).files?.[0];
            if (f) void this.loadSecondary(f);
        });
        return el('label', { class: 'btn-second', for: 'file-input-2', text: t('setup.add_second') }, [input]);
    }

    /** 语言下拉：切换后就地重建整个界面。 */
    private langPicker(): HTMLElement {
        const sel = el('select', { class: 'lang-select', 'aria-label': t('lang.label') },
            SUPPORTED.map((l) => el('option', { value: l.code, text: l.label, ...(l.code === getLang() ? { selected: 'selected' } : {}) })),
        ) as HTMLSelectElement;
        sel.addEventListener('change', () => {
            setLang(sel.value as (typeof SUPPORTED)[number]['code']);
            this.render();
        });
        // 🌐 是跨语言通用的“语言/地区”符号：不懂当前界面语言的人也能认出这是语言切换
        return el('div', { class: 'lang-wrap' }, [
            el('span', { class: 'lang-globe', text: '🌐', 'aria-hidden': 'true' }),
            sel,
        ]);
    }

    private resumeCard(session: Session): HTMLElement {
        return el('div', { class: 'resume-card' }, [
            el('div', {}, [
                el('div', { class: 'resume-name', text: session.fileName === DEMO_ID ? t('setup.demo_name') : session.fileName }),
                el('div', { class: 'resume-pos', text: t('setup.resume_pos', { time: formatTime(session.positionMs) }) }),
            ]),
            el('button', {
                class: 'btn-resume', text: t('setup.resume'),
                onclick: () => {
                    // 续播演示字幕时用当前语言重建，名字和字幕都跟随界面语言
                    if (session.fileName === DEMO_ID) {
                        this.onStart(parseSubtitle('demo.vtt', buildDemoVtt()), DEMO_ID, session.positionMs);
                    } else {
                        this.onStart(session.cues, session.fileName, session.positionMs, session.secondaryCues, session.secondaryName);
                    }
                },
            }),
            el('button', {
                class: 'btn-dismiss', text: '×', title: t('setup.dismiss'),
                onclick: (e: Event) => { clearSession(); (e.target as HTMLElement).closest('.resume-card')?.remove(); },
            }),
        ]);
    }

    private async loadFile(file: File): Promise<void> {
        try {
            const text = decodeSubtitleBytes(await file.arrayBuffer());
            const cues = parseSubtitle(file.name, text);
            if (cues.length === 0) {
                this.setStatus(t('setup.status_parse_fail', { name: file.name }), true);
                return;
            }
            this.loaded = { cues, fileName: file.name };
            this.render(); // 重建以显示「双语」入口，render 内部会恢复已加载状态
        } catch {
            this.setStatus(t('setup.status_read_fail'), true);
        }
    }

    private async loadSecondary(file: File): Promise<void> {
        if (!this.loaded) return;
        try {
            const text = decodeSubtitleBytes(await file.arrayBuffer());
            const cues = parseSubtitle(file.name, text);
            if (cues.length === 0) {
                this.setStatus(t('setup.status_parse_fail', { name: file.name }), true);
                return;
            }
            this.loaded.secondaryCues = cues;
            this.loaded.secondaryName = file.name;
            this.render();
        } catch {
            this.setStatus(t('setup.status_read_fail'), true);
        }
    }

    private loadDemo(): void {
        // 用稳定标识而非当前语言的字符串，续播/控制层再按语言翻译
        const cues = parseSubtitle('demo.vtt', buildDemoVtt());
        this.loaded = { cues, fileName: DEMO_ID };
        this.onStart(cues, DEMO_ID, 0);
    }

    private setStatus(msg: string, bad: boolean): void {
        this.statusEl.textContent = msg;
        this.statusEl.classList.toggle('bad', bad);
    }

    private start(at: number): void {
        if (this.loaded) this.onStart(this.loaded.cues, this.loaded.fileName, at, this.loaded.secondaryCues, this.loaded.secondaryName);
    }
}
