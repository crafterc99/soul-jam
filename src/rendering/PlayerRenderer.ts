import Phaser from 'phaser';
import { PlayerSim } from '../simulation/PlayerSim';
import { PLAYER_RADIUS } from '../config/Constants';
import { PLAYER_STATE } from '../simulation/PlayerStates';
import { CharacterDef } from '../data/types';
import { PlayerEffectsSkinDef } from '../data/skins/types';
import { AnimationLoader } from './AnimationLoader';

export class PlayerRenderer {
  private graphics: Phaser.GameObjects.Graphics;
  private staticSprite: Phaser.GameObjects.Image | null = null;
  private nameText: Phaser.GameObjects.Text;
  private shadow: Phaser.GameObjects.Graphics;

  private sprites: Record<string, { sprite: Phaser.GameObjects.Sprite; key: string }> = {};
  private legacySlides: Record<string, { sprite: Phaser.GameObjects.Sprite; key: string }> = {};

  private flashTimer = 0;

  isDribbleAnimActive = false;

  private effects: PlayerEffectsSkinDef;

  constructor(
    private scene: Phaser.Scene,
    private player: PlayerSim,
    private label: string,
    charDef: CharacterDef,
    effects?: PlayerEffectsSkinDef,
  ) {
    this.effects = effects ?? {
      defenseRing: { color: 0xffff00, alpha: 0.6 },
      ballGlow: { color: 0xff6600, alpha: 0.6 },
      stealRing: { color: 0xff3333, alpha: 0.6 },
      flashRing: { color: 0xffffff, alpha: 0.7 },
      tints: { shooting: 0xffffcc, crossover: 0xccffcc, stealReach: 0xff6666 },
      scales: { base: 0.055, anim: 1.1, defenseSlide: 0.197 },
    };

    const SPRITE_SCALE = this.effects.scales.base;
    const ANIM_SCALE = this.effects.scales.anim;

    this.shadow = scene.add.graphics().setDepth(5);
    this.graphics = scene.add.graphics().setDepth(10);

    // Helper to create 180x180 animation sprite from CharacterDef
    const addAnim = (id: string, animName: string) => {
      const animKey = AnimationLoader.getAnimKey(charDef, animName);
      if (!animKey) return;

      const animDef = charDef.sprites.animations[animName];
      if (!animDef) return;

      const textureKey = animDef.textureKey;
      if (!scene.textures.exists(textureKey)) {
        console.warn(`[PlayerRenderer] Texture '${textureKey}' not found for ${id}`);
        return;
      }
      if (!scene.anims.exists(animKey)) {
        console.warn(`[PlayerRenderer] Animation '${animKey}' not found for ${id}`);
        return;
      }

      const sprite = scene.add.sprite(0, 0, textureKey);
      sprite.setScale(ANIM_SCALE);
      sprite.setOrigin(0.5, 0.97);
      sprite.setDepth(10);
      sprite.setVisible(false);
      this.sprites[id] = { sprite, key: animKey };
    };

    addAnim('runDribble', 'runDribble');
    addAnim('idleDribble', 'idleDribble');
    addAnim('jumpshot', 'jumpshot');
    addAnim('stepback', 'stepback');
    addAnim('crossover', 'crossover');
    addAnim('backpedal', 'backpedal');
    addAnim('shuffle', 'shuffle');
    addAnim('steal', 'steal');

    // Static sprite fallback
    const spriteKey = charDef.sprites.staticKey;
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
    const fx = this.effects;
    const SPRITE_SCALE = fx.scales.base;
    const ANIM_SCALE = fx.scales.anim;

    g.clear();
    this.shadow.clear();

    if (this.flashTimer > 0) this.flashTimer -= 1 / 60;

    const isDefending = p.fsm.isInState(PLAYER_STATE.DEFENDING);
    const isShooting = p.fsm.isInState(PLAYER_STATE.SHOOTING);
    const isStepback = p.fsm.isInState(PLAYER_STATE.STEPBACK);
    const isCrossover = p.fsm.isInState(PLAYER_STATE.CROSSOVER);
    const isStealReach = p.fsm.isInState(PLAYER_STATE.STEAL_REACH);
    const speed = p.velocity.length();
    const isMoving = speed > 10;

    if ((isStepback || isCrossover) && p.stateTimer < 0.03) {
      this.flashTimer = 0.12;
    }

    let isMovingBackward = false;
    if (!p.hasBall && isMoving) {
      const faceDirX = Math.cos(p.facingAngle);
      const faceDirY = Math.sin(p.facingAngle);
      const dot = (p.velocity.x * faceDirX + p.velocity.y * faceDirY) / speed;
      isMovingBackward = dot < -0.3;
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
    } else if (p.hasBall && isMoving && this.sprites['runDribble']) {
      activeId = 'runDribble';
    } else if (p.hasBall && !isMoving && this.sprites['idleDribble']) {
      activeId = 'idleDribble';
    } else if (!p.hasBall && isMoving && isMovingBackward && this.sprites['backpedal']) {
      activeId = 'backpedal';
    } else if (!p.hasBall && isMoving && this.sprites['shuffle']) {
      activeId = 'shuffle';
    } else if (!p.hasBall && isMoving && !this.sprites['shuffle'] && this.sprites['backpedal']) {
      activeId = 'backpedal';
    } else if (!p.hasBall && !isMoving && this.sprites['shuffle']) {
      activeId = 'shuffle';
    }

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

      const yOffset = activeId === 'jumpshot' ? p.jumpHeight : 0;
      sprite.setPosition(p.position.x, p.position.y - yOffset);
      sprite.setFlipX(Math.cos(p.facingAngle) < 0);
      sprite.setScale(ANIM_SCALE);
      sprite.setAlpha(1);

      const anim = sprite.anims;
      if (activeId === 'jumpshot' || activeId === 'stepback' || activeId === 'crossover' || activeId === 'steal') {
        if (!anim.isPlaying && (!anim.currentAnim || anim.currentAnim.key !== key)) {
          sprite.play(key);
        }
      } else if (activeId === 'shuffle' && !isMoving) {
        if (!anim.currentAnim || anim.currentAnim.key !== key) {
          sprite.play(key);
        }
        sprite.anims.pause(sprite.anims.currentFrame ?? undefined);
        sprite.setFrame(0);
      } else if (activeId === 'shuffle' && isMoving) {
        if (!anim.isPlaying || anim.currentAnim?.key !== key) {
          sprite.play(key);
        }
      } else {
        if (!anim.isPlaying || anim.currentAnim?.key !== key) {
          sprite.play(key);
        }
      }

      // Defense ring
      if (!p.hasBall) {
        const pulse = 0.4 + Math.sin(Date.now() * 0.006) * 0.2;
        g.lineStyle(2, fx.defenseRing.color, pulse);
        g.strokeCircle(p.position.x, p.position.y + 2, PLAYER_RADIUS + 4);
      }

      activeDisplayHeight = sprite.displayHeight;

    } else if (this.staticSprite) {
      this.staticSprite.setVisible(true);
      this.staticSprite.setDepth(depthBase);
      this.staticSprite.setPosition(p.position.x, p.position.y);
      this.staticSprite.setFlipX(Math.cos(p.facingAngle) < 0);

      let scale = SPRITE_SCALE;
      let tint = 0xffffff;

      if (isDefending) {
        scale = SPRITE_SCALE * 0.95;
        const pulse = 0.4 + Math.sin(Date.now() * 0.006) * 0.2;
        g.lineStyle(2, fx.defenseRing.color, pulse);
        g.strokeCircle(p.position.x, p.position.y + 2, PLAYER_RADIUS + 4);
      }
      if (isShooting) {
        scale = SPRITE_SCALE * 1.05;
        tint = fx.tints.shooting;
      }
      if (isCrossover) {
        tint = fx.tints.crossover;
        scale = SPRITE_SCALE * 0.97;
      }
      if (isStealReach) {
        tint = fx.tints.stealReach;
        scale = SPRITE_SCALE * 0.93;
      }

      this.staticSprite.setAlpha((isStepback || isCrossover) ? 0.85 : 1);
      this.staticSprite.setScale(scale);
      this.staticSprite.setTint(tint);
      activeDisplayHeight = this.staticSprite.displayHeight;

      if (p.hasBall) {
        const glowPulse = 0.4 + Math.sin(Date.now() * 0.005) * 0.2;
        g.lineStyle(2, fx.ballGlow.color, glowPulse);
        g.strokeCircle(p.position.x, p.position.y - 15, PLAYER_RADIUS + 6);
      }
    } else {
      let bodyColor = p.color;
      if (isShooting) bodyColor = 0xffaa00;
      if (isStealReach) bodyColor = 0xff4444;
      g.fillStyle(bodyColor, (isStepback || isCrossover) ? 0.8 : 1);
      g.fillCircle(p.position.x, p.position.y, PLAYER_RADIUS);
      g.lineStyle(2, 0xffffff, 0.5);
      g.strokeCircle(p.position.x, p.position.y, PLAYER_RADIUS);
      if (isDefending) {
        const pulse = 0.4 + Math.sin(Date.now() * 0.006) * 0.2;
        g.lineStyle(2, fx.defenseRing.color, pulse);
        g.strokeCircle(p.position.x, p.position.y, PLAYER_RADIUS + 6);
      }
      if (p.hasBall) {
        g.lineStyle(2, fx.ballGlow.color, 0.8);
        g.strokeCircle(p.position.x, p.position.y, PLAYER_RADIUS + 3);
      }
    }

    // Burst move flash ring
    if (this.flashTimer > 0) {
      const flashAlpha = this.flashTimer / 0.12;
      const flashRadius = PLAYER_RADIUS + 10 + (1 - flashAlpha) * 15;
      g.lineStyle(3, fx.flashRing.color, flashAlpha * fx.flashRing.alpha);
      g.strokeCircle(p.position.x, p.position.y, flashRadius);
    }

    // Steal reach red ring
    if (isStealReach) {
      const reachAlpha = 0.3 + Math.sin(Date.now() * 0.012) * 0.3;
      g.lineStyle(3, fx.stealRing.color, reachAlpha);
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
