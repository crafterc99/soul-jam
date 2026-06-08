import Phaser from 'phaser';
import {
  SCENE_CHARACTER_SELECT, SCENE_COURT_SELECT, SCENE_BOOT,
  GAME_WIDTH, GAME_HEIGHT,
} from '../config/Constants';
import { CHARACTERS, getCharacterIds } from '../data/Characters';
import { getStorageService } from '../services/StorageService';
import { CharacterDef } from '../data/types';

// ─── Layout ──────────────────────────────────────────────────────────────────
const GRID_COLS  = 6;
const GRID_ROWS  = 2;
const BOX_SIZE   = 64;
const BOX_GAP    = 4;
const GROUP_GAP  = 32;
const GRID_Y     = 510;

// Metallic corner tabs — parallelogram shape, hugging top corners
const PANEL_W    = 340;   // width at the top edge
const PANEL_H    = 118;   // height
const PANEL_CUT  = 58;    // how far the angled edge cuts inward at the bottom

// Standing portrait art — match IJ2 proportions
const PORT_FOOT_Y = GRID_Y - 4;   // feet just above the grid
const PORT_H      = 480;           // display height in pixels
const P1_PORT_X   = 300;           // x centre for P1 (left side)
const P2_PORT_X   = GAME_WIDTH - 300; // x centre for P2 (right side)

// ─── Stat definitions ────────────────────────────────────────────────────────
const STAT_LABELS = ['SOUL', 'SPD', 'PWR', 'RNG', 'DEF', 'STL'] as const;
const SOUL_COL_W  = 72;                                    // wider for the "LVL" equivalent
const STAT_COL_W  = Math.floor((PANEL_W - SOUL_COL_W) / 5); // ≈ 53 per remaining stat

// Column centre X relative to panel left edge
function statColCX(i: number): number {
  return i === 0
    ? SOUL_COL_W / 2
    : SOUL_COL_W + (i - 1) * STAT_COL_W + STAT_COL_W / 2;
}

// ─── Player palette ──────────────────────────────────────────────────────────
const P1_COLOR     = 0x00d4ff;
const P2_COLOR     = 0xff3b6e;
const P1_COLOR_HEX = '#00d4ff';
const P2_COLOR_HEX = '#ff3b6e';

// ─── Types ────────────────────────────────────────────────────────────────────
interface GridSlot {
  groupIndex: 0 | 1 | 2;
  col: number;
  row: number;
  characterId: string | null;
  rect:   Phaser.GameObjects.Rectangle;
  border: Phaser.GameObjects.Rectangle;
  x: number;
  y: number;
}

interface PlayerState {
  cursorIndex:          number;
  confirmedCharacterId: string | null;
  cursor: Phaser.GameObjects.Rectangle;
  glow:   Phaser.GameObjects.Rectangle;
  nameText:  Phaser.GameObjects.Text;
  statTexts: Phaser.GameObjects.Text[];  // [soul, spd, pwr, rng, def, stl]
  color:    number;
  colorHex: string;
  mirrored: boolean;
  panel:    Phaser.GameObjects.Graphics;
}

// ─── Scene ────────────────────────────────────────────────────────────────────
export class CharacterSelectScene extends Phaser.Scene {
  private mode: 'cpu' | 'local2p' = 'cpu';
  private slots: GridSlot[] = [];
  private p1!: PlayerState;
  private p2!: PlayerState;
  private bgVideoEl: HTMLVideoElement | null = null;
  private p1Portrait: Phaser.GameObjects.Image | null = null;
  private p2Portrait: Phaser.GameObjects.Image | null = null;
  private gamepadNavTimer = 0;
  private diamondQ: Phaser.GameObjects.Container | null = null;

  constructor() { super({ key: SCENE_CHARACTER_SELECT }); }

  init(data: { mode?: 'cpu' | 'local2p' }): void {
    this.mode  = data?.mode ?? 'cpu';
    this.slots = [];
  }

