import Phaser from 'phaser';
import { SCENE_CHARACTER_SELECT, SCENE_COURT_SELECT, SCENE_BOOT, GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';
import { CHARACTERS, getCharacterIds } from '../data/Characters';
import { getStorageService } from '../services/StorageService';

interface SceneData {
  mode: 'cpu' | 'local2p';
}

// 3-group box grid
const BOX_W = 60;
const BOX_H = 73;
const BOX_GAP = 8;
const COLS = 6;
const ROWS = 2;
const GROUP_W = COLS * BOX_W + (COLS - 1) * BOX_GAP;   // 400
const GROUP_GAP = 20;
const GRID_LEFT = (GAME_WIDTH - 3 * GROUP_W - 2 * GROUP_GAP) / 2; // 20
const ROW1_Y = 520;
const ROW2_Y = ROW1_Y + BOX_H + BOX_GAP;                // 601

// Group 2 (center) is the selectable roster
const CENTER_GROUP_X = GRID_LEFT + GROUP_W + GROUP_GAP;  // 440

// SOUL LVL tab dimensions
const TAB_W = 400;
const TAB_H = 78;
const TAB_SKEW = 30;

interface SoulTab {
  nameText: Phaser.GameObjects.Text;
  barFill: Phaser.GameObjects.Rectangle;
  barTrack: Phaser.GameObjects.Rectangle;
}

export class CharacterSelectScene extends Phaser.Scene {
  private mode: 'cpu' | 'local2p' = 'cpu';
  private p1Selection = 0;
  private p2Selection = 1;
  private characterIds: string[] = [];
  private bgVideoEl: HTMLVideoElement | null = null;
  private gamepadNavTimer = 0;

  private p1Tab: SoulTab | null = null;
  private p2Tab: SoulTab | null = null;
  private centerImages: (Phaser.GameObjects.Image | null)[] = [];
  private centerHighlights: Phaser.GameObjects.Rectangle[] = [];
  private highlightTween: Phaser.Tweens.Tween | null = null;
  private centerDiamond: Phaser.GameObjects.Graphics | null = null;
  private diamondText: Phaser.GameObjects.Text | null = null;

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
    // DOM video — try with audio, fall back to muted if autoplay blocked
    const canvas = this.sys.game.canvas;
    canvas.style.position = 'relative';
    canvas.style.zIndex = '2';

    const vid = document.createElement('video');
    vid.src = 'assets/images/char-select-bg.mp4';
    vid.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;object-fit:cover;z-index:1;pointer-events:none';
    vid.loop = true;
    vid.muted = false;
    vid.playsInline = true;
    this.bgVideoEl = vid;
    document.body.appendChild(vid);
    vid.play().catch(() => { vid.muted = true; vid.play().catch(() => {}); });

    this.buildSoulTabs();
    this.buildBoxGrid();
    this.buildPressStart();
    this.bindInput();
    this.refreshUI();
  }

  // ── SOUL LVL TABS ──────────────────────────────────────────────

  private buildSoulTabs(): void {
    const D = 100;

    // P1 tab — left corner, right edge angled
    const g1 = this.add.graphics().setDepth(D);
    this.drawTab(g1, 8, 8, TAB_W, TAB_H, TAB_SKEW, false, 0x090912, 0.88);

    this.add.text(28, 18, 'SOUL LVL', {
      fontSize: '9px',
      fontFamily: '"Helvetica Neue",Helvetica,Arial,sans-serif',
      color: '#555572',
      letterSpacing: 4,
    }).setDepth(D + 1);

    const p1Name = this.add.text(28, 30, '', {
      fontSize: '22px',
      fontFamily: '"Helvetica Neue",Helvetica,Arial,sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setDepth(D + 1);

    const p1Track = this.add.rectangle(28 + 165, 68, 165, 5, 0x1c1c30).setDepth(D + 1);
    const p1Fill = this.add.rectangle(28, 68, 0, 5, 0xffffff).setOrigin(0, 0.5).setDepth(D + 2);

    this.p1Tab = { nameText: p1Name, barFill: p1Fill, barTrack: p1Track };

    // P2 tab — right corner, left edge angled (mirrored)
    const g2 = this.add.graphics().setDepth(D);
    this.drawTab(g2, GAME_WIDTH - 8 - TAB_W, 8, TAB_W, TAB_H, TAB_SKEW, true, 0x090912, 0.88);

    this.add.text(GAME_WIDTH - 28, 18, 'SOUL LVL', {
      fontSize: '9px',
      fontFamily: '"Helvetica Neue",Helvetica,Arial,sans-serif',
      color: '#555572',
      letterSpacing: 4,
    }).setOrigin(1, 0).setDepth(D + 1);

    const p2Name = this.add.text(GAME_WIDTH - 28, 30, '', {
      fontSize: '22px',
      fontFamily: '"Helvetica Neue",Helvetica,Arial,sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(1, 0).setDepth(D + 1);

    const BAR_W = 165;
    const barRight = GAME_WIDTH - 28;
    const p2Track = this.add.rectangle(barRight - BAR_W / 2, 68, BAR_W, 5, 0x1c1c30).setDepth(D + 1);
    const p2Fill = this.add.rectangle(barRight, 68, 0, 5, 0xffffff).setOrigin(1, 0.5).setDepth(D + 2);

    this.p2Tab = { nameText: p2Name, barFill: p2Fill, barTrack: p2Track };
  }

  private drawTab(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number,
    w: number, h: number,
    skew: number,
    mirrored: boolean,
    fillColor: number,
    fillAlpha: number
  ): void {
    let pts: { x: number; y: number }[];
    if (!mirrored) {
      pts = [
        { x: x, y: y },
        { x: x + w - skew, y: y },
        { x: x + w, y: y + h },
        { x: x, y: y + h },
      ];
    } else {
      pts = [
        { x: x + skew, y: y },
        { x: x + w, y: y },
        { x: x + w, y: y + h },
        { x: x, y: y + h },
      ];
    }
    g.fillStyle(fillColor, fillAlpha);
    g.fillPoints(pts, true);
    g.lineStyle(1, 0x333355, 0.6);
    g.strokePoints(pts, true);
  }

  // ── BOX GRID ───────────────────────────────────────────────────

  private buildBoxGrid(): void {
    const D = 100;

    // Draw all three groups
    for (let group = 0; group < 3; group++) {
      const gx = GRID_LEFT + group * (GROUP_W + GROUP_GAP);
      const isCenter = group === 1;

      for (let row = 0; row < ROWS; row++) {
        const by = row === 0 ? ROW1_Y : ROW2_Y;

        for (let col = 0; col < COLS; col++) {
          const cx = gx + col * (BOX_W + BOX_GAP) + BOX_W / 2;
          const cy = by + BOX_H / 2;
          const slotIdx = row * COLS + col;

          // Background
          this.add.rectangle(cx, cy, BOX_W, BOX_H, 0x0a0a18, 0.85).setDepth(D);

          // Thin border
          this.add.rectangle(cx, cy, BOX_W, BOX_H)
            .setStrokeStyle(1, 0x222235, 0.7)
            .setFillStyle(0, 0)
            .setDepth(D + 1);

          if (isCenter) {
            const charId = this.characterIds[slotIdx] ?? null;
            const charDef = charId ? CHARACTERS[charId] : null;

            let img: Phaser.GameObjects.Image | null = null;
            if (charDef && this.textures.exists(charDef.assets.selectBg)) {
              img = this.add.image(cx, cy, charDef.assets.selectBg)
                .setDisplaySize(BOX_W, BOX_H)
                .setDepth(D + 2)
                .setAlpha(0.55);
            }
            this.centerImages.push(img);

            // Highlight border (initially hidden)
            const h = this.add.rectangle(cx, cy, BOX_W + 4, BOX_H + 4)
              .setStrokeStyle(2, 0xffffff)
              .setFillStyle(0xffffff, 0.05)
              .setDepth(D + 3)
              .setAlpha(0);
            this.centerHighlights.push(h);
          }
        }
      }
    }

    // Center diamond selector — sits between the two center rows
    const diamondX = GAME_WIDTH / 2;
    const diamondY = ROW1_Y + BOX_H + BOX_GAP / 2;  // between rows

    this.centerDiamond = this.add.graphics().setDepth(110);
    this.diamondText = this.add.text(diamondX, diamondY, '?', {
      fontSize: '14px',
      fontFamily: '"Helvetica Neue",Helvetica,Arial,sans-serif',
      color: '#aaaacc',
    }).setOrigin(0.5).setDepth(111);

    this.drawDiamond(this.centerDiamond, diamondX, diamondY, 22, 0x111124);
  }

  private drawDiamond(g: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number, fillColor: number): void {
    g.clear();
    const pts = [
      { x: cx, y: cy - size },
      { x: cx + size * 0.7, y: cy },
      { x: cx, y: cy + size },
      { x: cx - size * 0.7, y: cy },
    ];
    g.fillStyle(fillColor, 0.92);
    g.fillPoints(pts, true);
    g.lineStyle(1.5, 0x4444aa, 0.8);
    g.strokePoints(pts, true);
  }

  // ── PRESS START ────────────────────────────────────────────────

  private buildPressStart(): void {
    const ps = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 16, 'PRESS START', {
      fontSize: '17px',
      fontFamily: '"Helvetica Neue",Helvetica,Arial,sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      letterSpacing: 10,
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({ targets: ps, alpha: 0.15, duration: 700, yoyo: true, repeat: -1 });
  }

  // ── INPUT ──────────────────────────────────────────────────────

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

  // ── REFRESH ────────────────────────────────────────────────────

  private refreshUI(): void {
    const p1Id = this.characterIds[this.p1Selection];
    const p1Def = p1Id ? CHARACTERS[p1Id] : null;
    const p2Id = this.characterIds[this.p2Selection];
    const p2Def = p2Id ? CHARACTERS[p2Id] : null;

    if (p1Def && this.p1Tab) {
      const r = p1Def.ratings;
      const soul = Math.round((r.speed + r.power + r.range + r.defense + r.steal + r.clutchEnergy) / 6);
      this.p1Tab.nameText.setText(p1Def.name);
      const BAR_MAX = 165;
      const fillW = (soul / 100) * BAR_MAX;
      this.p1Tab.barFill.setDisplaySize(fillW, 5);
      this.p1Tab.barFill.setFillStyle(p1Def.color);
    }

    if (p2Def && this.p2Tab) {
      const r = p2Def.ratings;
      const soul = Math.round((r.speed + r.power + r.range + r.defense + r.steal + r.clutchEnergy) / 6);
      this.p2Tab.nameText.setText(p2Def.name);
      const BAR_MAX = 165;
      const fillW = (soul / 100) * BAR_MAX;
      this.p2Tab.barFill.setDisplaySize(fillW, 5);
      this.p2Tab.barFill.setFillStyle(p2Def.color);
    }

    // Box image alphas
    this.centerImages.forEach((img, i) => img?.setAlpha(i === this.p1Selection ? 1 : 0.5));

    // Highlight animation
    if (this.highlightTween) { this.highlightTween.stop(); this.highlightTween = null; }
    this.centerHighlights.forEach((h, i) => h.setAlpha(i === this.p1Selection ? 1 : 0));
    const selHighlight = this.centerHighlights[this.p1Selection];
    if (selHighlight) {
      this.highlightTween = this.tweens.add({
        targets: selHighlight,
        alpha: { from: 0.5, to: 1 },
        duration: 850,
        yoyo: true,
        repeat: -1,
      });
    }

    // Diamond shows selected character name
    if (p1Def && this.diamondText) {
      this.diamondText.setText(p1Def.name.substring(0, 2).toUpperCase());
    }
  }

  // ── GAME LOOP ──────────────────────────────────────────────────

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
      this.tweens.add({ targets: this.p1Tab?.nameText, alpha: 0.2, duration: 100, yoyo: true, repeat: 2 });
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
