/**
 * 播放时钟：跟随真实时间流逝，支持 暂停/继续、微调(nudge)、跳转(seek)。
 * now() 可注入，便于测试。
 */
export class PlaybackClock {
    private base = 0;          // 播放中：now - base = 当前位置；暂停中：froz 即位置
    private frozen = 0;
    private running = false;
    private readonly now: () => number;

    constructor(now: () => number = () => performance.now()) {
        this.now = now;
    }

    /** 当前位置（ms，可为负——负数表示还没到片头）。 */
    current(): number {
        return this.running ? this.now() - this.base : this.frozen;
    }

    isRunning(): boolean {
        return this.running;
    }

    /** 从指定位置开始播放（默认从当前冻结位置）。 */
    start(fromMs: number = this.frozen): void {
        this.base = this.now() - fromMs;
        this.running = true;
    }

    pause(): void {
        if (!this.running) return;
        this.frozen = this.current();
        this.running = false;
    }

    resume(): void {
        if (this.running) return;
        this.start(this.frozen);
    }

    /** 同步微调：正值 = 字幕快进（你看到的字幕偏晚时按 +）。 */
    nudge(deltaMs: number): void {
        if (this.running) this.base -= deltaMs;
        else this.frozen += deltaMs;
    }

    /** 跳转到绝对位置。 */
    seek(toMs: number): void {
        if (this.running) this.base = this.now() - toMs;
        else this.frozen = toMs;
    }
}
