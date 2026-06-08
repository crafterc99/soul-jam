import Phaser from 'phaser';
import {
  SCENE_CHARACTER_SELECT, SCENE_COURT_SELECT, SCENE_BOOT,
  GAME_WIDTH, GAME_HEIGHT,
} from '../config/Constants';
import { CHARACTERS, getCharacterIds } from '../data/Characters';
import { getStorageService } from '../services/StorageService';
import { CharacterDef } from '../data/types';

// ─── Layout ──────────────────────────────────────────────────────────────────
const GRID_COLS   = 6;
const GRID_ROWS   = 2;
const BOX_SIZE    = 64;
const BOX_GAP     = 4;
const GROUP_GAP   = 32;
const GRID_Y      = 510;

const PANEL_W     = 460;
const PANEL_H     = 155;
const PANEL_CUT   = 55;

// Portrait standing art
const P1_PORT_X   = 255;
const P2_PORT_X   = GAME_WIDTH - 255;
const PORT_FOOT_Y = 500;   // y where feet land (behind grid top)
const PORT_H      = 470;   // display height

// Stats row inside the panel
const STAT_KEYS   = ['soul', 'speed', 'power', 'range', 'defense', 'steal'] as const;
const STAT_LABELS = ['SOUL', 'SPD',   'PWR',   'RNG',   'DEF',    'STL'  ];
const COL_W       = Math.floor((PANEL_W - 6) / STAT_KEYS.length); // ≈ 75

