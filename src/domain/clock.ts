/** 标记两个同步点之间要求的最小真实间隔（ms），太近则线性拟合不稳。 */
export const MIN_ANCHOR_GAP = 20000;

export type MarkResult = 'first' | 'calibrated' | 'too-close';

/**
 * 播放时钟：字幕时间 = scale × 真实经过时间 + offset。
 *
 * - nudge / seek 只平移 offset（scale 不变）——恒定偏移对齐。
 * - 两点校准（markSyncPoint）解出 scale，修正因帧率/版本不同导致的**渐进漂移**：
 *   下载的字幕开头对上了、中段却越差越多，标记前后两个同步点即可一次拉正。
 *
 * now() 可注入，便于测试。
 */
export class PlaybackClock {
    private originWall = 0;     // 播放中：start 时刻的 now()
    private frozenRaw = 0;      // 暂停中：冻结的真实经过时间
    private running = false;
    private scale = 1;
    private offset = 0;         // 字幕时间 = scale * rawElapsed + offset
    private anchors: { raw: number; sub: number }[] = [];
    private readonly now: () => number;

    constructor(now: () => number = () => performance.now()) {
        this.now = now;
    }

    /** 真实经过时间（未经 scale/offset 变换）。 */
    private rawElapsed(): number {
        return this.running ? this.now() - this.originWall : this.frozenRaw;
    }

    /** 当前字幕位置（ms，可为负——负数表示还没到片头）。 */
    current(): number {
        return this.scale * this.rawElapsed() + this.offset;
    }

    isRunning(): boolean {
        return this.running;
    }

    /** 从指定字幕位置开始播放（默认从当前位置）。会重置漂移校准。 */
    start(fromMs: number = this.current()): void {
        this.scale = 1;
        this.offset = fromMs;
        this.anchors = [];
        this.originWall = this.now();
        this.frozenRaw = 0;
        this.running = true;
    }

    pause(): void {
        if (!this.running) return;
        this.frozenRaw = this.rawElapsed();
        this.running = false;
    }

    resume(): void {
        if (this.running) return;
        this.originWall = this.now() - this.frozenRaw;
        this.running = true;
    }

    /** 同步微调：正值 = 字幕快进（你看到的字幕偏晚时按 +）。 */
    nudge(deltaMs: number): void {
        this.offset += deltaMs;
    }

    /** 跳转到绝对字幕位置（保持当前 scale）。 */
    seek(toMs: number): void {
        this.offset = toMs - this.scale * this.rawElapsed();
    }

    /**
     * 标记「此刻字幕正好对上台词」。第一个点仅作基准；
     * 第二个点（与首点真实间隔足够）自动解出 scale + offset，校正漂移。
     * 之后每次标记都用「首点 + 最新点」重新拟合。
     */
    markSyncPoint(): MarkResult {
        const raw = this.rawElapsed();
        const sub = this.current();
        if (this.anchors.length === 0) {
            this.anchors = [{ raw, sub }];
            return 'first';
        }
        const a = this.anchors[0];
        if (Math.abs(raw - a.raw) < MIN_ANCHOR_GAP) return 'too-close';
        this.anchors = [a, { raw, sub }];
        this.scale = (sub - a.sub) / (raw - a.raw);
        this.offset = a.sub - this.scale * a.raw;
        return 'calibrated';
    }

    /** 撤销漂移校准：scale 回到 1，当前显示位置保持不变，清空同步点。 */
    resetSync(): void {
        this.offset = this.current() - this.rawElapsed();
        this.scale = 1;
        this.anchors = [];
    }

    /** 校准状态：已标记的点数与当前拉伸比例。 */
    syncInfo(): { points: number; scale: number } {
        return { points: this.anchors.length, scale: this.scale };
    }
}
