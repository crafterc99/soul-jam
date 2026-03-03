import Phaser from 'phaser';
import { PlayerSim } from '../simulation/PlayerSim';
import { PLAYER_RADIUS } from '../config/Constants';
import { PLAYER_STATE } from '../simulation/PlayerStates';

const SPRITE_SCALE = 0.055;
// Running dribble frames are 480x717 → match height: 717 * X = 2571 * 0.055 = 141 → X = 0.197
const RUN_DRIBBLE_SCALE = 0.197;
// Idle dribble frames are 320x1434 → match height: 1434 * X = 141 → X = 0.098
const IDLE_DRIBBLE_SCALE = 0.098;

export class PlayerRenderer {
  private graphics: Phaser.GameObjects.Graphics;
  private staticSprite: Phaser.GameObjects.Image | null = null;
  private runDribbleSprite: Phaser.GameObjects.Sprite | null = null;
  private idleDribbleSprite: Phaser.GameObjects.Sprite | null = null;
  private nameText: Phaser.GameObjects.Text;
  private shadow: Phaser.GameObjects.Graphics;

  private hasRunDribble = false;
  private hasIdleDribble = false;
  private runDribbleKey = '';
  private idleDribbleKey = '';

  isDribbleAnimActive = false;

  constructor(
    private scene: Phaser.Scene,
    private player: PlayerSim,
    private label: string,
    spriteKey: string,
    dribbleAnimKey?: string,
    idleDribbleAnimKey?: string,
  ) {
    this.shadow = scene.add.graphics().setDepth(5);
    this.graphics = scene.add.graphics().setDepth(10);

    // Running dribble animation
    if (dribbleAnimKey && scene.anims.exists(dribbleAnimKey)) {
      this.runDribbleKey = dribbleAnimKey;
      this.hasRunDribble = true;
      this.runDribbleSprite = scene.add.sprite(0, 0, dribbleAnimKey.replace('-anim', ''));
      this.runDribbleSprite.setScale(RUN_DRIBBLE_SCALE);
      this.runDribbleSprite.setOrigin(0.5, 0.85);
      this.runDribbleSprite.setDepth(10);
      this.runDribbleSprite.setVisible(false);
    }

    // Idle dribble animation
    if (idleDribbleAnimKey && scene.anims.exists(idleDribbleAnimKey)) {
      this.idleDribbleKey = idleDribbleAnimKey;
      this.hasIdleDribble = true;
      this.idleDribbleSprite = scene.add.sprite(0, 0, idleDribbleAnimKey.replace('-anim', ''));
      this.idleDribbleSprite.setScale(IDLE_DRIBBLE_SCALE);
      this.idleDribbleSprite.setOrigin(0.5, 0.85);
      this.idleDribbleSprite.setDepth(10);
      this.idleDribbleSprite.setVisible(false);
    }

    // Static sprite (no ball / shooting / defending)
    if (scene.textures.exists(spriteKey)) {
      this.staticSprite = scene.add.image(0, 0, spriteKey);
      this.staticSprite.setScale(SPRITE_SCALE);
      this.staticSprite.setOrigin(0.5, 0.85);
      this.staticSprite.setDepth(10);
    }

    this.nameText = scene.add.text(0, 0, label, {
      fontSize: '11px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(11);
  }

  update(): void {
    const p = this.player;
    const g = this.graphics;

    g.clear();
    this.shadow.clear();

    const isRunning = p.fsm.isInState(PLAYER_STATE.RUN);
    const isDefending = p.fsm.isInState(PLAYER_STATE.DEFENDING);
    const isShooting = p.fsm.isInState(PLAYER_STATE.SHOOTING);
    const isStepback = p.fsm.isInState(PLAYER_STATE.STEPBACK);
    const isCrossover = p.fsm.isInState(PLAYER_STATE.CROSSOVER);
    const isMoving = p.velocity.length() > 20;

    // Decide which sprite to show
    const useRunDribble = this.hasRunDribble && isMoving && p.hasBall && !isShooting && !isStepback && !isCrossover;
    const useIdleDribble = this.hasIdleDribble && !isMoving && p.hasBall && !isShooting && !isStepback && !isCrossover && !isDefending;
    this.isDribbleAnimActive = useRunDribble || useIdleDribble;

    const depthBase = 10 + (p.position.y / 1000);
    g.setDepth(depthBase);
    this.nameText.setDepth(depthBase + 0.1);

    // Shadow
    this.shadow.fillStyle(0x000000, 0.3);
    this.shadow.fillEllipse(p.position.x, p.position.y + 5, PLAYER_RADIUS * 2.2, PLAYER_RADIUS * 0.8);

    // Hide all sprites first
    if (this.staticSprite) this.staticSprite.setVisible(false);
    if (this.runDribbleSprite) this.runDribbleSprite.setVisible(false);
    if (this.idleDribbleSprite) this.idleDribbleSprite.setVisible(false);

    let activeDisplayHeight = PLAYER_RADIUS * 2;

    if (useRunDribble && this.runDribbleSprite) {
      // Running dribble animation
      this.runDribbleSprite.setVisible(true);
      this.runDribbleSprite.setDepth(depthBase);
      this.runDribbleSprite.setPosition(p.position.x, p.position.y);
      this.runDribbleSprite.setFlipX(Math.cos(p.facingAngle) < 0);
      this.runDribbleSprite.setScale(RUN_DRIBBLE_SCALE);
      this.runDribbleSprite.setAlpha(1);
      if (!this.runDribbleSprite.anims.isPlaying || this.runDribbleSprite.anims.currentAnim?.key !== this.runDribbleKey) {
        this.runDribbleSprite.play(this.runDribbleKey);
      }
      activeDisplayHeight = this.runDribbleSprite.displayHeight;

    } else if (useIdleDribble && this.idleDribbleSprite) {
      // Idle dribble animation (standing with ball)
      this.idleDribbleSprite.setVisible(true);
      this.idleDribbleSprite.setDepth(depthBase);
      this.idleDribbleSprite.setPosition(p.position.x, p.position.y);
      this.idleDribbleSprite.setFlipX(Math.cos(p.facingAngle) < 0);
      this.idleDribbleSprite.setScale(IDLE_DRIBBLE_SCALE);
      this.idleDribbleSprite.setAlpha(1);
      if (!this.idleDribbleSprite.anims.isPlaying || this.idleDribbleSprite.anims.currentAnim?.key !== this.idleDribbleKey) {
        this.idleDribbleSprite.play(this.idleDribbleKey);
      }
      activeDisplayHeight = this.idleDribbleSprite.displayHeight;

    } else if (this.staticSprite) {
      // Static sprite (no ball, defending, shooting, etc.)
      this.staticSprite.setVisible(true);
      this.staticSprite.setDepth(depthBase);
      this.staticSprite.setPosition(p.position.x, p.position.y);
      this.staticSprite.setFlipX(Math.cos(p.facingAngle) < 0);

      let scale = SPRITE_SCALE;
      let tint = 0xffffff;

      if (isDefending) {
        scale = SPRITE_SCALE * 0.95;
        g.lineStyle(2, 0xffff00, 0.5);
        g.strokeCircle(p.position.x, p.position.y + 2, PLAYER_RADIUS + 4);
      }
      if (isShooting) {
        scale = SPRITE_SCALE * 1.05;
        tint = 0xffffcc;
      }

      if (isCrossover) {
        tint = 0xccffcc;
        scale = SPRITE_SCALE * 0.97;
      }

      this.staticSprite.setAlpha((isStepback || isCrossover) ? 0.85 : 1);
      this.staticSprite.setScale(scale);
      this.staticSprite.setTint(tint);
      activeDisplayHeight = this.staticSprite.displayHeight;

      // Ball possession glow when no dribble anim
      if (p.hasBall) {
        g.lineStyle(2, 0xff6600, 0.6);
        g.strokeCircle(p.position.x, p.position.y - 15, PLAYER_RADIUS + 6);
      }
    } else {
      // Fallback: colored circle
      let bodyColor = p.color;
      if (isShooting) bodyColor = 0xffaa00;
      g.fillStyle(bodyColor, (isStepback || isCrossover) ? 0.8 : 1);
      g.fillCircle(p.position.x, p.position.y, PLAYER_RADIUS);
      g.lineStyle(2, 0xffffff, 0.5);
      g.strokeCircle(p.position.x, p.position.y, PLAYER_RADIUS);
      if (isDefending) {
        g.lineStyle(2, 0xffff00, 0.6);
        g.strokeCircle(p.position.x, p.position.y, PLAYER_RADIUS + 6);
      }
      if (p.hasBall) {
        g.lineStyle(2, 0xff6600, 0.8);
        g.strokeCircle(p.position.x, p.position.y, PLAYER_RADIUS + 3);
      }
    }

    // Stop animations that aren't active
    if (!useRunDribble && this.runDribbleSprite?.anims.isPlaying) this.runDribbleSprite.stop();
    if (!useIdleDribble && this.idleDribbleSprite?.anims.isPlaying) this.idleDribbleSprite.stop();

    // Name label
    this.nameText.setPosition(p.position.x, p.position.y - activeDisplayHeight * 0.5 - 8);
  }

  destroy(): void {
    this.graphics.destroy();
    this.shadow.destroy();
    this.staticSprite?.destroy();
    this.runDribbleSprite?.destroy();
    this.idleDribbleSprite?.destroy();
    this.nameText.destroy();
  }
}
