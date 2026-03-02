import { InputProvider } from './InputProvider';
import { IPlayerInput, emptyInput } from './IPlayerInput';

const DEADZONE = 0.15;

export class GamepadInputProvider extends InputProvider {
  private pad: Phaser.Input.Gamepad.Gamepad | null = null;
  private padIndex: number;
  private shootWasDown = false;

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

    // Left stick
    const lx = this.pad.leftStick.x;
    const ly = this.pad.leftStick.y;
    input.moveX = Math.abs(lx) > DEADZONE ? lx : 0;
    input.moveY = Math.abs(ly) > DEADZONE ? ly : 0;

    // A button = shoot (button index 0)
    const shootDown = this.pad.A;
    input.shootPressed = shootDown && !this.shootWasDown;
    input.shootHeld = shootDown;
    input.shootReleased = !shootDown && this.shootWasDown;
    this.shootWasDown = shootDown;

    // X button = stepback (button index 2)
    input.stepbackPressed = this.pad.X;

    // Left trigger/bumper = defense stance
    input.defenseStance = !!(this.pad.L1 || this.pad.L2 > 0.5);

    // Start button = pause (button index 9)
    input.pausePressed = this.pad.buttons[9]?.pressed ?? false;

    return input;
  }
}
