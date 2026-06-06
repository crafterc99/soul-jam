import Phaser from 'phaser';
import { SCENE_BOOT, SCENE_PRELOAD } from '../config/Constants';

export class BootScene extends Phaser.Scene {
  private videoEl: HTMLVideoElement | null = null;
  private overlayEl: HTMLDivElement | null = null;

  constructor() {
    super({ key: SCENE_BOOT });
  }

  create(): void {
    // Inject pulse animation style
    const style = document.createElement('style');
    style.textContent = '@keyframes sj-pulse{0%,100%{opacity:1}50%{opacity:0.25}}';
    document.head.appendChild(style);

    // Video
    const vid = document.createElement('video');
    vid.src = 'assets/images/loading-screen.mp4';
    vid.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;object-fit:cover;z-index:9999;background:#000';
    vid.playsInline = true;
    vid.muted = false;
    this.videoEl = vid;
    document.body.appendChild(vid);

    // "PRESS START" overlay on the video
    const label = document.createElement('div');
    label.textContent = 'PRESS START';
    label.style.cssText = [
      'position:fixed',
      'left:50%',
      'top:78%',
      'transform:translateX(-50%)',
      'z-index:10000',
      'font-family:"Helvetica Neue",Helvetica,Arial,sans-serif',
      'font-size:clamp(14px,2.8vw,32px)',
      'font-weight:300',
      'letter-spacing:0.35em',
      'color:#ffffff',
      'text-transform:uppercase',
      'animation:sj-pulse 1.4s ease-in-out infinite',
      'pointer-events:none',
      'user-select:none',
    ].join(';');
    this.overlayEl = label;
    document.body.appendChild(label);

    const advance = () => {
      if (!this.videoEl) return;
      this.videoEl.pause();
      this.videoEl.remove();
      this.videoEl = null;
      if (this.overlayEl) { this.overlayEl.remove(); this.overlayEl = null; }
      this.scene.start(SCENE_PRELOAD);
    };

    vid.addEventListener('ended', advance);
    document.addEventListener('keydown', advance, { once: true });
    document.addEventListener('pointerdown', advance, { once: true });

    vid.play().catch(() => { vid.muted = true; vid.play().catch(() => {}); });
  }

  shutdown(): void {
    if (this.videoEl) { this.videoEl.pause(); this.videoEl.remove(); this.videoEl = null; }
    if (this.overlayEl) { this.overlayEl.remove(); this.overlayEl = null; }
  }
}
