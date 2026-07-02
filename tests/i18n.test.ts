import { describe, expect, it } from 'vitest';
import { MESSAGES, SUPPORTED } from '../src/i18n/messages';
import { getLang, setLang, t } from '../src/i18n';

describe('i18n', () => {
    it('每种语言的 key 集合与英文完全一致（防漏翻）', () => {
        const enKeys = Object.keys(MESSAGES.en).sort();
        for (const { code } of SUPPORTED) {
            expect(Object.keys(MESSAGES[code]).sort()).toEqual(enKeys);
        }
    });

    it('t() 替换占位符', () => {
        setLang('en');
        expect(t('setup.status_ok', { name: 'a.srt', n: 3, dur: '00:01:00' }))
            .toBe('✅ a.srt — 3 cues, total 00:01:00');
    });

    it('t() 缺失 key 回退到 key 本身', () => {
        expect(t('does.not.exist')).toBe('does.not.exist');
    });

    it('切换语言改变 t() 输出', () => {
        setLang('ja');
        expect(getLang()).toBe('ja');
        expect(t('setup.start')).toBe('▶ 再生開始');
        setLang('fr');
        expect(t('setup.start')).toBe('▶ Démarrer');
        setLang('ko');
        expect(t('player.color')).toBe('색상');
    });
});
