import Phaser from 'phaser';
import { InputProvider } from './InputProvider';
import { IPlayerInput, emptyInput } from './IPlayerInput';

export interface KeyBindings {
  up: number;
  down: number;
  left: number;
  right: number;
  shoot: number;
  stepback: number;
  crossover: number;
  defense: number;
  pause: number;
}

export const WASD_BINDINGS: KeyBindings = {
  up: Phaser.Input.Keyboard.KeyCodes.W,
  down: Phaser.Input.Keyboard.KeyCodes.S,
  left: Phaser.Input.Keyboard.KeyCodes.A,
  right: Phaser.Input.Keyboard.KeyCodes.D,
  shoot: Phaser.Input.Keyboard.KeyCodes.SPACE,
  stepback: Phaser.Input.Keyboard.KeyCodes.Q,
  crossover: Phaser.Input.Keyboard.KeyCodes.E,
  defense: Phaser.Input.Keyboard.KeyCodes.SHIFT,
  pause: Phaser.Input.Keyboard.KeyCodes.ESC,
};

export const ARROW_BINDINGS: KeyBindings = {
  up: Phaser.Input.Keyboard.KeyCodes.UP,
  down: Phaser.Input.Keyboard.KeyCodes.DOWN,
  left: Phaser.Input.Keyboard.KeyCodes.LEFT,
  right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
  shoot: Phaser.Input.Keyboard.KeyCodes.NUMPAD_ZERO,
  stepback: Phaser.Input.Keyboard.KeyCodes.NUMPAD_ONE,
  crossover: Phaser.Input.Keyboard.KeyCodes.NUMPAD_THREE,
  defense: Phaser.Input.Keyboard.KeyCodes.NUMPAD_TWO,
  pause: Phaser.Input.Keyboard.KeyCodes.P,
};

export class KeyboardInputProvider extends InputProvider {
  private keys!: Record<keyof KeyBindings, Phaser.Input.Keyboard.Key>;
  private shootWasDown = false;

  constructor(private bindings: KeyBindings) {
    super();
  }

  update(scene: Phaser.Scene): void {
    if (!this.keys && scene.input.keyboard) {
      this.keys = {} as Record<keyof KeyBindings, Phaser.Input.Keyboard.Key>;
      for (const [action, keyCode] of Object.entries(this.bindings)) {
        this.keys[action as keyof KeyBindings] = scene.input.keyboard.addKey(keyCode);
      }
    }
  }

  poll(): IPlayerInput {
    const input = emptyInput();

    if (!this.keys) return input;

    if (this.keys.left.isDown) input.moveX -= 1;
    if (this.keys.right.isDown) input.moveX += 1;
    if (this.keys.up.isDown) input.moveY -= 1;
    if (this.keys.down.isDown) input.moveY += 1;

    const shootDown = this.keys.shoot.isDown;
    input.shootPressed = shootDown && !this.shootWasDown;
    input.shootHeld = shootDown;
    input.shootReleased = !shootDown && this.shootWasDown;
    this.shootWasDown = shootDown;

    input.stepbackPressed = Phaser.Input.Keyboard.JustDown(this.keys.stepback);
    input.crossoverPressed = Phaser.Input.Keyboard.JustDown(this.keys.crossover);
    input.defenseStance = this.keys.defense.isDown;
    input.pausePressed = Phaser.Input.Keyboard.JustDown(this.keys.pause);

    return input;
  }
}
