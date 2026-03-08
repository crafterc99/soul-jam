import { InputProvider } from './InputProvider';
import { IPlayerInput, emptyInput } from './IPlayerInput';

const DEADZONE = 0.15;
const FLICK_THRESHOLD = 0.85;   // stick must reach this to count as a flick
const FLICK_CENTER_ZONE = 0.3;  // stick must be inside this to reset flick
const FLICK_TIME_WINDOW = 200;  // ms — max time from center to threshold
const FLICK_COOLDOWN = 300;     // ms — prevent repeat flicks

// PS4/PS5 layout: Cross=A(0), Circle=B(1), Square=X(2), Triangle=Y(3)
// Xbox layout:    A=A(0),     B=B(1),      X=X(2),      Y=Y(3)

export class GamepadInputProvider extends InputProvider {
  private pad: Phaser.Input.Gamepad.Gamepad | null = null;
  private padIndex: number;

  // Shoot tracking for Cross (A) button
  private shootWasDown_A = false;
  // Shoot tracking for Square (X) button — also used for steal contextually
  private shootWasDown_X = false;

  // Flick detection state
  private wasNearCenter = true;
  private nearCenterTime = 0;
  private flickCooldownUntil = 0;

  constructor(padIndex: number = 0) {
    super();
    this.padIndex = padIndex;
  }

  update(scene: Phaser.Scene): void {
    if (scene.input.gamepad) {
      this.pad = scene.input.gamepad.getPad(this.padIndex);
    }
  }

  poll(): IPlayerInput {
    const input = emptyInput();

    if (!this.pad || !this.pad.connected) return input;

    // Left stick — movement
    const lx = this.pad.leftStick.x;
    const ly = this.pad.leftStick.y;
    input.moveX = Math.abs(lx) > DEADZONE ? lx : 0;
    input.moveY = Math.abs(ly) > DEADZONE ? ly : 0;

    // Flick gesture detection on left stick
    const now = performance.now();
    const magnitude = Math.sqrt(lx * lx + ly * ly);

    // Track when stick returns to center
    if (magnitude < FLICK_CENTER_ZONE) {
      this.wasNearCenter = true;
      this.nearCenterTime = now;
    }

    // Detect flick from center to extreme
    if (this.wasNearCenter && now > this.flickCooldownUntil) {
      const timeSinceCenter = now - this.nearCenterTime;
      if (timeSinceCenter < FLICK_TIME_WINDOW && magnitude > FLICK_THRESHOLD) {
        // Stepback: flick down (pull stick back toward you)
        if (ly > FLICK_THRESHOLD && Math.abs(ly) > Math.abs(lx)) {
          input.stepbackPressed = true;
          this.wasNearCenter = false;
          this.flickCooldownUntil = now + FLICK_COOLDOWN;
        }
        // Crossover: flick left or right (horizontal dominates)
        else if (Math.abs(lx) > FLICK_THRESHOLD && Math.abs(lx) > Math.abs(ly)) {
          input.crossoverPressed = true;
          this.wasNearCenter = false;
          this.flickCooldownUntil = now + FLICK_COOLDOWN;
        }
      }
    }

    // Cross / A button (button 0) = shoot
    const shootDown_A = this.pad.A;
    const aPressed = shootDown_A && !this.shootWasDown_A;
    const aHeld = shootDown_A;
    const aReleased = !shootDown_A && this.shootWasDown_A;
    this.shootWasDown_A = shootDown_A;

    // Square / X button (button 2) = shoot on offense, steal on defense
    // Game sim routes by role, so we map to both shoot AND steal
    const shootDown_X = this.pad.X;
    const xPressed = shootDown_X && !this.shootWasDown_X;
    const xHeld = shootDown_X;
    const xReleased = !shootDown_X && this.shootWasDown_X;
    this.shootWasDown_X = shootDown_X;

    // Merge both buttons into shoot (either one works on offense)
    input.shootPressed = aPressed || xPressed;
    input.shootHeld = aHeld || xHeld;
    input.shootReleased = aReleased || xReleased;

    // Square also maps to steal (used on defense)
    input.stealPressed = this.pad.X;

    // Circle / B button (button 1) = crossover
    input.crossoverPressed = input.crossoverPressed || this.pad.B;

    // Triangle / Y button (button 3) = steal (fallback)
    input.stealPressed = input.stealPressed || this.pad.Y;

    // Left trigger/bumper = defense stance
    input.defenseStance = !!(this.pad.L1 || this.pad.L2 > 0.5);

    // Start button = pause (button index 9)
    input.pausePressed = this.pad.buttons[9]?.pressed ?? false;

    return input;
  }
}
