import { describe, expect, it } from 'vitest';
import { PlaybackClock, MIN_ANCHOR_GAP } from '../src/domain/clock';
import { activeText, formatTime, parseTimeInput, totalDuration } from '../src/domain/cues';

function fakeNow() {
    let t = 0;
    return { now: () => t, advance: (ms: number) => { t += ms; } };
}

describe('PlaybackClock', () => {
    it('start/advance/pause/resume', () => {
        const f = fakeNow();
        const c = new PlaybackClock(f.now);
        expect(c.current()).toBe(0);
        c.start();
        f.advance(5000);
        expect(c.current()).toBe(5000);
        c.pause();
        f.advance(9999);
        expect(c.current()).toBe(5000); // 暂停时不走
        c.resume();
        f.advance(1000);
        expect(c.current()).toBe(6000);
    });

    it('nudge 在播放与暂停时都生效', () => {
        const f = fakeNow();
        const c = new PlaybackClock(f.now);
        c.start();
        f.advance(10000);
        c.nudge(500);
        expect(c.current()).toBe(10500);
        c.pause();
        c.nudge(-500);
        expect(c.current()).toBe(10000);
    });

    it('seek 跳转到绝对位置', () => {
        const f = fakeNow();
        const c = new PlaybackClock(f.now);
        c.start();
        f.advance(3000);
        c.seek(60000);
        expect(c.current()).toBe(60000);
        f.advance(1000);
        expect(c.current()).toBe(61000);
    });

    it('start(from) 支持从任意点开播、位置可为负', () => {
        const f = fakeNow();
        const c = new PlaybackClock(f.now);
        c.start(-3000); // 提前 3 秒按下（片头广告结束前）
        expect(c.current()).toBe(-3000);
        f.advance(3000);
        expect(c.current()).toBe(0);
    });
});

describe('PlaybackClock 两点漂移校准', () => {
    it('标记两个同步点后按线性拟合校正漂移，且标记时刻不跳变', () => {
        const f = fakeNow();
        const c = new PlaybackClock(f.now);
        c.start(0);
        f.advance(60000);
        c.seek(61000);               // 开场对齐：此刻字幕应是 61s
        expect(c.markSyncPoint()).toBe('first');
        f.advance(600000);           // 又过 10 分钟
        c.seek(667600);              // 重新对齐：漂移后此刻字幕应是 667.6s
        const before = c.current();
        expect(c.markSyncPoint()).toBe('calibrated');
        expect(c.current()).toBeCloseTo(before, 6);           // 标记那一刻不跳变
        expect(c.syncInfo()).toEqual({ points: 2, scale: (667600 - 61000) / (660000 - 60000) });
        f.advance(300000);           // 之后继续按拟合比例推进
        expect(c.current()).toBeCloseTo(1.011 * 960000 + 340, 3);
    });

    it('两点间隔太近则拒绝校准', () => {
        const f = fakeNow();
        const c = new PlaybackClock(f.now);
        c.start(0);
        expect(c.markSyncPoint()).toBe('first');
        f.advance(MIN_ANCHOR_GAP - 1);
        expect(c.markSyncPoint()).toBe('too-close');
        expect(c.syncInfo().points).toBe(1);
    });

    it('resetSync 回到 scale=1 且当前位置不跳变', () => {
        const f = fakeNow();
        const c = new PlaybackClock(f.now);
        c.start(0);
        f.advance(60000); c.seek(61000); c.markSyncPoint();
        f.advance(600000); c.seek(667600); c.markSyncPoint();
        const pos = c.current();
        c.resetSync();
        expect(c.current()).toBe(pos);
        expect(c.syncInfo()).toEqual({ points: 0, scale: 1 });
    });

    it('start 会重置校准', () => {
        const f = fakeNow();
        const c = new PlaybackClock(f.now);
        c.start(0);
        f.advance(60000); c.seek(61000); c.markSyncPoint();
        f.advance(600000); c.seek(667600); c.markSyncPoint();
        c.start(0);
        expect(c.syncInfo()).toEqual({ points: 0, scale: 1 });
    });
});

describe('activeText', () => {
    const cues = [
        { start: 1000, end: 3000, text: 'A' },
        { start: 2000, end: 4000, text: 'B' }, // 与 A 重叠
        { start: 10000, end: 12000, text: 'C' },
    ];

    it('单条命中与未命中', () => {
        expect(activeText(cues, 0)).toBe('');
        expect(activeText(cues, 1500)).toBe('A');
        expect(activeText(cues, 5000)).toBe('');
        expect(activeText(cues, 11000)).toBe('C');
    });

    it('重叠字幕拼接显示', () => {
        expect(activeText(cues, 2500)).toBe('A\nB');
    });

    it('边界：start 含、end 不含', () => {
        expect(activeText(cues, 1000)).toBe('A');
        expect(activeText(cues, 3000)).toBe('B'); // A 恰好结束
    });

    it('空列表', () => {
        expect(activeText([], 1000)).toBe('');
    });
});

describe('时间格式化与解析', () => {
    it('formatTime', () => {
        expect(formatTime(0)).toBe('00:00:00');
        expect(formatTime(3661000)).toBe('01:01:01');
        expect(formatTime(-5000)).toBe('-00:00:05');
    });

    it('parseTimeInput 接受 HH:MM:SS / MM:SS / 秒数', () => {
        expect(parseTimeInput('01:02:03')).toBe(3723000);
        expect(parseTimeInput('12:34')).toBe(754000);
        expect(parseTimeInput('90')).toBe(90000);
        expect(parseTimeInput('abc')).toBeNull();
        expect(parseTimeInput('1:99')).toBeNull();
    });

    it('totalDuration', () => {
        expect(totalDuration([{ start: 0, end: 5000, text: 'x' }, { start: 1, end: 2, text: 'y' }])).toBe(5000);
        expect(totalDuration([])).toBe(0);
    });
});
