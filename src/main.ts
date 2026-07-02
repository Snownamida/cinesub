import './style.css';
import { Cue } from './domain/cues';
import { loadSettings } from './app/store';
import { PlayerView } from './ui/PlayerView';
import { SetupView } from './ui/SetupView';

const app = document.getElementById('app');
if (!app) throw new Error('conteneur #app introuvable');

let player: PlayerView | null = null;

function showSetup(): void {
    player = null;
    document.body.classList.remove('playing');
    new SetupView(app!, startPlayer);
}

function startPlayer(cues: Cue[], fileName: string, startAt: number): void {
    document.body.classList.add('playing');
    player = new PlayerView(app!, {
        cues,
        fileName,
        startAt,
        settings: loadSettings(),
        onExit: showSetup,
    });
}

// 离开页面前保存进度（保险带，Player 自身每 5 秒也存一次）
window.addEventListener('pagehide', () => player?.destroy());

showSetup();
