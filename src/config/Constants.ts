export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

// Court boundaries = edges of the hardwood floor where it meets the red/maroon walls
// Original image 1920x1434 stretched to 1280x720
// X scale: 1280/1920 = 0.6667, Y scale: 720/1434 = 0.5021
export const COURT_LEFT = 65;    // hardwood left edge (behind backboard)
export const COURT_RIGHT = 1270;  // hardwood extends to right edge
export const COURT_TOP = 88;     // hardwood meets top red wall
export const COURT_BOTTOM = 678;  // hardwood bottom edge

// Hoop target position - center of the NET (where ball drops through)
// Shifted right and down from rim ring to the visible net center
export const HOOP_X = 265;
export const HOOP_Y = 228;

// Net bottom (where ball exits after dropping through)
export const NET_BOTTOM_Y = 270;

// 3-point line arc - measured from the court image
// The arc apex (rightmost point) is at ~x=850 in game coords
// Hoop at x=265, so horizontal extent = ~585
// Using Euclidean radius that matches the visual arc
export const THREE_POINT_CENTER_X = HOOP_X;
export const THREE_POINT_CENTER_Y = HOOP_Y;
export const THREE_POINT_RADIUS = 575;

// Player physics
export const PLAYER_RADIUS = 20;
export const DECELERATION = 1400;
export const FRICTION = 0.88;
export const LATERAL_SPEED_MULTIPLIER = 2.5;
export const MAX_SPEED_MULTIPLIER = 4.5;
export const ACCEL_MULTIPLIER = 12;
export const TURN_SPEED_PENALTY = 0.7;

// Ball
export const BALL_RADIUS = 10;
export const SHOT_FLIGHT_DURATION = 0.75;
export const SHOT_ARC_HEIGHT = 110;
export const SHOT_ARRIVAL_HEIGHT = 45;

// Scoring
export const SCORE_LIMIT = 21;
export const POINTS_TWO = 2;
export const POINTS_THREE = 3;

// Shot timing
export const SHOT_TIMING_WINDOW = 0.5;
export const TIMING_PERFECT_BONUS = 0.12;
export const TIMING_GOOD_BONUS = 0.05;
export const TIMING_EARLY_PENALTY = -0.08;

// Separation
export const STEPBACK_DURATION = 0.35;
export const STEPBACK_DISTANCE = 50;
export const STEPBACK_DEFENDER_FREEZE = 1.0;
export const CROSSOVER_DURATION = 0.3;
export const CROSSOVER_SHIFT_DISTANCE = 40;
export const CROSSOVER_DEFENDER_SHIFT = 35;

// Game phases
export const CHECK_BALL_DURATION = 1.5;
export const INBOUND_DURATION = 1.0;
export const SCORED_CELEBRATION_DURATION = 2.0;

// 3-point corner zones (near sidelines, shorter 3-point distance like real NBA)
// NBA: corner 3 = 22ft, arc 3 = 23'9". Ratio ≈ 0.926
export const CORNER_THREE_ZONE = 100;  // pixels from sideline to use corner logic
export const CORNER_THREE_RADIUS = Math.round(THREE_POINT_RADIUS * 0.926); // ~533

// Defense
export const CONTEST_MAX_DISTANCE = 80;

// Steal
export const STEAL_RANGE = 50;           // must be this close to ball handler
export const STEAL_BASE_CHANCE = 0.30;   // 30% base steal chance
export const STEAL_COOLDOWN = 0.8;       // seconds between steal attempts
export const STEAL_FREEZE_DURATION = 0.5; // freeze on failed steal (reach-in)

// Scene keys
export const SCENE_BOOT = 'BootScene';
export const SCENE_PRELOAD = 'PreloadScene';
export const SCENE_MENU = 'MenuScene';
export const SCENE_CHARACTER_SELECT = 'CharacterSelectScene';
export const SCENE_GAME = 'GameScene';
export const SCENE_PAUSE = 'PauseScene';