  create(): void {
    // No camera background — video shows through the transparent canvas
    this.cameras.main.setBackgroundColor(0x00000000);

    this.startVideo();
    this.buildPortraits();     // depth 0 — behind everything
    this.buildTopPanels();     // metallic corner tabs
    this.buildGrid();          // character roster grid
    this.buildDiamondCenter(); // centre diamond
    this.buildHints();
    this.setupInput();

    const charIds = getCharacterIds();
    const i0 = this.slots.findIndex(s => s.characterId === charIds[0]);
    const i1 = this.slots.findIndex(s => s.characterId === (charIds[1] ?? charIds[0]));
    this.p1.cursorIndex = i0 >= 0 ? i0 : 0;
    this.p2.cursorIndex = i1 >= 0 ? i1 : (i0 >= 0 ? i0 : 0);

    this.refreshCursors();
    this.refreshPlayerInfo(this.p1);
    this.refreshPlayerInfo(this.p2);
  }

  // ─── Video ───────────────────────────────────────────────────────────────────

  private startVideo(): void {
    const canvas = this.sys.game.canvas;
    canvas.style.position = 'relative';
    canvas.style.zIndex   = '2';

    const vid = document.createElement('video');
    vid.src         = 'assets/images/char-select-bg.mp4';
    vid.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;object-fit:cover;z-index:1;pointer-events:none';
    vid.loop        = true;
    vid.muted       = false;
    vid.playsInline = true;
    this.bgVideoEl  = vid;
    document.body.appendChild(vid);
    vid.play().catch(() => { vid.muted = true; vid.play().catch(() => {}); });
  }

  // ─── Standing portraits ──────────────────────────────────────────────────────

  private buildPortraits(): void {
    const ids = getCharacterIds();
    this.p1Portrait = this.spawnPortrait(ids[0],                P1_PORT_X, false);
    this.p2Portrait = this.spawnPortrait(ids[1] ?? ids[0], P2_PORT_X, true);
  }

  private spawnPortrait(charId: string, x: number, flipX: boolean): Phaser.GameObjects.Image | null {
    const key = CHARACTERS[charId]?.assets.portrait;
    if (!key || !this.textures.exists(key)) return null;
    const img = this.add.image(x, PORT_FOOT_Y, key)
      .setOrigin(0.5, 1)
      .setDepth(0)
      .setAlpha(0.92)
      .setFlipX(flipX);
    img.setScale(PORT_H / img.height);
    return img;
  }

  private updatePortrait(portrait: Phaser.GameObjects.Image | null, charId: string): void {
    if (!portrait) return;
    const key = CHARACTERS[charId]?.assets.portrait;
    if (!key || !this.textures.exists(key)) { portrait.setVisible(false); return; }
    portrait.setTexture(key);
    portrait.setScale(PORT_H / portrait.height);
    portrait.setVisible(true);
  }

  // ─── Metallic corner tabs ────────────────────────────────────────────────────

  private buildTopPanels(): void {
    this.p1 = this.makePlayerPanel(1, P1_COLOR, P1_COLOR_HEX);
    this.p2 = this.makePlayerPanel(2, P2_COLOR, P2_COLOR_HEX);
  }