// ─── Player colours ───────────────────────────────────────────────────────────
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
  statTexts: Phaser.GameObjects.Text[];   // [soul, spd, pwr, rng, def, stl]
  color:    number;
  colorHex: string;
  panel:    Phaser.GameObjects.Graphics;
  mirrored: boolean;
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
    this.createBackground();   // DOM video + dark overlay
    this.buildPortraits();     // Large standing art (depth 0, behind everything)
    this.buildTopPanels();     // Metallic IJ2-style stat tabs
    this.buildGrid();          // Character selection grid
    this.buildDiamondCenter(); // Centre "?" diamond
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

  // ─── Background ─────────────────────────────────────────────────────────────

  private createBackground(): void {
    // Put canvas above the DOM video (z-index 2 > 1)
    const canvas = this.sys.game.canvas;
    canvas.style.position = 'relative';
    canvas.style.zIndex   = '2';

    const vid = document.createElement('video');
    vid.src          = 'assets/images/char-select-bg.mp4';
    vid.style.cssText= 'position:fixed;inset:0;width:100vw;height:100vh;object-fit:cover;z-index:1;pointer-events:none';
    vid.loop         = true;
    vid.muted        = false;
    vid.playsInline  = true;
    this.bgVideoEl   = vid;
    document.body.appendChild(vid);
    vid.play().catch(() => { vid.muted = true; vid.play().catch(() => {}); });

    // Phaser dark overlay + diagonal tech lines over the video
    const g = this.add.graphics();
    g.fillStyle(0x06060f, 0.7);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.lineStyle(1, 0x1a2a40, 0.18);
    for (let x = -300; x < GAME_WIDTH + 300; x += 55) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 180, GAME_HEIGHT); g.strokePath();
    }
  }

  // ─── Standing portraits ──────────────────────────────────────────────────────

  private buildPortraits(): void {
    const charIds = getCharacterIds();
    this.p1Portrait = this.makePortrait(charIds[0],  P1_PORT_X);
    this.p2Portrait = this.makePortrait(charIds[1] ?? charIds[0], P2_PORT_X);
  }

  private makePortrait(charId: string | undefined, x: number): Phaser.GameObjects.Image | null {
    if (!charId) return null;
    const key = CHARACTERS[charId]?.assets.portrait;
    if (!key || !this.textures.exists(key)) return null;
    const img = this.add.image(x, PORT_FOOT_Y, key)
      .setOrigin(0.5, 1)
      .setDepth(0)
      .setAlpha(0.88);
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

  // ─── Top panels (Injustice 2-style stat tabs) ────────────────────────────────

  private buildTopPanels(): void {
    this.p1 = this.makePlayerState(1, P1_COLOR, P1_COLOR_HEX);
    this.p2 = this.makePlayerState(2, P2_COLOR, P2_COLOR_HEX);
  }

  private makePlayerState(playerNum: 1 | 2, color: number, colorHex: string): PlayerState {
    const mirrored = playerNum === 2;
    const panelX   = mirrored ? GAME_WIDTH - PANEL_W : 0;

    // ── Draw metallic panel shape ──
    const panel = this.add.graphics();
    this.drawMetallicPanel(panel, mirrored, color);

    // ── "PLAYER N" label ──
    const lx = mirrored ? GAME_WIDTH - 20 : 20;
    const lo = mirrored ? 1 : 0;
    this.add.text(lx, 12, `PLAYER ${playerNum}`, {
      fontSize: '11px', fontFamily: 'monospace',
      color: colorHex, fontStyle: 'bold',
    }).setOrigin(lo, 0).setDepth(12);

    // ── Character name ──
    const nameText = this.add.text(lx, 28, '—', {
      fontSize: '26px', fontFamily: 'monospace',
      color: '#ffffff', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(lo, 0).setDepth(12);

    // ── Stats divider ──
    const statG = this.add.graphics().setDepth(11);
    statG.lineStyle(1, 0x4a5470, 0.55);
    statG.beginPath();
    statG.moveTo(panelX + 4, 70);
    statG.lineTo(panelX + PANEL_W - 4, 70);
    statG.strokePath();

    // Vertical column dividers
    for (let i = 1; i < STAT_KEYS.length; i++) {
      const dx = panelX + 3 + i * COL_W;
      statG.lineStyle(1, 0x2a3050, 0.65);
      statG.beginPath();
      statG.moveTo(dx, 72);
      statG.lineTo(dx, PANEL_H - 10);
      statG.strokePath();
    }

    // ── Stat columns: label + value ──
    const statTexts: Phaser.GameObjects.Text[] = [];
    for (let i = 0; i < STAT_KEYS.length; i++) {
      const cx = panelX + 3 + i * COL_W + COL_W / 2;
      const isSOUL = i === 0;

      this.add.text(cx, 74, STAT_LABELS[i], {
        fontSize: '9px', fontFamily: 'monospace',
        color: isSOUL ? colorHex : '#6c7a93', fontStyle: 'bold',
      }).setOrigin(0.5, 0).setDepth(12);

      const val = this.add.text(cx, 90, '--', {
        fontSize: isSOUL ? '30px' : '20px',
        fontFamily: 'monospace',
        color: isSOUL ? colorHex : '#d8e0f0',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: isSOUL ? 3 : 2,
      }).setOrigin(0.5, 0).setDepth(12);

      statTexts.push(val);
    }

    return {
      cursorIndex: 0, confirmedCharacterId: null,
      cursor: null as unknown as Phaser.GameObjects.Rectangle,
      glow:   null as unknown as Phaser.GameObjects.Rectangle,
      nameText, statTexts, color, colorHex, panel, mirrored,
    };
  }

  private drawMetallicPanel(g: Phaser.GameObjects.Graphics, mirrored: boolean, accent: number): void {
    const w = PANEL_W, h = PANEL_H, cut = PANEL_CUT;

    const verts = mirrored
      ? [
          { x: GAME_WIDTH,         y: 0 },
          { x: GAME_WIDTH,         y: h },
          { x: GAME_WIDTH - w + cut, y: h },
          { x: GAME_WIDTH - w,     y: h - cut },
          { x: GAME_WIDTH - w,     y: 0 },
        ]
      : [
          { x: 0, y: 0 },
          { x: w, y: 0 },
          { x: w, y: h - cut },
          { x: w - cut, y: h },
          { x: 0, y: h },
        ];

    // Outer dark frame
    g.fillStyle(0x080c14, 1);
    g.beginPath();
    verts.forEach((v, i) => i === 0 ? g.moveTo(v.x, v.y) : g.lineTo(v.x, v.y));
    g.closePath(); g.fillPath();

    // Metallic gradient bands
    const bands = 18;
    for (let i = 0; i < bands; i++) {
      const t  = i / (bands - 1);
      const cT = 0x3a4256, cB = 0x14182a;
      const r  = Math.round(((cT>>16)&0xff)*(1-t) + ((cB>>16)&0xff)*t);
      const gn = Math.round(((cT>> 8)&0xff)*(1-t) + ((cB>> 8)&0xff)*t);
      const b  = Math.round(( cT     &0xff)*(1-t) + ( cB     &0xff)*t);
      g.fillStyle((r<<16)|(gn<<8)|b, 1);
      const y0 = (h / bands) * i + 3;
      const y1 = (h / bands) * (i + 1) + 3;
      g.fillRect(mirrored ? GAME_WIDTH - w + 3 : 3, y0, w - 6, y1 - y0);
    }

    // Mask the cut corner back to scene bg
    g.fillStyle(0x0a0a14, 1);
    if (mirrored) {
      g.beginPath();
      g.moveTo(GAME_WIDTH - w, h);
      g.lineTo(GAME_WIDTH - w + cut, h);
      g.lineTo(GAME_WIDTH - w, h - cut);
      g.closePath(); g.fillPath();
    } else {
      g.beginPath();
      g.moveTo(w, h); g.lineTo(w - cut, h); g.lineTo(w, h - cut);
      g.closePath(); g.fillPath();
    }

    // Top highlight line
    g.lineStyle(2, 0x6c7a93, 0.85);
    g.beginPath();
    g.moveTo(mirrored ? GAME_WIDTH - w + 3 : 3, 3);
    g.lineTo(mirrored ? GAME_WIDTH - 3 : w - 3, 3);
    g.strokePath();

    // Accent diagonal cut
    g.lineStyle(3, accent, 1);
    if (mirrored) {
      g.beginPath(); g.moveTo(GAME_WIDTH - w, h - cut); g.lineTo(GAME_WIDTH - w + cut, h); g.strokePath();
    } else {
      g.beginPath(); g.moveTo(w - cut, h); g.lineTo(w, h - cut); g.strokePath();
    }

    // Bottom accent bar (stops before cut)
    g.fillStyle(accent, 0.8);
    if (mirrored) g.fillRect(GAME_WIDTH - w + 3, h - 5, w - 6 - cut + 2, 3);
    else          g.fillRect(3, h - 5, w - 6 - cut + 2, 3);

    // Rivets
    g.fillStyle(0x8893a8, 0.65);
    for (let i = 0; i < 3; i++) {
      const rx = mirrored ? GAME_WIDTH - 14 - i * 18 : 14 + i * 18;
      g.fillCircle(rx, 11, 1.5);
    }
  }

  // ─── Character grid ──────────────────────────────────────────────────────────

  private buildGrid(): void {
    const groupW = GRID_COLS * BOX_SIZE + (GRID_COLS - 1) * BOX_GAP;
    const totalW = 3 * groupW + 2 * GROUP_GAP;
    const startX = (GAME_WIDTH - totalW) / 2;

    const charIds = getCharacterIds();
    let charIdx = 0;

    for (let gi = 0; gi < 3; gi++) {
      const groupX = startX + gi * (groupW + GROUP_GAP);
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const x = groupX + c * (BOX_SIZE + BOX_GAP) + BOX_SIZE / 2;
          const y = GRID_Y  + r * (BOX_SIZE + BOX_GAP) + BOX_SIZE / 2;

          // Reserve the 2-col centre cluster of the middle group for the diamond
          const reserved = gi === 1 && (c === 2 || c === 3);

          if (reserved) {
            const dim = this.add.rectangle(x, y, BOX_SIZE, BOX_SIZE, 0x0a0e16, 0.35)
              .setStrokeStyle(1, 0x14202e);
            this.slots.push({ groupIndex: gi as 0|1|2, col: c, row: r, characterId: null, rect: dim, border: dim, x, y });
            continue;
          }

          const rect   = this.add.rectangle(x, y, BOX_SIZE, BOX_SIZE, 0x0e1420, 0.92).setStrokeStyle(1, 0x2a3142);
          const border = this.add.rectangle(x, y, BOX_SIZE - 4, BOX_SIZE - 4).setStrokeStyle(1, 0x1c2333);

          let characterId: string | null = null;
          if (charIdx < charIds.length) {
            const id  = charIds[charIdx];
            const def = CHARACTERS[id];
            characterId = id;
            // Use the player-select headshot (selectBg) in the small box
            const key = def.assets.selectBg;
            if (this.textures.exists(key)) {
              const img = this.add.image(x, y, key);
              img.setDisplaySize(BOX_SIZE - 4, BOX_SIZE - 4);
              rect.setFillStyle(0x1a2236, 1);
              rect.setStrokeStyle(1, 0x4a5470);
            } else {
              rect.setFillStyle(def.color, 0.8);
            }
            charIdx++;
          }

          this.slots.push({ groupIndex: gi as 0|1|2, col: c, row: r, characterId, rect, border, x, y });
        }
      }
    }

    // Player cursors + glow rings (built last so they sit on top)
    this.p1.glow   = this.add.rectangle(0, 0, BOX_SIZE + 10, BOX_SIZE + 10).setStrokeStyle(4, P1_COLOR, 0.4).setVisible(false).setDepth(5);
    this.p1.cursor = this.add.rectangle(0, 0, BOX_SIZE + 4,  BOX_SIZE + 4 ).setStrokeStyle(2, P1_COLOR, 1).setDepth(6);
    this.p2.glow   = this.add.rectangle(0, 0, BOX_SIZE + 10, BOX_SIZE + 10).setStrokeStyle(4, P2_COLOR, 0.4).setVisible(false).setDepth(5);
    this.p2.cursor = this.add.rectangle(0, 0, BOX_SIZE + 4,  BOX_SIZE + 4 ).setStrokeStyle(2, P2_COLOR, 1).setDepth(6);

    this.tweens.add({ targets: [this.p1.cursor, this.p2.cursor], alpha: 0.3, yoyo: true, repeat: -1, duration: 480 });
  }

  // ─── Centre diamond ──────────────────────────────────────────────────────────

  private buildDiamondCenter(): void {
    const cx   = GAME_WIDTH / 2;
    const cy   = GRID_Y + (GRID_ROWS * BOX_SIZE + (GRID_ROWS - 1) * BOX_GAP) / 2;
    const size = BOX_SIZE * 1.85;
    const ctr  = this.add.container(cx, cy).setDepth(4);
    const g    = this.add.graphics();

    const pts  = [{x:0,y:-size/2},{x:size/2,y:0},{x:0,y:size/2},{x:-size/2,y:0}];
    const ipts = pts.map(p=>({x:p.x*0.91,y:p.y*0.91}));

    g.fillStyle(0x080c16, 1);
    g.beginPath(); pts.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y)); g.closePath(); g.fillPath();
    g.fillStyle(0x20273a, 1);
    g.beginPath(); ipts.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y)); g.closePath(); g.fillPath();

    g.lineStyle(2, 0x6c7a93, 0.85);
    g.beginPath(); g.moveTo(ipts[3].x,ipts[3].y); g.lineTo(ipts[0].x,ipts[0].y); g.lineTo(ipts[1].x,ipts[1].y); g.strokePath();
    g.lineStyle(2, 0x080c16, 0.85);
    g.beginPath(); g.moveTo(ipts[1].x,ipts[1].y); g.lineTo(ipts[2].x,ipts[2].y); g.lineTo(ipts[3].x,ipts[3].y); g.strokePath();

    const q = this.add.text(0, 3, '?', { fontSize: '60px', fontFamily: 'monospace', color: '#d0daea', fontStyle: 'bold', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);
    ctr.add([g, q]);
    this.diamondQ = ctr;
    this.tweens.add({ targets: ctr, scale: 1.06, yoyo: true, duration: 1100, repeat: -1, ease: 'Sine.easeInOut' });
  }

  // ─── Hints ───────────────────────────────────────────────────────────────────

  private buildHints(): void {
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 14,
      'P1: WASD + SPACE   |   P2: Arrows + ENTER   |   ESC: Back', {
        fontSize: '11px', fontFamily: 'monospace', color: '#6a7386',
      }
    ).setOrigin(0.5).setDepth(20);
  }

  // ─── Input ───────────────────────────────────────────────────────────────────

  private setupInput(): void {
    this.input.keyboard?.on('keydown-W', () => this.move(this.p1,  0, -1));
    this.input.keyboard?.on('keydown-S', () => this.move(this.p1,  0,  1));
    this.input.keyboard?.on('keydown-A', () => this.move(this.p1, -1,  0));
    this.input.keyboard?.on('keydown-D', () => this.move(this.p1,  1,  0));
    this.input.keyboard?.on('keydown-SPACE', () => this.confirm(this.p1));

    this.input.keyboard?.on('keydown-UP',    () => this.move(this.p2,  0, -1));
    this.input.keyboard?.on('keydown-DOWN',  () => this.move(this.p2,  0,  1));
    this.input.keyboard?.on('keydown-LEFT',  () => this.move(this.p2, -1,  0));
    this.input.keyboard?.on('keydown-RIGHT', () => this.move(this.p2,  1,  0));
    this.input.keyboard?.on('keydown-ENTER', () => this.confirm(this.p2));

    this.input.keyboard?.on('keydown-ESC', () => { this.removeVideo(); this.scene.start(SCENE_BOOT); });

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
    let nextCol = cur.col + dx, nextRow = cur.row + dy;
    let nextGroup: 0|1|2 = cur.groupIndex;

    if (nextCol < 0) {
      if (cur.groupIndex > 0) { nextGroup = (cur.groupIndex - 1) as 0|1|2; nextCol = GRID_COLS - 1; }
      else nextCol = 0;
    } else if (nextCol >= GRID_COLS) {
      if (cur.groupIndex < 2) { nextGroup = (cur.groupIndex + 1) as 0|1|2; nextCol = 0; }
      else nextCol = GRID_COLS - 1;
    }
    if (nextRow < 0) nextRow = 0;
    if (nextRow >= GRID_ROWS) nextRow = GRID_ROWS - 1;

    const idx = this.slots.findIndex(s => s.groupIndex === nextGroup && s.col === nextCol && s.row === nextRow);
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
    const vals = [soul, r.speed, r.power, r.range, r.defense, r.steal];
    vals.forEach((v, i) => player.statTexts[i]?.setText(String(v)));

    // Update the standing portrait
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
        this.advance(this.p1.confirmedCharacterId, p2id);
      }
    } else {
      if (this.p1.confirmedCharacterId && this.p2.confirmedCharacterId) {
        this.advance(this.p1.confirmedCharacterId, this.p2.confirmedCharacterId);
      }
    }
  }

  private advance(p1Id: string, p2Id: string): void {
    this.removeVideo();
    this.scene.start(SCENE_COURT_SELECT, { mode: this.mode, p1CharacterId: p1Id, p2CharacterId: p2Id });
  }

  // ─── Cleanup ─────────────────────────────────────────────────────────────────

  private removeVideo(): void {
    if (this.bgVideoEl) {
      this.bgVideoEl.pause();
      this.bgVideoEl.remove();
      this.bgVideoEl = null;
    }
    const canvas = this.sys.game.canvas;
    canvas.style.position = '';
    canvas.style.zIndex   = '';
  }

  shutdown(): void { this.removeVideo(); }
}
