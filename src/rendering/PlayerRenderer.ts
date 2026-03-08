import Phaser from 'phaser';
import { PlayerSim } from '../simulation/PlayerSim';
import { PLAYER_RADIUS } from '../config/Constants';
import { PLAYER_STATE } from '../simulation/PlayerStates';

const SPRITE_SCALE = 0.055;
// All animations use uniform 180x180 cells. Scale 1.1 → ~200px character display.
// Same scale, same origin for every animation — no per-anim recalibration.
const ANIM_SCALE = 1.1;
// Legacy defense slides are still 480x717 from earlier reprocessing
const DEFENSE_SLIDE_SCALE = 0.197;

export class PlayerRenderer {
  private graphics: Phaser.GameObjects.Graphics;
  private staticSprite: Phaser.GameObjects.Image | null = null;
  private nameText: Phaser.GameObjects.Text;
  private shadow: Phaser.GameObjects.Graphics;

  // Animation sprites — all 180x180 use ANIM_SCALE and origin (0.5, 0.97)
  private sprites: Record<string, { sprite: Phaser.GameObjects.Sprite; key: string }> = {};
  // Legacy defense slides (480x717)
  private legacySlides: Record<string, { sprite: Phaser.GameObjects.Sprite; key: string }> = {};

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
    crossoverAnimKey?: string,
    defenseBackpedalAnimKey?: string,
    defenseShuffleAnimKey?: string,
    stealAnimKey?: string,
  ) {
    this.shadow = scene.add.graphics().setDepth(5);
    this.graphics = scene.add.graphics().setDepth(10);

    // Helper to create 180x180 animation sprite
    const addAnim = (id: string, animKey?: string) => {
      if (animKey && scene.anims.exists(animKey)) {
        const sprite = scene.add.sprite(0, 0, animKey.replace('-anim', ''));
        sprite.setScale(ANIM_SCALE);
        sprite.setOrigin(0.5, 0.97);
        sprite.setDepth(10);
        sprite.setVisible(false);
        this.sprites[id] = { sprite, key: animKey };
      }
    };

    addAnim('runDribble', dribbleAnimKey);
    addAnim('idleDribble', idleDribbleAnimKey);
    addAnim('jumpshot', jumpshotAnimKey);
    addAnim('stepback', stepbackAnimKey);
    addAnim('crossover', crossoverAnimKey);
    addAnim('backpedal', defenseBackpedalAnimKey);
    addAnim('shuffle', defenseShuffleAnimKey);
    addAnim('steal', stealAnimKey);

    // Legacy defense slides (480x717, different scale/origin)
    const addLegacy = (id: string, animKey?: string) => {
      if (animKey && scene.anims.exists(animKey)) {
        const sprite = scene.add.sprite(0, 0, animKey.replace('-anim', ''));
        sprite.setScale(DEFENSE_SLIDE_SCALE);
        sprite.setOrigin(0.5, 0.85);
        sprite.setDepth(10);
        sprite.setVisible(false);
        this.legacySlides[id] = { sprite, key: animKey };
      }
    };

    addLegacy('slideLeft', defensiveSlideLeftAnimKey);
    addLegacy('slideRight', defensiveSlideRightAnimKey);

    // Static sprite (no ball / shooting / defending fallback)
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

    // Decide which animation to show (priority order)
    let activeId = '';

    if (isShooting && this.sprites['jumpshot']) {
      activeId = 'jumpshot';
    } else if (isStepback && this.sprites['stepback']) {
      activeId = 'stepback';
    } else if (isCrossover && this.sprites['crossover']) {
      activeId = 'crossover';
    } else if (isStealReach && this.sprites['steal']) {
      activeId = 'steal';
    } else if (isDefending && isMoving && this.sprites['backpedal']) {
      activeId = 'backpedal';
    } else if (isDefending && !isMoving && this.sprites['shuffle']) {
      // Static defense pose: show frame 0 of shuffle (static stance)
      activeId = 'shuffle';
    } else if (isMoving && p.hasBall && !isShooting && !isStepback && !isCrossover && this.sprites['runDribble']) {
      activeId = 'runDribble';
    } else if (!isMoving && p.hasBall && !isShooting && !isStepback && !isCrossover && !isDefending && this.sprites['idleDribble']) {
      activeId = 'idleDribble';
    }

    // Hide ball during dribble anims, stepback (dead ball), jumpshot, and crossover
    this.isDribbleAnimActive = activeId === 'runDribble' || activeId === 'idleDribble' ||
      activeId === 'stepback' || activeId === 'jumpshot' || activeId === 'crossover';

    const depthBase = 10 + (p.position.y / 1000);
    g.setDepth(depthBase);
    this.nameText.setDepth(depthBase + 0.1);

    // Shadow
    this.shadow.fillStyle(0x000000, 0.3);
    this.shadow.fillEllipse(p.position.x, p.position.y + 5, PLAYER_RADIUS * 2.2, PLAYER_RADIUS * 0.8);

    // Hide all sprites first
    if (this.staticSprite) this.staticSprite.setVisible(false);
    for (const id in this.sprites) this.sprites[id].sprite.setVisible(false);
    for (const id in this.legacySlides) this.legacySlides[id].sprite.setVisible(false);

    let activeDisplayHeight = PLAYER_RADIUS * 2;

    if (activeId && this.sprites[activeId]) {
      const { sprite, key } = this.sprites[activeId];
      sprite.setVisible(true);
      sprite.setDepth(depthBase);

      // Jumpshot uses jumpHeight offset
      const yOffset = activeId === 'jumpshot' ? p.jumpHeight : 0;
      sprite.setPosition(p.position.x, p.position.y - yOffset);
      sprite.setFlipX(Math.cos(p.facingAngle) < 0);
      sprite.setScale(ANIM_SCALE);
      sprite.setAlpha(1);

      // Play/hold logic
      const anim = sprite.anims;
      if (activeId === 'jumpshot' || activeId === 'stepback' || activeId === 'crossover' || activeId === 'steal') {
        // Play-once animations: play if not already started
        if (!anim.isPlaying && (!anim.currentAnim || anim.currentAnim.key !== key)) {
          sprite.play(key);
        }
      } else if (activeId === 'shuffle' && !isMoving) {
        // Static defense: show frame 0 only
        if (!anim.currentAnim || anim.currentAnim.key !== key) {
          sprite.play(key);
        }
        sprite.anims.pause(sprite.anims.currentFrame ?? undefined);
        sprite.setFrame(0);
      } else {
        // Looping animations
        if (!anim.isPlaying || anim.currentAnim?.key !== key) {
          sprite.play(key);
        }
      }

      // Defense ring
      if (isDefending) {
        const pulse = 0.4 + Math.sin(Date.now() * 0.006) * 0.2;
        g.lineStyle(2, 0xffff00, pulse);
        g.strokeCircle(p.position.x, p.position.y + 2, PLAYER_RADIUS + 4);
      }

      activeDisplayHeight = sprite.displayHeight;

    } else if (this.staticSprite) {
      // Static sprite fallback (no ball, defending, shooting, etc.)
      this.staticSprite.setVisible(true);
      this.staticSprite.setDepth(depthBase);
      this.staticSprite.setPosition(p.position.x, p.position.y);
      this.staticSprite.setFlipX(Math.cos(p.facingAngle) < 0);

      let scale = SPRITE_SCALE;
      let tint = 0xffffff;

      if (isDefending) {
        scale = SPRITE_SCALE * 0.95;
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
        tint = 0xff6666;
        scale = SPRITE_SCALE * 0.93;
      }

      this.staticSprite.setAlpha((isStepback || isCrossover) ? 0.85 : 1);
      this.staticSprite.setScale(scale);
      this.staticSprite.setTint(tint);
      activeDisplayHeight = this.staticSprite.displayHeight;

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

    // Burst move flash ring
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

    // Stop and reset play-once animations that aren't active
    for (const id of ['jumpshot', 'stepback', 'crossover', 'steal']) {
      if (id !== activeId && this.sprites[id]) {
        const { sprite, key } = this.sprites[id];
        if (sprite.anims.isPlaying) sprite.stop();
        if (sprite.anims.currentAnim?.key === key) {
          sprite.anims.restart();
          sprite.anims.stop();
          sprite.anims.currentAnim = null as any;
        }
      }
    }
    // Stop looping animations that aren't active
    for (const id of ['runDribble', 'idleDribble', 'backpedal', 'shuffle']) {
      if (id !== activeId && this.sprites[id]) {
        const { sprite } = this.sprites[id];
        if (sprite.anims.isPlaying) sprite.stop();
      }
    }

    // Name label
    this.nameText.setPosition(p.position.x, p.position.y - activeDisplayHeight * 0.5 - 8);
  }

  destroy(): void {
    this.graphics.destroy();
    this.shadow.destroy();
    this.staticSprite?.destroy();
    for (const id in this.sprites) this.sprites[id].sprite.destroy();
    for (const id in this.legacySlides) this.legacySlides[id].sprite.destroy();
    this.nameText.destroy();
  }
}