  private makePlayerPanel(playerNum: 1 | 2, color: number, colorHex: string): PlayerState {
    const mirrored = playerNum === 2;
    const panelX   = mirrored ? GAME_WIDTH - PANEL_W : 0;

    const panel = this.add.graphics();
    this.drawMetallicTab(panel, mirrored, color);

    // Character name — large, top of panel
    const nameX  = mirrored ? panelX + PANEL_W - PANEL_CUT - 8 : panelX + 12;
    const nameOX = mirrored ? 1 : 0;
    const nameText = this.add.text(nameX, 8, '—', {
      fontSize: '22px',
      fontFamily: '"Arial Narrow",Arial,sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(nameOX, 0).setDepth(12);

    // Thin coloured separator under name
    const sepG = this.add.graphics().setDepth(11);
    sepG.fillStyle(color, 0.7);
    if (mirrored) sepG.fillRect(panelX + PANEL_CUT + 2, 36, PANEL_W - PANEL_CUT - 4, 2);
    else          sepG.fillRect(panelX + 2, 36, PANEL_W - PANEL_CUT - 4, 2);

    // Vertical dividers between stat columns
    const divG = this.add.graphics().setDepth(11);
    divG.lineStyle(1, 0x3a4560, 0.7);
    // First divider: after SOUL column
    const divAfterSoul = panelX + (mirrored ? PANEL_W - SOUL_COL_W : SOUL_COL_W);
    divG.beginPath(); divG.moveTo(divAfterSoul, 40); divG.lineTo(divAfterSoul, PANEL_H - 8); divG.strokePath();
    // Other dividers
    for (let i = 1; i < 5; i++) {
      const dx = mirrored
        ? panelX + PANEL_W - SOUL_COL_W - i * STAT_COL_W
        : panelX + SOUL_COL_W + i * STAT_COL_W;
      divG.beginPath(); divG.moveTo(dx, 40); divG.lineTo(dx, PANEL_H - 8); divG.strokePath();
    }

    // Stat labels + value texts
    const statTexts: Phaser.GameObjects.Text[] = [];
    for (let i = 0; i < STAT_LABELS.length; i++) {
      // For mirrored panels, reverse the column order so SOUL is always on the outer edge
      const colIdx = mirrored ? STAT_LABELS.length - 1 - i : i;
      const cx     = panelX + (mirrored ? PANEL_W - statColCX(colIdx) : statColCX(i));
      const isSOUL = i === 0;

      this.add.text(cx, 41, STAT_LABELS[i], {
        fontSize: '8px',
        fontFamily: 'monospace',
        color: isSOUL ? colorHex : '#8090aa',
        fontStyle: 'bold',
      }).setOrigin(0.5, 0).setDepth(12);

      const val = this.add.text(cx, 54, '--', {
        fontSize:     isSOUL ? '34px' : '20px',
        fontFamily:   'monospace',
        fontStyle:    'bold',
        color:        isSOUL ? colorHex : '#d8e4f0',
        stroke:       '#000000',
        strokeThickness: isSOUL ? 4 : 2,
      }).setOrigin(0.5, 0).setDepth(12);

      statTexts.push(val);
    }

    return {
      cursorIndex: 0, confirmedCharacterId: null,
      cursor: null as unknown as Phaser.GameObjects.Rectangle,
      glow:   null as unknown as Phaser.GameObjects.Rectangle,
      nameText, statTexts, color, colorHex, mirrored, panel,
    };
  }

  private drawMetallicTab(g: Phaser.GameObjects.Graphics, mirrored: boolean, accent: number): void {
    const w = PANEL_W, h = PANEL_H, cut = PANEL_CUT;

    // Parallelogram: top edge full width, bottom edge cut inward on the inner side
    //   P1: [0,0] [w,0] [w-cut,h] [0,h]
    //   P2: [GW,0] [GW-w,0] [GW-w+cut,h] [GW,h]
    const verts = mirrored
      ? [{ x: GAME_WIDTH, y: 0 }, { x: GAME_WIDTH - w, y: 0 },
         { x: GAME_WIDTH - w + cut, y: h }, { x: GAME_WIDTH, y: h }]
      : [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w - cut, y: h }, { x: 0, y: h }];

    // Base dark fill
    g.fillStyle(0x080c18, 0.9);
    g.beginPath();
    verts.forEach((v, i) => i === 0 ? g.moveTo(v.x, v.y) : g.lineTo(v.x, v.y));
    g.closePath(); g.fillPath();

    // Lighter top strip (metallic sheen)
    const stripH = 38;
    const stripVerts = [verts[0], verts[1],
      { x: verts[1].x + (mirrored ? cut * (stripH / h) : -cut * (stripH / h)), y: stripH },
      { x: verts[0].x, y: stripH }];
    g.fillStyle(0x232d42, 0.75);
    g.beginPath();
    stripVerts.forEach((v, i) => i === 0 ? g.moveTo(v.x, v.y) : g.lineTo(v.x, v.y));
    g.closePath(); g.fillPath();

    // Top highlight
    g.lineStyle(2, 0x6a7a96, 0.85);
    g.beginPath(); g.moveTo(verts[0].x, 2); g.lineTo(verts[1].x, 2); g.strokePath();

    // Diagonal accent edge (inner angled edge, player colour)
    g.lineStyle(3, accent, 1);
    if (mirrored) {
      g.beginPath(); g.moveTo(GAME_WIDTH - w, 0); g.lineTo(GAME_WIDTH - w + cut, h); g.strokePath();
    } else {
      g.beginPath(); g.moveTo(w, 0); g.lineTo(w - cut, h); g.strokePath();
    }

    // Bottom accent bar (horizontal, stops before the diagonal)
    g.fillStyle(accent, 0.7);
    if (mirrored) g.fillRect(GAME_WIDTH - w + cut, h - 4, w - cut, 3);
    else          g.fillRect(0, h - 4, w - cut, 3);

    // Rivets along top
    g.fillStyle(0x8893a8, 0.6);
    for (let i = 0; i < 3; i++) {
      const rx = mirrored ? GAME_WIDTH - 12 - i * 16 : 12 + i * 16;
      g.fillCircle(rx, 10, 1.5);
    }
  }

  // ─── Grid ────────────────────────────────────────────────────────────────────

  private buildGrid(): void {
    const groupW = GRID_COLS * BOX_SIZE + (GRID_COLS - 1) * BOX_GAP;
    const totalW = 3 * groupW + 2 * GROUP_GAP;
    const startX = (GAME_WIDTH - totalW) / 2;

    const charIds = getCharacterIds();
    let charIdx   = 0;

    for (let gi = 0; gi < 3; gi++) {
      const gx = startX + gi * (groupW + GROUP_GAP);
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const x  = gx + c * (BOX_SIZE + BOX_GAP) + BOX_SIZE / 2;
          const y  = GRID_Y + r * (BOX_SIZE + BOX_GAP) + BOX_SIZE / 2;
          const reserved = gi === 1 && (c === 2 || c === 3);

          if (reserved) {
            const dim = this.add.rectangle(x, y, BOX_SIZE, BOX_SIZE, 0x060a12, 0.5)
              .setStrokeStyle(1, 0x14202e);
            this.slots.push({ groupIndex: gi as 0|1|2, col: c, row: r, characterId: null, rect: dim, border: dim, x, y });
            continue;
          }

          const rect   = this.add.rectangle(x, y, BOX_SIZE, BOX_SIZE, 0x0c1220, 0.94).setStrokeStyle(1, 0x2a3448);
          const border = this.add.rectangle(x, y, BOX_SIZE - 4, BOX_SIZE - 4).setStrokeStyle(1, 0x1c2538);

          let characterId: string | null = null;
          if (charIdx < charIds.length) {
            const id  = charIds[charIdx];
            const def = CHARACTERS[id];
            characterId = id;
            const key   = def.assets.selectBg;  // player-select headshot for box
            if (this.textures.exists(key)) {
              this.add.image(x, y, key).setDisplaySize(BOX_SIZE - 4, BOX_SIZE - 4);
              rect.setFillStyle(0x18243a, 1).setStrokeStyle(1, 0x4a5a70);
            } else {
              rect.setFillStyle(def.color, 0.7);
            }
            charIdx++;
          }

          this.slots.push({ groupIndex: gi as 0|1|2, col: c, row: r, characterId, rect, border, x, y });
        }
      }
    }

