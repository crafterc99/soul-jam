import Phaser from 'phaser';
import { PlayerSim } from '../simulation/PlayerSim';
import { PLAYER_RADIUS } from '../config/Constants';
import { PLAYER_STATE } from '../simulation/PlayerStates';

const SPRITE_SCALE = 0.055;
// All 480x717 animations use the same scale/origin as the running dribble (the gold standard)
const ANIM_SCALE = 0.197;
// Jumpshot frames are 480x1000 (character reaching up). Scale up so body width ~matches dribble.
// Avg art ~280px wide; at 0.28 displays at 78px (close to dribble's ~79px character width).
const JUMPSHOT_SCALE = 0.28;

export class PlayerRenderer {
  private graphics: Phaser.GameObjects.Graphics;
  private staticSprite: Phaser.GameObjects.Image | null = null;
  private runDribbleSprite: Phaser.GameObjects.Sprite | null = null;
  private idleDribbleSprite: Phaser.GameObjects.Sprite | null = null;
  private defSlideLeftSprite: Phaser.GameObjects.Sprite | null = null;
  private defSlideRightSprite: Phaser.GameObjects.Sprite | null = null;
  private jumpshotSprite: Phaser.GameObjects.Sprite | null = null;
  private stepbackSprite: Phaser.GameObjects.Sprite | null = null;
  private nameText: Phaser.GameObjects.Text;
  private shadow: Phaser.GameObjects.Graphics;

  private hasRunDribble = false;
  private hasIdleDribble = false;
  private hasDefSlideLeft = false;
  private hasDefSlideRight = false;
  private hasJumpshot = false;
  private hasStepback = false;

  private runDribbleKey = '';
  private idleDribbleKey = '';
  private defSlideLeftKey = '';
  private defSlideRightKey = '';
  private jumpshotKey = '';
  private stepbackKey = '';

  // Visual juice timers
  private flashTimer = 0;

  isDribbleAnimActive = false;

