export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

// Court dimensions (in game/simulation units)
export const COURT_WIDTH = 1200;
export const COURT_HEIGHT = 600;
export const COURT_LEFT = (GAME_WIDTH - COURT_WIDTH) / 2;
export const COURT_TOP = (GAME_HEIGHT - COURT_HEIGHT) / 2;
export const COURT_RIGHT = COURT_LEFT + COURT_WIDTH;
export const COURT_BOTTOM = COURT_TOP + COURT_HEIGHT;

// Hoop position (right side of court for half-court)
export const HOOP_X = COURT_RIGHT - 80;
export const HOOP_Y = GAME_HEIGHT / 2;

// 3-point line arc center and radius
export const THREE_POINT_CENTER_X = HOOP_X;
export const THREE_POINT_CENTER_Y = HOOP_Y;
export const THREE_POINT_RADIUS = 280;

// Player physics
export const PLAYER_RADIUS = 20;
export const DECELERATION = 1400; // units/s^2 (higher = snappier stops)
export const FRICTION = 0.88; // velocity multiplier each frame when no input
export const LATERAL_SPEED_MULTIPLIER = 2.5; // defense * this = lateral cap
export const MAX_SPEED_MULTIPLIER = 4.5; // speed * this = top speed
export const ACCEL_MULTIPLIER = 12; // power * this = acceleration
export const TURN_SPEED_PENALTY = 0.7; // speed penalty when changing direction sharply

// Ball
export const BALL_RADIUS = 10;
export const SHOT_FLIGHT_DURATION = 0.8; // seconds
export const SHOT_ARC_HEIGHT = 150; // pixels at peak

// Scoring
export const SCORE_LIMIT = 21;
export const POINTS_TWO = 2;
export const POINTS_THREE = 3;

// Shot timing
export const SHOT_TIMING_WINDOW = 0.5; // seconds to hold for perfect
export const TIMING_PERFECT_BONUS = 0.12;
export const TIMING_GOOD_BONUS = 0.05;
export const TIMING_EARLY_PENALTY = -0.08;

// Separation
export const STEPBACK_DURATION = 0.3; // seconds
export const STEPBACK_DISTANCE = 30; // base distance in court units

// Game phases
export const CHECK_BALL_DURATION = 1.5; // seconds
export const INBOUND_DURATION = 1.0;
export const SCORED_CELEBRATION_DURATION = 2.0;

// Defense
export const CONTEST_MAX_DISTANCE = 80; // max distance for any contest effect

// Scene keys
export const SCENE_BOOT = 'BootScene';
export const SCENE_PRELOAD = 'PreloadScene';
export const SCENE_MENU = 'MenuScene';
export const SCENE_CHARACTER_SELECT = 'CharacterSelectScene';
export const SCENE_GAME = 'GameScene';
export const SCENE_PAUSE = 'PauseScene';
