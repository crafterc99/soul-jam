import Phaser from 'phaser';
import { SCENE_BOOT, SCENE_PRELOAD } from '../config/Constants';

export class BootScene extends Phaser.Scene {
  private videoEl: HTMLVideoElement | null = null;
  private tapOverlay: HTMLDivElement | null = null;

  constructor() {
    super({ key: SCENE_BOOT });
  }

  create(): void {
    const vid = document.createElement('video');
    vid.src = 'assets/images/loading-screen.mp4';
    vid.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;object-fit:cover;z-index:9999;background:#000;display:none';
    vid.playsInline = true;
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

    const startVideo = () => {
      if (this.tapOverlay) { this.tapOverlay.remove(); this.tapOverlay = null; }
      vid.style.display = 'block';
      vid.play().then(() => {
        // Playing with audio — any key/tap skips
        document.addEventListener('keydown', advance, { once: true });
        vid.addEventListener('click', advance, { once: true });
      }).catch(() => advance());
    };

    // Try autoplay with audio first
    vid.play().then(() => {
      vid.style.display = 'block';
      document.addEventListener('keydown', advance, { once: true });
      vid.addEventListener('click', advance, { once: true });
    }).catch(() => {
      // Browser blocked audio autoplay — show tap-to-start overlay
      vid.pause();
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:#000;display:flex;align-items:center;justify-content:center;cursor:pointer';
      overlay.innerHTML = '<div style="font-family:monospace;font-size:28px;color:#ffcc00;font-weight:bold;letter-spacing:4px;text-shadow:0 0 20px #ffcc0066;animation:pulse 1s ease-in-out infinite alternate">TAP TO START</div>';
      const style = document.createElement('style');
      style.textContent = '@keyframes pulse{from{opacity:1}to{opacity:0.3}}';
      document.head.appendChild(style);
      this.tapOverlay = overlay;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', startVideo, { once: true });
      document.addEventListener('keydown', startVideo, { once: true });
    });
  }

  shutdown(): void {
    if (this.videoEl) { this.videoEl.pause(); this.videoEl.remove(); this.videoEl = null; }
    if (this.tapOverlay) { this.tapOverlay.remove(); this.tapOverlay = null; }
  }
}
