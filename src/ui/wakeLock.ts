/** 屏幕常亮（Wake Lock API）：2 小时电影中途锁屏是灾难。 */
let sentinel: WakeLockSentinel | null = null;
let wanted = false;

async function acquire(): Promise<void> {
    if (!('wakeLock' in navigator)) return;
    try {
        sentinel = await navigator.wakeLock.request('screen');
    } catch {
        /* 低电量模式等场景可能被拒，静默降级 */
    }
}

/** 切回前台时自动重新申请（切走会自动释放）。 */
document.addEventListener('visibilitychange', () => {
    if (wanted && document.visibilityState === 'visible') void acquire();
});

export function keepAwake(): void {
    wanted = true;
    void acquire();
}

export function releaseAwake(): void {
    wanted = false;
    void sentinel?.release().catch(() => undefined);
    sentinel = null;
}
