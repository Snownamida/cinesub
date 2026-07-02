import { decodeSubtitleBytes, parseSubtitle } from '../domain/parse';
import { Cue, formatTime, totalDuration } from '../domain/cues';
import { Session, clearSession, loadSession } from '../app/store';
import { el } from './dom';

/** 内置演示字幕：在家先体验一遍流程。 */
const DEMO_SRT = `1
00:00:01,000 --> 00:00:04,000
👋 欢迎使用 CineSub

2
00:00:05,000 --> 00:00:09,000
电影开场时，按「开始播放」

3
00:00:10,000 --> 00:00:15,000
字幕和台词对不上？
用 +/− 按钮微调同步

4
00:00:16,000 --> 00:00:20,000
点击屏幕任意处
可以呼出或隐藏控制按钮

5
00:00:21,000 --> 00:00:25,000
祝观影愉快 🍿`;

/**
 * 起始界面：选择/拖入字幕文件 → 解析 → 「开始播放」。
 * 若上次会话存在（2 小时内），提供一键续播。
 */
export class SetupView {
    private readonly root: HTMLElement;
    private readonly onStart: (cues: Cue[], fileName: string, startAt: number) => void;
    private statusEl!: HTMLElement;
    private startBtn!: HTMLButtonElement;
    private loaded: { cues: Cue[]; fileName: string } | null = null;

    constructor(container: HTMLElement, onStart: (cues: Cue[], fileName: string, startAt: number) => void) {
        this.onStart = onStart;
        this.root = this.build();
        container.replaceChildren(this.root);
    }

    private build(): HTMLElement {
        const fileInput = el('input', { type: 'file', accept: '.srt,.vtt,.ass,.ssa,.txt', id: 'file-input', class: 'visually-hidden' });
        fileInput.addEventListener('change', () => {
            const f = (fileInput as HTMLInputElement).files?.[0];
            if (f) void this.loadFile(f);
        });

        this.statusEl = el('div', { class: 'setup-status' });
        this.startBtn = el('button', { class: 'btn-start', text: '▶ 开始播放', disabled: true, onclick: () => this.start(0) });

        const dropZone = el('label', { class: 'drop-zone', for: 'file-input' }, [
            el('div', { class: 'dz-icon', text: '🎬' }),
            el('div', { class: 'dz-main', text: '选择字幕文件' }),
            el('div', { class: 'dz-sub', text: '.srt / .vtt / .ass — 或拖到这里' }),
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
            el('h1', { class: 'setup-title' }, [el('span', { text: 'CineSub' }), el('small', { text: ' 影院字幕伴侣' })]),
            el('p', { class: 'setup-tagline', text: '手机举字幕，纯黑不扰人 — 海外看电影，字幕自己带。' }),
            resume,
            dropZone,
            this.statusEl,
            this.startBtn,
            el('button', { class: 'btn-demo', text: '🍿 先用演示字幕试一试', onclick: () => this.loadDemo() }),
            el('ul', { class: 'setup-tips' }, [
                el('li', { text: '📴 本页离线可用：内容只在你手机里，不上传任何文件' }),
                el('li', { text: '🔆 进场前把系统亮度调低，再用应用内「暗度」微调' }),
                el('li', { text: '⏱ 电影正片开始的瞬间按「开始播放」，之后用 ± 对时' }),
            ]),
        ]);
    }

    private resumeCard(session: Session): HTMLElement {
        return el('div', { class: 'resume-card' }, [
            el('div', {}, [
                el('div', { class: 'resume-name', text: session.fileName }),
                el('div', { class: 'resume-pos', text: `上次播到 ${formatTime(session.positionMs)}` }),
            ]),
            el('button', {
                class: 'btn-resume', text: '继续播放',
                onclick: () => this.onStart(session.cues, session.fileName, session.positionMs),
            }),
            el('button', {
                class: 'btn-dismiss', text: '×', title: '丢弃',
                onclick: (e: Event) => { clearSession(); (e.target as HTMLElement).closest('.resume-card')?.remove(); },
            }),
        ]);
    }

    private async loadFile(file: File): Promise<void> {
        try {
            const text = decodeSubtitleBytes(await file.arrayBuffer());
            const cues = parseSubtitle(file.name, text);
            if (cues.length === 0) {
                this.setStatus(`⚠️ 无法从「${file.name}」解析出字幕（支持 .srt / .vtt / .ass）`, true);
                return;
            }
            this.loaded = { cues, fileName: file.name };
            this.setStatus(`✅ ${file.name} — ${cues.length} 条字幕，全长 ${formatTime(totalDuration(cues))}`, false);
            this.startBtn.disabled = false;
        } catch {
            this.setStatus('⚠️ 读取文件失败', true);
        }
    }

    private loadDemo(): void {
        const cues = parseSubtitle('demo.srt', DEMO_SRT);
        this.loaded = { cues, fileName: '演示字幕' };
        this.onStart(cues, '演示字幕', 0);
    }

    private setStatus(msg: string, bad: boolean): void {
        this.statusEl.textContent = msg;
        this.statusEl.classList.toggle('bad', bad);
    }

    private start(at: number): void {
        if (this.loaded) this.onStart(this.loaded.cues, this.loaded.fileName, at);
    }
}
