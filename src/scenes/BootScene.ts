import Phaser from 'phaser';
import { SCENE_BOOT, SCENE_PRELOAD, GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';

export class BootScene extends Phaser.Scene {
  private videoEl: HTMLVideoElement | null = null;

  constructor() {
    super({ key: SCENE_BOOT });
  }

  create(): void {
    // Overlay a native HTML video element on top of the Phaser canvas
    const vid = document.createElement('video');
    vid.src = 'assets/images/loading-screen.mp4';
    vid.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;object-fit:cover;z-index:9999;background:#000';
    vid.playsInline = true;
    vid.muted = true; // Required for autoplay in all browsers
    this.videoEl = vid;
    document.body.appendChild(vid);

    const advance = () => {
      if (!this.videoEl) return;
      this.videoEl.pause();
      this.videoEl.remove();
      this.videoEl = null;
      this.scene.start(SCENE_PRELOAD);
    };

    vid.addEventListener('ended', advance);
    this.input.keyboard?.once('keydown', advance);
    this.input.once('pointerdown', advance);

    vid.play().catch(() => advance());
  }

  shutdown(): void {
    if (this.videoEl) {
      this.videoEl.pause();
      this.videoEl.remove();
      this.videoEl = null;
    }
  }
}
