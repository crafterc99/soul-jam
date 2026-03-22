// ─── Skin Type System ──────────────────────────────────────────────

export type HexColor = number;   // 0xRRGGBB
export type CSSColor = string;   // '#rrggbb' or named CSS color

// ─── Atomic Unit ───────────────────────────────────────────────────

export interface AssetSlot {
  key: string;
  fallback?: string;
  origin?: { x: number; y: number };
  size?: { width: number; height: number };
  depth?: number;
}

// ─── Court ─────────────────────────────────────────────────────────

export interface CourtSkinDef {
  id: string;
  floor: AssetSlot;
  paintOverlay?: AssetSlot;
  lineOverlay?: AssetSlot;
  centerLogo?: AssetSlot;
  arenaBg?: AssetSlot;
  colors: { line: HexColor; paint: HexColor };
}

// ─── Hoop ──────────────────────────────────────────────────────────

export interface HoopSkinDef {
  id: string;
  rim?: AssetSlot;
  net?: AssetSlot;
  backboard?: AssetSlot;
  stanchion?: AssetSlot;
  colors: {
    rim: HexColor;
    net: HexColor;
    backboard: HexColor;
    stanchion: HexColor;
  };
}

// ─── Player Effects ────────────────────────────────────────────────

export interface PlayerEffectsSkinDef {
  defenseRing: { color: HexColor; alpha: number };
  ballGlow: { color: HexColor; alpha: number };
  stealRing: { color: HexColor; alpha: number };
  flashRing: { color: HexColor; alpha: number };
  tints: { shooting: HexColor; crossover: HexColor; stealReach: HexColor };
  scales: { base: number; anim: number; defenseSlide: number };
}

// ─── HUD ───────────────────────────────────────────────────────────

export interface ScoreboardSkinDef {
  position: { x: number; y: number };
  bgSize: { width: number; height: number };
  bgColor: HexColor;
  bgAlpha: number;
  scoreFont: string;
  scoreSize: string;
  scoreColor: CSSColor;
  scorePopColor: CSSColor;
  phaseFont: string;
  phaseSize: string;
  phaseColors: {
    default: CSSColor;
    scored: CSSColor;
    missed: CSSColor;
    stolen: CSSColor;
    violation: CSSColor;
    gameOver: CSSColor;
  };
}

export interface FeedbackSkinDef {
  position: { x: number; y: number };
  bgSize: { width: number; height: number };
  bgColor: HexColor;
  bgAlpha: number;
  font: string;
  fontSize: string;
  madeColor: CSSColor;
  missedColor: CSSColor;
  stealColor: CSSColor;
}

export interface TimingMeterSkinDef {
  position: { x: number; y: number };
  size: { width: number; height: number };
  bgColor: HexColor;
  borderColor: HexColor;
  zones: { early: HexColor; decent: HexColor; good: HexColor; perfect: HexColor };
  perfectMarker: HexColor;
}

export interface HUDSkinDef {
  id: string;
  scoreboard: ScoreboardSkinDef;
  feedback: FeedbackSkinDef;
  timingMeter: TimingMeterSkinDef;
  controlsHint: {
    position: { x: number; y: number };
    font: string;
    fontSize: string;
    color: CSSColor;
  };
}

// ─── Cards ─────────────────────────────────────────────────────────

export interface CardSkinDef {
  size: { width: number; height: number };
  bgColor: HexColor;
  borderColor: HexColor;
  borderWidth: number;
  selectedScale: number;
  unselectedScale: number;
  unselectedAlpha: number;
  frame?: AssetSlot;
  lockOverlay: { color: HexColor; alpha: number };
  lockTextColor: CSSColor;
  nameFont: string;
  nameSize: string;
  nameColor: CSSColor;
}

// ─── Screens ───────────────────────────────────────────────────────

export interface ScreenSkinDef {
  bg: AssetSlot | { color: HexColor };
  overlay?: AssetSlot | { color: HexColor; alpha: number };
}

export interface PauseScreenSkinDef extends ScreenSkinDef {
  overlayColor: HexColor;
  overlayAlpha: number;
}

// ─── Master Bundle ─────────────────────────────────────────────────

export interface SkinBundle {
  id: string;
  name: string;
  court: CourtSkinDef;
  hoop: HoopSkinDef;
  playerEffects: PlayerEffectsSkinDef;
  hud: HUDSkinDef;
  ball: AssetSlot;
  characterCard: CardSkinDef;
  courtCard: CardSkinDef;
  screens: {
    boot: ScreenSkinDef;
    menu: ScreenSkinDef;
    characterSelect: ScreenSkinDef;
    courtSelect: ScreenSkinDef;
    result: ScreenSkinDef;
    leaderboard: ScreenSkinDef;
    pause: PauseScreenSkinDef;
  };
}
