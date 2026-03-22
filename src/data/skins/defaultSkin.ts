import { SkinBundle } from './types';
import { GAME_WIDTH, GAME_HEIGHT } from '../../config/Constants';

export const DEFAULT_SKIN: SkinBundle = {
  id: 'default',
  name: 'Default',

  // ─── Court ─────────────────────────────────────────────────────
  court: {
    id: 'default-court',
    floor: {
      key: 'court',
      origin: { x: 0.5, y: 0.5 },
      size: { width: GAME_WIDTH, height: GAME_HEIGHT },
      depth: 0,
    },
    colors: {
      line: 0xffffff,
      paint: 0xcc3333,
    },
  },

  // ─── Hoop ──────────────────────────────────────────────────────
  hoop: {
    id: 'default-hoop',
    colors: {
      rim: 0xff4400,
      net: 0xffffff,
      backboard: 0x333333,
      stanchion: 0x666666,
    },
  },

  // ─── Player Effects ────────────────────────────────────────────
  playerEffects: {
    defenseRing: { color: 0xffff00, alpha: 0.6 },
    ballGlow: { color: 0xff6600, alpha: 0.6 },
    stealRing: { color: 0xff3333, alpha: 0.6 },
    flashRing: { color: 0xffffff, alpha: 0.7 },
    tints: {
      shooting: 0xffffcc,
      crossover: 0xccffcc,
      stealReach: 0xff6666,
    },
    scales: {
      base: 0.055,
      anim: 1.1,
      defenseSlide: 0.197,
    },
  },

  // ─── HUD ───────────────────────────────────────────────────────
  hud: {
    id: 'default-hud',
    scoreboard: {
      position: { x: GAME_WIDTH / 2, y: 38 },
      bgSize: { width: 200, height: 48 },
      bgColor: 0x0a0a2a,
      bgAlpha: 0.95,
      scoreFont: 'monospace',
      scoreSize: '32px',
      scoreColor: '#ff6600',
      scorePopColor: '#ffffff',
      phaseFont: 'monospace',
      phaseSize: '20px',
      phaseColors: {
        default: '#ffaa00',
        scored: '#44ff44',
        missed: '#ff4444',
        stolen: '#ff4444',
        violation: '#ff6644',
        gameOver: '#ffffff',
      },
    },
    feedback: {
      position: { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 52 },
      bgSize: { width: 480, height: 40 },
      bgColor: 0x0a0a2a,
      bgAlpha: 0.9,
      font: 'monospace',
      fontSize: '18px',
      madeColor: '#44ff44',
      missedColor: '#ff4444',
      stealColor: '#ff6644',
    },
    timingMeter: {
      position: { x: (GAME_WIDTH - 220) / 2, y: 12 },
      size: { width: 220, height: 24 },
      bgColor: 0x0a0a2a,
      borderColor: 0x1a1a3a,
      zones: {
        early: 0xff4444,
        decent: 0xffaa00,
        good: 0x88ff44,
        perfect: 0x44ff44,
      },
      perfectMarker: 0xffffff,
    },
    controlsHint: {
      position: { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 12 },
      font: 'monospace',
      fontSize: '10px',
      color: '#888888',
    },
  },

  // ─── Ball ──────────────────────────────────────────────────────
  ball: {
    key: 'basketball',
    depth: 15,
  },

  // ─── Character Select Card ────────────────────────────────────
  characterCard: {
    size: { width: GAME_WIDTH, height: GAME_HEIGHT },
    bgColor: 0x1a1a2e,
    borderColor: 0x444466,
    borderWidth: 0,
    selectedScale: 1.0,
    unselectedScale: 1.0,
    unselectedAlpha: 1.0,
    lockOverlay: { color: 0x000000, alpha: 0.7 },
    lockTextColor: '#ff4444',
    nameFont: 'monospace',
    nameSize: '42px',
    nameColor: '#ff6600',
  },

  // ─── Court Select Card ────────────────────────────────────────
  courtCard: {
    size: { width: 280, height: 180 },
    bgColor: 0x222244,
    borderColor: 0x444466,
    borderWidth: 3,
    selectedScale: 1.1,
    unselectedScale: 0.9,
    unselectedAlpha: 0.6,
    lockOverlay: { color: 0x000000, alpha: 0.7 },
    lockTextColor: '#ff6666',
    nameFont: 'monospace',
    nameSize: '18px',
    nameColor: '#ffffff',
  },

  // ─── Screen Backgrounds ───────────────────────────────────────
  screens: {
    boot: {
      bg: { key: 'loading-screen', size: { width: GAME_WIDTH, height: GAME_HEIGHT } },
    },
    menu: {
      bg: { key: 'loading-screen', size: { width: GAME_WIDTH, height: GAME_HEIGHT } },
    },
    characterSelect: {
      bg: { key: 'playerselect-bg', size: { width: GAME_WIDTH, height: GAME_HEIGHT } },
    },
    courtSelect: {
      bg: { color: 0x1a1a2e },
    },
    result: {
      bg: { color: 0x1a1a2e },
    },
    leaderboard: {
      bg: { color: 0x1a1a2e },
    },
    pause: {
      bg: { color: 0x000000 },
      overlayColor: 0x000000,
      overlayAlpha: 0.7,
    },
  },
};