    // Cursors — created last so they sit on top of boxes
    this.p1.glow   = this.add.rectangle(0, 0, BOX_SIZE + 10, BOX_SIZE + 10).setStrokeStyle(4, P1_COLOR, 0.45).setVisible(false).setDepth(5);
    this.p1.cursor = this.add.rectangle(0, 0, BOX_SIZE + 4,  BOX_SIZE + 4 ).setStrokeStyle(2.5, P1_COLOR).setDepth(6);
    this.p2.glow   = this.add.rectangle(0, 0, BOX_SIZE + 10, BOX_SIZE + 10).setStrokeStyle(4, P2_COLOR, 0.45).setVisible(false).setDepth(5);
    this.p2.cursor = this.add.rectangle(0, 0, BOX_SIZE + 4,  BOX_SIZE + 4 ).setStrokeStyle(2.5, P2_COLOR).setDepth(6);

    this.tweens.add({ targets: [this.p1.cursor, this.p2.cursor], alpha: 0.3, yoyo: true, repeat: -1, duration: 480 });
  }

  // ─── Diamond ─────────────────────────────────────────────────────────────────

  private buildDiamondCenter(): void {
    const cx   = GAME_WIDTH / 2;
    const cy   = GRID_Y + (GRID_ROWS * BOX_SIZE + (GRID_ROWS - 1) * BOX_GAP) / 2;
    const size = BOX_SIZE * 1.85;
    const ctr  = this.add.container(cx, cy).setDepth(4);
    const g    = this.add.graphics();

    const pts  = [{ x: 0, y: -size/2 }, { x: size/2, y: 0 }, { x: 0, y: size/2 }, { x: -size/2, y: 0 }];
    const ipts = pts.map(p => ({ x: p.x * 0.9, y: p.y * 0.9 }));

    g.fillStyle(0x060a12, 1);
    g.beginPath(); pts.forEach((p,i) => i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y)); g.closePath(); g.fillPath();
    g.fillStyle(0x1c2438, 1);
    g.beginPath(); ipts.forEach((p,i) => i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y)); g.closePath(); g.fillPath();
    g.lineStyle(2, 0x607088, 0.9);
    g.beginPath(); g.moveTo(ipts[3].x,ipts[3].y); g.lineTo(ipts[0].x,ipts[0].y); g.lineTo(ipts[1].x,ipts[1].y); g.strokePath();
    g.lineStyle(2, 0x060a12, 0.9);
    g.beginPath(); g.moveTo(ipts[1].x,ipts[1].y); g.lineTo(ipts[2].x,ipts[2].y); g.lineTo(ipts[3].x,ipts[3].y); g.strokePath();

    const q = this.add.text(0, 4, '?', { fontSize: '60px', fontFamily: 'monospace', color: '#ccd8ea', fontStyle: 'bold', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);
    ctr.add([g, q]);
    this.diamondQ = ctr;
    this.tweens.add({ targets: ctr, scale: 1.06, yoyo: true, duration: 1100, repeat: -1, ease: 'Sine.easeInOut' });
  }

  // ─── Hints ───────────────────────────────────────────────────────────────────

  private buildHints(): void {
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 12,
      'P1: WASD + SPACE   |   P2: Arrows + ENTER   |   ESC: Back', {
        fontSize: '11px', fontFamily: 'monospace', color: '#606878',
      }
    ).setOrigin(0.5).setDepth(20);
  }

  // ─── Input ───────────────────────────────────────────────────────────────────

  private setupInput(): void {
    this.input.keyboard?.on('keydown-W',     () => this.move(this.p1,  0, -1));
    this.input.keyboard?.on('keydown-S',     () => this.move(this.p1,  0,  1));
    this.input.keyboard?.on('keydown-A',     () => this.move(this.p1, -1,  0));
    this.input.keyboard?.on('keydown-D',     () => this.move(this.p1,  1,  0));
    this.input.keyboard?.on('keydown-SPACE', () => this.confirm(this.p1));

    this.input.keyboard?.on('keydown-UP',    () => this.move(this.p2,  0, -1));
    this.input.keyboard?.on('keydown-DOWN',  () => this.move(this.p2,  0,  1));
    this.input.keyboard?.on('keydown-LEFT',  () => this.move(this.p2, -1,  0));
    this.input.keyboard?.on('keydown-RIGHT', () => this.move(this.p2,  1,  0));
    this.input.keyboard?.on('keydown-ENTER', () => this.confirm(this.p2));
    this.input.keyboard?.on('keydown-ESC',   () => { this.removeVideo(); this.scene.start(SCENE_BOOT); });

    this.input.gamepad?.on('down', (_pad: Phaser.Input.Gamepad.Gamepad, btn: Phaser.Input.Gamepad.Button) => {
      if (btn.index === 0)  this.confirm(this.p1);
      if (btn.index === 1)  { this.removeVideo(); this.scene.start(SCENE_BOOT); }
      if (btn.index === 12) this.move(this.p1,  0, -1);
      if (btn.index === 13) this.move(this.p1,  0,  1);
      if (btn.index === 14) this.move(this.p1, -1,  0);
      if (btn.index === 15) this.move(this.p1,  1,  0);
    });
  }

  update(_t: number, delta: number): void {
    if (this.gamepadNavTimer > 0) { this.gamepadNavTimer -= delta; return; }
    const pad = this.input.gamepad?.getPad(0);
    if (pad?.connected) {
      const lx = pad.leftStick.x, ly = pad.leftStick.y;
      if      (lx < -0.5) { this.move(this.p1, -1,  0); this.gamepadNavTimer = 220; }
      else if (lx >  0.5) { this.move(this.p1,  1,  0); this.gamepadNavTimer = 220; }
      else if (ly < -0.5) { this.move(this.p1,  0, -1); this.gamepadNavTimer = 220; }
      else if (ly >  0.5) { this.move(this.p1,  0,  1); this.gamepadNavTimer = 220; }
    }
  }

  // ─── Selection logic ─────────────────────────────────────────────────────────

  private move(player: PlayerState, dx: number, dy: number): void {
    const cur = this.slots[player.cursorIndex];
    let nc = cur.col + dx, nr = cur.row + dy;
    let ng: 0|1|2 = cur.groupIndex;

    if      (nc < 0 && ng > 0) { ng = (ng - 1) as 0|1|2; nc = GRID_COLS - 1; }
    else if (nc < 0)            nc = 0;
    else if (nc >= GRID_COLS && ng < 2) { ng = (ng + 1) as 0|1|2; nc = 0; }
    else if (nc >= GRID_COLS)   nc = GRID_COLS - 1;

    if (nr < 0) nr = 0;
    if (nr >= GRID_ROWS) nr = GRID_ROWS - 1;

    const idx = this.slots.findIndex(s => s.groupIndex === ng && s.col === nc && s.row === nr);
    if (idx >= 0) { player.cursorIndex = idx; this.refreshCursors(); this.refreshPlayerInfo(player); }
  }

  private refreshCursors(): void {
    const s1 = this.slots[this.p1.cursorIndex];
    this.p1.cursor.setPosition(s1.x, s1.y);
    this.p1.glow.setPosition(s1.x, s1.y).setVisible(!!this.p1.confirmedCharacterId);

    const s2 = this.slots[this.p2.cursorIndex];
    this.p2.cursor.setPosition(s2.x, s2.y);
    this.p2.glow.setPosition(s2.x, s2.y).setVisible(!!this.p2.confirmedCharacterId);
  }

  private refreshPlayerInfo(player: PlayerState): void {
    const slot = this.slots[player.cursorIndex];
    if (slot?.characterId) {
      this.applyPlayerInfo(player, CHARACTERS[slot.characterId]);
    } else {
      player.nameText.setText('—');
      player.statTexts.forEach(t => t.setText('--'));
    }
  }

  private applyPlayerInfo(player: PlayerState, def: CharacterDef): void {
    player.nameText.setText(def.name.toUpperCase());

    const r    = def.ratings;
    const soul = Math.round((r.speed + r.power + r.range + r.defense + r.steal + r.clutchEnergy) / 6);
    [soul, r.speed, r.power, r.range, r.defense, r.steal]
      .forEach((v, i) => player.statTexts[i]?.setText(String(v)));

    const portrait = player === this.p1 ? this.p1Portrait : this.p2Portrait;
    this.updatePortrait(portrait, def.id);
  }

  private confirm(player: PlayerState): void {
    const slot = this.slots[player.cursorIndex];
    if (!slot?.characterId) return;

    const storage = getStorageService();
    const def     = CHARACTERS[slot.characterId];
    if (!storage.isCharacterUnlocked(slot.characterId) && !def?.unlocked) {
      this.tweens.add({ targets: player.cursor, alpha: 0.1, yoyo: true, repeat: 2, duration: 100 });
      return;
    }

    player.confirmedCharacterId = slot.characterId;
    this.refreshCursors();
    this.tweens.add({ targets: player.glow, scale: 1.18, yoyo: true, repeat: 1, duration: 140 });
    this.tryAdvance();
  }

  private tryAdvance(): void {
    if (this.mode === 'cpu') {
      if (this.p1.confirmedCharacterId) {
        const ids  = getCharacterIds();
        const p2id = ids.find(id => id !== this.p1.confirmedCharacterId) ?? ids[0];
        this.doAdvance(this.p1.confirmedCharacterId, p2id);
      }
    } else if (this.p1.confirmedCharacterId && this.p2.confirmedCharacterId) {
      this.doAdvance(this.p1.confirmedCharacterId, this.p2.confirmedCharacterId);
    }
  }

  private doAdvance(p1Id: string, p2Id: string): void {
    this.removeVideo();
    this.scene.start(SCENE_COURT_SELECT, { mode: this.mode, p1CharacterId: p1Id, p2CharacterId: p2Id });
  }

  // ─── Cleanup ─────────────────────────────────────────────────────────────────

  private removeVideo(): void {
    if (this.bgVideoEl) { this.bgVideoEl.pause(); this.bgVideoEl.remove(); this.bgVideoEl = null; }
    const c = this.sys.game.canvas;
    c.style.position = ''; c.style.zIndex = '';
  }

  shutdown(): void { this.removeVideo(); }
}
