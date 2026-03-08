import { InputProvider } from './InputProvider';
import { IPlayerInput, emptyInput } from './IPlayerInput';

const DEADZONE = 0.15;
const FLICK_THRESHOLD = 0.85;   // stick must reach this to count as a flick
const FLICK_CENTER_ZONE = 0.3;  // stick must be inside this to reset flick
const FLICK_TIME_WINDOW = 200;  // ms — max time from center to threshold
const FLICK_COOLDOWN = 300;     // ms — prevent repeat flicks

export class GamepadInputProvider extends InputProvider {
  private pad: Phaser.Input.Gamepad.Gamepad | null = null;
  private padIndex: number;
  private shootWasDown = false;

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

    // A button = shoot (button index 0)
    const shootDown = this.pad.A;
    input.shootPressed = shootDown && !this.shootWasDown;
    input.shootHeld = shootDown;
    input.shootReleased = !shootDown && this.shootWasDown;
    this.shootWasDown = shootDown;

    // B button = crossover (fallback)
    input.crossoverPressed = input.crossoverPressed || this.pad.B;

    // X button = stepback (fallback)
    input.stepbackPressed = input.stepbackPressed || this.pad.X;

    // Y button = steal (button index 3)
    input.stealPressed = this.pad.Y;

    // Left trigger/bumper = defense stance
    input.defenseStance = !!(this.pad.L1 || this.pad.L2 > 0.5);

    // Start button = pause (button index 9)
    input.pausePressed = this.pad.buttons[9]?.pressed ?? false;

    return input;
  }
}