  constructor(
    private scene: Phaser.Scene,
    private player: PlayerSim,
    private label: string,
    spriteKey: string,
    dribbleAnimKey?: string,
    idleDribbleAnimKey?: string,
    defensiveSlideLeftAnimKey?: string,
    defensiveSlideRightAnimKey?: string,
    jumpshotAnimKey?: string,
    stepbackAnimKey?: string,
  ) {
    this.shadow = scene.add.graphics().setDepth(5);
    this.graphics = scene.add.graphics().setDepth(10);

    // Running dribble animation (480x717 — the reference animation)
    if (dribbleAnimKey && scene.anims.exists(dribbleAnimKey)) {
      this.runDribbleKey = dribbleAnimKey;
      this.hasRunDribble = true;
      this.runDribbleSprite = scene.add.sprite(0, 0, dribbleAnimKey.replace('-anim', ''));
      this.runDribbleSprite.setScale(ANIM_SCALE);
      this.runDribbleSprite.setOrigin(0.5, 0.85);
      this.runDribbleSprite.setDepth(10);
      this.runDribbleSprite.setVisible(false);
    }

    // Idle dribble animation (480x717 — reprocessed to match dribble frame size)
    if (idleDribbleAnimKey && scene.anims.exists(idleDribbleAnimKey)) {
      this.idleDribbleKey = idleDribbleAnimKey;
      this.hasIdleDribble = true;
      this.idleDribbleSprite = scene.add.sprite(0, 0, idleDribbleAnimKey.replace('-anim', ''));
      this.idleDribbleSprite.setScale(ANIM_SCALE);
      this.idleDribbleSprite.setOrigin(0.5, 0.85);
      this.idleDribbleSprite.setDepth(10);
      this.idleDribbleSprite.setVisible(false);
    }

    // Defensive slide left (480x717 — reprocessed to match dribble frame size)
    if (defensiveSlideLeftAnimKey && scene.anims.exists(defensiveSlideLeftAnimKey)) {
      this.defSlideLeftKey = defensiveSlideLeftAnimKey;
      this.hasDefSlideLeft = true;
      this.defSlideLeftSprite = scene.add.sprite(0, 0, defensiveSlideLeftAnimKey.replace('-anim', ''));
      this.defSlideLeftSprite.setScale(ANIM_SCALE);
      this.defSlideLeftSprite.setOrigin(0.5, 0.85);
      this.defSlideLeftSprite.setDepth(10);
      this.defSlideLeftSprite.setVisible(false);
    }

    // Defensive slide right (480x717 — reprocessed to match dribble frame size)
    if (defensiveSlideRightAnimKey && scene.anims.exists(defensiveSlideRightAnimKey)) {
      this.defSlideRightKey = defensiveSlideRightAnimKey;
      this.hasDefSlideRight = true;
      this.defSlideRightSprite = scene.add.sprite(0, 0, defensiveSlideRightAnimKey.replace('-anim', ''));
      this.defSlideRightSprite.setScale(ANIM_SCALE);
      this.defSlideRightSprite.setOrigin(0.5, 0.85);
      this.defSlideRightSprite.setDepth(10);
      this.defSlideRightSprite.setVisible(false);
    }

    // Jumpshot (480x1150 — taller frames for jumping pose, calibrated scale)
    if (jumpshotAnimKey && scene.anims.exists(jumpshotAnimKey)) {
      this.jumpshotKey = jumpshotAnimKey;
      this.hasJumpshot = true;
      this.jumpshotSprite = scene.add.sprite(0, 0, jumpshotAnimKey.replace('-anim', ''));
      this.jumpshotSprite.setScale(JUMPSHOT_SCALE);
      this.jumpshotSprite.setOrigin(0.5, 0.97);
      this.jumpshotSprite.setDepth(10);
      this.jumpshotSprite.setVisible(false);
    }

    // Stepback (480x717 — same frame size as dribble)
    if (stepbackAnimKey && scene.anims.exists(stepbackAnimKey)) {
      this.stepbackKey = stepbackAnimKey;
      this.hasStepback = true;
      this.stepbackSprite = scene.add.sprite(0, 0, stepbackAnimKey.replace('-anim', ''));
      this.stepbackSprite.setScale(ANIM_SCALE);
      this.stepbackSprite.setOrigin(0.5, 0.85);
      this.stepbackSprite.setDepth(10);
      this.stepbackSprite.setVisible(false);
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

    // Tick flash timer
    if (this.flashTimer > 0) this.flashTimer -= 1 / 60;

    const isDefending = p.fsm.isInState(PLAYER_STATE.DEFENDING);
    const isShooting = p.fsm.isInState(PLAYER_STATE.SHOOTING);
    const isStepback = p.fsm.isInState(PLAYER_STATE.STEPBACK);
    const isCrossover = p.fsm.isInState(PLAYER_STATE.CROSSOVER);
    const isStealReach = p.fsm.isInState(PLAYER_STATE.STEAL_REACH);
    const isMoving = p.velocity.length() > 10;

    // Trigger flash on burst move start
    if ((isStepback || isCrossover) && p.stateTimer < 0.03) {
      this.flashTimer = 0.12;
    }

    // Decide which sprite to show
    const useRunDribble = this.hasRunDribble && isMoving && p.hasBall && !isShooting && !isStepback && !isCrossover;
    const useIdleDribble = this.hasIdleDribble && !isMoving && p.hasBall && !isShooting && !isStepback && !isCrossover && !isDefending;
    const useDefSlideLeft = this.hasDefSlideLeft && isDefending && isMoving && p.velocity.x < 0;
    const useDefSlideRight = this.hasDefSlideRight && isDefending && isMoving && p.velocity.x >= 0;
    const useJumpshot = this.hasJumpshot && isShooting;
    const useStepback = this.hasStepback && isStepback;

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
    if (this.defSlideLeftSprite) this.defSlideLeftSprite.setVisible(false);
    if (this.defSlideRightSprite) this.defSlideRightSprite.setVisible(false);
    if (this.jumpshotSprite) this.jumpshotSprite.setVisible(false);
    if (this.stepbackSprite) this.stepbackSprite.setVisible(false);

    let activeDisplayHeight = PLAYER_RADIUS * 2;

    if (useJumpshot && this.jumpshotSprite) {
      // Jumpshot animation
      this.jumpshotSprite.setVisible(true);
      this.jumpshotSprite.setDepth(depthBase);
      this.jumpshotSprite.setPosition(p.position.x, p.position.y);
      this.jumpshotSprite.setFlipX(Math.cos(p.facingAngle) < 0);
      this.jumpshotSprite.setScale(JUMPSHOT_SCALE);
      this.jumpshotSprite.setOrigin(0.5, 0.97);
      this.jumpshotSprite.setAlpha(1);
      if (!this.jumpshotSprite.anims.isPlaying || this.jumpshotSprite.anims.currentAnim?.key !== this.jumpshotKey) {
        this.jumpshotSprite.play(this.jumpshotKey);
      }
      activeDisplayHeight = this.jumpshotSprite.displayHeight;

    } else if (useStepback && this.stepbackSprite) {
      // Stepback animation
      this.stepbackSprite.setVisible(true);
      this.stepbackSprite.setDepth(depthBase);
      this.stepbackSprite.setPosition(p.position.x, p.position.y);
      this.stepbackSprite.setFlipX(Math.cos(p.facingAngle) < 0);
      this.stepbackSprite.setScale(ANIM_SCALE);
      this.stepbackSprite.setAlpha(0.85);
      if (!this.stepbackSprite.anims.isPlaying || this.stepbackSprite.anims.currentAnim?.key !== this.stepbackKey) {
        this.stepbackSprite.play(this.stepbackKey);
      }
      activeDisplayHeight = this.stepbackSprite.displayHeight;

    } else if (useDefSlideLeft && this.defSlideLeftSprite) {
      // Defensive slide left
      this.defSlideLeftSprite.setVisible(true);
      this.defSlideLeftSprite.setDepth(depthBase);
      this.defSlideLeftSprite.setPosition(p.position.x, p.position.y);
      this.defSlideLeftSprite.setScale(ANIM_SCALE);
      this.defSlideLeftSprite.setAlpha(1);
      if (!this.defSlideLeftSprite.anims.isPlaying || this.defSlideLeftSprite.anims.currentAnim?.key !== this.defSlideLeftKey) {
        this.defSlideLeftSprite.play(this.defSlideLeftKey);
      }
      activeDisplayHeight = this.defSlideLeftSprite.displayHeight;
      // Defense ring
      const pulse = 0.4 + Math.sin(Date.now() * 0.006) * 0.2;
      g.lineStyle(2, 0xffff00, pulse);
      g.strokeCircle(p.position.x, p.position.y + 2, PLAYER_RADIUS + 4);

    } else if (useDefSlideRight && this.defSlideRightSprite) {
      // Defensive slide right
      this.defSlideRightSprite.setVisible(true);
      this.defSlideRightSprite.setDepth(depthBase);
      this.defSlideRightSprite.setPosition(p.position.x, p.position.y);
      this.defSlideRightSprite.setScale(ANIM_SCALE);
      this.defSlideRightSprite.setAlpha(1);
      if (!this.defSlideRightSprite.anims.isPlaying || this.defSlideRightSprite.anims.currentAnim?.key !== this.defSlideRightKey) {
        this.defSlideRightSprite.play(this.defSlideRightKey);
      }
      activeDisplayHeight = this.defSlideRightSprite.displayHeight;
      // Defense ring
      const pulse = 0.4 + Math.sin(Date.now() * 0.006) * 0.2;
      g.lineStyle(2, 0xffff00, pulse);
      g.strokeCircle(p.position.x, p.position.y + 2, PLAYER_RADIUS + 4);

    } else if (useRunDribble && this.runDribbleSprite) {
      // Running dribble animation
      this.runDribbleSprite.setVisible(true);
      this.runDribbleSprite.setDepth(depthBase);
      this.runDribbleSprite.setPosition(p.position.x, p.position.y);
      this.runDribbleSprite.setFlipX(Math.cos(p.facingAngle) < 0);
      this.runDribbleSprite.setScale(ANIM_SCALE);
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
      this.idleDribbleSprite.setScale(ANIM_SCALE);
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
        // Pulsing defense circle
        const pulse = 0.4 + Math.sin(Date.now() * 0.006) * 0.2;
        g.lineStyle(2, 0xffff00, pulse);
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

      if (isStealReach) {
        // Red tint during reach-in freeze
        tint = 0xff6666;
        scale = SPRITE_SCALE * 0.93;
      }

      this.staticSprite.setAlpha((isStepback || isCrossover) ? 0.85 : 1);
      this.staticSprite.setScale(scale);
      this.staticSprite.setTint(tint);
      activeDisplayHeight = this.staticSprite.displayHeight;

      // Ball possession glow when no dribble anim (pulsing)
      if (p.hasBall) {
        const glowPulse = 0.4 + Math.sin(Date.now() * 0.005) * 0.2;
        g.lineStyle(2, 0xff6600, glowPulse);
        g.strokeCircle(p.position.x, p.position.y - 15, PLAYER_RADIUS + 6);
      }
    } else {
      // Fallback: colored circle
      let bodyColor = p.color;
      if (isShooting) bodyColor = 0xffaa00;
      if (isStealReach) bodyColor = 0xff4444;
      g.fillStyle(bodyColor, (isStepback || isCrossover) ? 0.8 : 1);
      g.fillCircle(p.position.x, p.position.y, PLAYER_RADIUS);
      g.lineStyle(2, 0xffffff, 0.5);
      g.strokeCircle(p.position.x, p.position.y, PLAYER_RADIUS);
      if (isDefending) {
        const pulse = 0.4 + Math.sin(Date.now() * 0.006) * 0.2;
        g.lineStyle(2, 0xffff00, pulse);
        g.strokeCircle(p.position.x, p.position.y, PLAYER_RADIUS + 6);
      }
      if (p.hasBall) {
        g.lineStyle(2, 0xff6600, 0.8);
        g.strokeCircle(p.position.x, p.position.y, PLAYER_RADIUS + 3);
      }
    }

    // Burst move flash ring (stepback/crossover activation)
    if (this.flashTimer > 0) {
      const flashAlpha = this.flashTimer / 0.12;
      const flashRadius = PLAYER_RADIUS + 10 + (1 - flashAlpha) * 15;
      g.lineStyle(3, 0xffffff, flashAlpha * 0.7);
      g.strokeCircle(p.position.x, p.position.y, flashRadius);
    }

    // Steal reach red ring
    if (isStealReach) {
      const reachAlpha = 0.3 + Math.sin(Date.now() * 0.012) * 0.3;
      g.lineStyle(3, 0xff3333, reachAlpha);
      g.strokeCircle(p.position.x, p.position.y, PLAYER_RADIUS + 8);
    }

    // Stop animations that aren't active
    if (!useRunDribble && this.runDribbleSprite?.anims.isPlaying) this.runDribbleSprite.stop();
    if (!useIdleDribble && this.idleDribbleSprite?.anims.isPlaying) this.idleDribbleSprite.stop();
    if (!useDefSlideLeft && this.defSlideLeftSprite?.anims.isPlaying) this.defSlideLeftSprite.stop();
    if (!useDefSlideRight && this.defSlideRightSprite?.anims.isPlaying) this.defSlideRightSprite.stop();
    if (!useJumpshot && this.jumpshotSprite?.anims.isPlaying) this.jumpshotSprite.stop();
    if (!useStepback && this.stepbackSprite?.anims.isPlaying) this.stepbackSprite.stop();

    // Name label
    this.nameText.setPosition(p.position.x, p.position.y - activeDisplayHeight * 0.5 - 8);
  }

  destroy(): void {
    this.graphics.destroy();
    this.shadow.destroy();
    this.staticSprite?.destroy();
    this.runDribbleSprite?.destroy();
    this.idleDribbleSprite?.destroy();
    this.defSlideLeftSprite?.destroy();
    this.defSlideRightSprite?.destroy();
    this.jumpshotSprite?.destroy();
    this.stepbackSprite?.destroy();
    this.nameText.destroy();
  }
}
