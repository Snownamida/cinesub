import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    base: './',
    plugins: [
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['icon.svg'],
            manifest: {
                name: 'CineSub 影院字幕伴侣',
                short_name: 'CineSub',
                description: '在手机纯黑屏幕上同步播放你自己的字幕文件，海外看电影不再没字幕。',
                display: 'fullscreen',
                orientation: 'any',
                background_color: '#000000',
                theme_color: '#000000',
                icons: [
                    { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
                ],
            },
        }),
    ],
});
