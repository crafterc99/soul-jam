import Phaser from 'phaser';
import { SCENE_CHARACTER_SELECT, SCENE_COURT_SELECT, SCENE_BOOT, GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';
import { CHARACTERS, getCharacterIds } from '../data/Characters';
import { getStorageService } from '../services/StorageService';

interface SceneData {
  mode: 'cpu' | 'local2p';
}

// Layout
const NUM_SLOTS = 6;
const BOX_W = 148;
const BOX_H = 174;
const BOX_GAP = 16;
const SLOTS_TOTAL_W = NUM_SLOTS * BOX_W + (NUM_SLOTS - 1) * BOX_GAP;  // 968
const SLOTS_LEFT = (GAME_WIDTH - SLOTS_TOTAL_W) / 2;                    // 156
const BOX_TOP = 490;

const BAR_W = 108;
const BAR_H = 8;

// Stat grid: 2 rows x 3 cols, absolute coords
const STAT_COLS = [548, 728, 908];
const STAT_ROWS = [52, 80];

const STAT_KEYS = ['speed', 'power', 'range', 'defense', 'steal', 'clutchEnergy'] as const;
const STAT_LABELS = ['SPD', 'PWR', 'RNG', 'DEF', 'STL', 'CLU'];

type StatKey = typeof STAT_KEYS[number];

export class CharacterSelectScene extends Phaser.Scene {
  private mode: 'cpu' | 'local2p' = 'cpu';
  private p1Selection = 0;
  private p2Selection = 1;
  private characterIds: string[] = [];
  private bgVideoEl: HTMLVideoElement | null = null;
  private gamepadNavTimer = 0;

  // Updatable UI refs
  private charNameText: Phaser.GameObjects.Text | null = null;
  private charTitleText: Phaser.GameObjects.Text | null = null;
  private soulRatingText: Phaser.GameObjects.Text | null = null;
  private statFills: { fill: Phaser.GameObjects.Rectangle; val: Phaser.GameObjects.Text }[] = [];
  private boxImages: (Phaser.GameObjects.Image | null)[] = [];
  private boxHighlights: Phaser.GameObjects.Rectangle[] = [];
  private highlightTween: Phaser.Tweens.Tween | null = null;

  constructor() {
    super({ key: SCENE_CHARACTER_SELECT });
  }

  init(data: SceneData): void {
    this.mode = data?.mode ?? 'cpu';
    this.characterIds = getCharacterIds();
    const breezyIdx = this.characterIds.indexOf('breezy');
    this.p1Selection = breezyIdx >= 0 ? breezyIdx : 0;
    this.p2Selection = (this.p1Selection + 1) % Math.max(1, this.characterIds.length);
  }

  create(): void {
    // Place DOM video behind canvas
    const canvas = this.sys.game.canvas;
    canvas.style.position = 'relative';
    canvas.style.zIndex = '2';

    const vid = document.createElement('video');
    vid.src = 'assets/images/char-select-bg.mp4';
    vid.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;object-fit:cover;z-index:1;pointer-events:none';
    vid.loop = true;
    vid.muted = true;
    vid.playsInline = true;
    this.bgVideoEl = vid;
    document.body.appendChild(vid);
    vid.play().catch(() => {});

    this.buildPanel();
    this.buildBoxes();
    this.buildPressStart();
    this.bindInput();
    this.refreshUI();
  }

  private buildPanel(): void {
    const D = 100;

    // Frosted dark panel spanning top of screen
    this.add.rectangle(GAME_WIDTH / 2, 90, 1240, 152, 0x06060f, 0.84).setDepth(D);

    // Subtle top + bottom edge lines
    this.add.rectangle(GAME_WIDTH / 2, 14, 1240, 1, 0x3a3a5c, 0.6).setDepth(D + 1);
    this.add.rectangle(GAME_WIDTH / 2, 166, 1240, 1, 0x3a3a5c, 0.3).setDepth(D + 1);

    // Vertical dividers
    this.add.rectangle(405, 90, 1, 130, 0x333355, 0.5).setDepth(D + 1);
    this.add.rectangle(545, 90, 1, 130, 0x333355, 0.5).setDepth(D + 1);

    // ── LEFT: character name + title ──
    this.charNameText = this.add.text(54, 50, '', {
      fontSize: '36px',
      fontFamily: '"Helvetica Neue",Helvetica,Arial,sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setDepth(D + 2);

    this.charTitleText = this.add.text(54, 97, '', {
      fontSize: '13px',
      fontFamily: '"Helvetica Neue",Helvetica,Arial,sans-serif',
      color: '#8888aa',
      fontStyle: 'italic',
    }).setDepth(D + 2);

    // ── MIDDLE: soul rating ──
    this.add.text(419, 36, 'SOUL', {
      fontSize: '9px',
      fontFamily: '"Helvetica Neue",Helvetica,Arial,sans-serif',
      color: '#555566',
      letterSpacing: 4,
    }).setDepth(D + 2);

    this.soulRatingText = this.add.text(419, 50, '', {
      fontSize: '42px',
      fontFamily: '"Helvetica Neue",Helvetica,Arial,sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setDepth(D + 2);

    // ── RIGHT: stat bars ──
    this.statFills = [];

    STAT_KEYS.forEach((key, i) => {
      void key; // key used in refreshUI, not here
      const col = i % 3;
      const row = Math.floor(i / 3);
      const sx = STAT_COLS[col];
      const sy = STAT_ROWS[row];

      this.add.text(sx, sy, STAT_LABELS[i], {
        fontSize: '9px',
        fontFamily: '"Helvetica Neue",Helvetica,Arial,sans-serif',
        color: '#555566',
        letterSpacing: 1,
      }).setDepth(D + 2);

      // Bar track
      this.add.rectangle(sx + 33 + BAR_W / 2, sy + 7, BAR_W, BAR_H, 0x18182a).setDepth(D + 2);

      // Bar fill — origin (0, 0.5) so it grows right from the left edge
      const fill = this.add.rectangle(sx + 33, sy + 7, 1, BAR_H, 0x4466ff)
        .setOrigin(0, 0.5)
        .setDepth(D + 3);

      const val = this.add.text(sx + 33 + BAR_W + 6, sy + 1, '', {
        fontSize: '10px',
        fontFamily: '"Helvetica Neue",Helvetica,Arial,sans-serif',
        color: '#aaaacc',
      }).setDepth(D + 2);

      this.statFills.push({ fill, val });
    });
  }

  private buildBoxes(): void {
    this.boxImages = [];
    this.boxHighlights = [];

    for (let i = 0; i < NUM_SLOTS; i++) {
      const cx = SLOTS_LEFT + i * (BOX_W + BOX_GAP) + BOX_W / 2;
      const cy = BOX_TOP + BOX_H / 2;
      const charId = this.characterIds[i] ?? null;
      const charDef = charId ? CHARACTERS[charId] : null;

      // Box backing
      this.add.rectangle(cx, cy, BOX_W, BOX_H, charDef ? 0x0e0e1c : 0x080810, charDef ? 0.85 : 0.6)
        .setDepth(100);

      // Portrait image or empty slot
      let img: Phaser.GameObjects.Image | null = null;
      if (charDef && this.textures.exists(charDef.assets.selectBg)) {
        img = this.add.image(cx, cy, charDef.assets.selectBg)
          .setDisplaySize(BOX_W, BOX_H)
          .setDepth(101)
          .setAlpha(0.55);
      } else if (!charDef) {
        // Empty slot
        this.add.rectangle(cx, cy, BOX_W, BOX_H, 0x111120, 0.4).setDepth(101);
        this.add.text(cx, cy - 6, '+', {
          fontSize: '24px',
          fontFamily: 'Arial',
          color: '#1e1e30',
        }).setOrigin(0.5).setDepth(102);
      }
      this.boxImages.push(img);

      // Character name below box
      if (charDef) {
        this.add.text(cx, BOX_TOP + BOX_H + 8, charDef.name, {
          fontSize: '11px',
          fontFamily: '"Helvetica Neue",Helvetica,Arial,sans-serif',
          color: '#666677',
          letterSpacing: 2,
        }).setOrigin(0.5).setDepth(103);
      }

      // Selection highlight border
      const h = this.add.rectangle(cx, cy, BOX_W + 5, BOX_H + 5)
        .setStrokeStyle(2.5, 0xffffff)
        .setFillStyle(0xffffff, 0.04)
        .setDepth(104)
        .setAlpha(0);
      this.boxHighlights.push(h);
    }
  }

  private buildPressStart(): void {
    const ps = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 18, 'PRESS START', {
      fontSize: '18px',
      fontFamily: '"Helvetica Neue",Helvetica,Arial,sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      letterSpacing: 10,
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({ targets: ps, alpha: 0.15, duration: 700, yoyo: true, repeat: -1 });
  }

  private bindInput(): void {
    this.input.keyboard?.on('keydown-A', () => this.navigate(-1));
    this.input.keyboard?.on('keydown-D', () => this.navigate(1));
    this.input.keyboard?.on('keydown-LEFT', () => this.navigate(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.navigate(1));
    this.input.keyboard?.on('keydown-SPACE', () => this.confirm());
    this.input.keyboard?.on('keydown-ENTER', () => this.confirm());
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start(SCENE_BOOT));

    this.input.gamepad?.on('down', (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
      if (button.index === 0) this.confirm();
      if (button.index === 1) this.scene.start(SCENE_BOOT);
      if (button.index === 14) this.navigate(-1);
      if (button.index === 15) this.navigate(1);
    });
  }

  private refreshUI(): void {
    const charId = this.characterIds[this.p1Selection];
    const charDef = CHARACTERS[charId];
    if (!charDef) return;

    // Update name + title
    this.charNameText?.setText(charDef.name);
    this.charTitleText?.setText(charDef.title.toUpperCase());

    // Soul rating (average of all 6)
    const r = charDef.ratings;
    const soul = Math.round(
      (r.speed + r.power + r.range + r.defense + r.steal + r.clutchEnergy) / 6
    );
    this.soulRatingText?.setText(`${soul}`);

    // Stat bars — use character color for fill
    const barColor = charDef.color;
    STAT_KEYS.forEach((key: StatKey, i) => {
      const v = r[key];
      const fw = Math.max(1, (v / 100) * BAR_W);
      const { fill, val } = this.statFills[i];
      fill.setDisplaySize(fw, BAR_H);
      fill.setFillStyle(barColor);
      val.setText(`${v}`);
    });

    // Box image alphas
    this.boxImages.forEach((img, i) => img?.setAlpha(i === this.p1Selection ? 1 : 0.55));

    // Box highlight: kill old tween, reset all, pulse selected
    if (this.highlightTween) {
      this.highlightTween.stop();
      this.highlightTween = null;
    }
    this.boxHighlights.forEach((h, i) => h.setAlpha(i === this.p1Selection ? 1 : 0));
    if (this.boxHighlights[this.p1Selection]) {
      this.highlightTween = this.tweens.add({
        targets: this.boxHighlights[this.p1Selection],
        alpha: { from: 0.6, to: 1 },
        duration: 900,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  update(_time: number, delta: number): void {
    if (this.gamepadNavTimer > 0) { this.gamepadNavTimer -= delta; return; }
    const pad = this.input.gamepad?.getPad(0);
    if (pad?.connected) {
      const lx = pad.leftStick.x;
      if (lx < -0.5) { this.navigate(-1); this.gamepadNavTimer = 250; }
      else if (lx > 0.5) { this.navigate(1); this.gamepadNavTimer = 250; }
    }
  }

  private navigate(direction: number): void {
    const count = this.characterIds.length;
    if (count === 0) return;
    this.p1Selection = (this.p1Selection + direction + count) % count;
    this.p2Selection = (this.p1Selection + 1) % count;
    this.refreshUI();
  }

  private confirm(): void {
    const charId = this.characterIds[this.p1Selection];
    const storage = getStorageService();
    if (!storage.isCharacterUnlocked(charId) && !CHARACTERS[charId]?.unlocked) {
      this.tweens.add({ targets: this.charNameText, alpha: 0.2, duration: 100, yoyo: true, repeat: 2 });
      return;
    }
    this.scene.start(SCENE_COURT_SELECT, {
      mode: this.mode,
      p1CharacterId: this.characterIds[this.p1Selection],
      p2CharacterId: this.characterIds[this.p2Selection],
    });
  }

  shutdown(): void {
    if (this.highlightTween) { this.highlightTween.stop(); this.highlightTween = null; }
    if (this.bgVideoEl) {
      this.bgVideoEl.pause();
      this.bgVideoEl.remove();
      this.bgVideoEl = null;
    }
    const canvas = this.sys.game.canvas;
    canvas.style.position = '';
    canvas.style.zIndex = '';
  }
}
