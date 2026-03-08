import { InputProvider } from './InputProvider';
import { IPlayerInput, emptyInput } from './IPlayerInput';

/**
 * Merges multiple input providers so keyboard and gamepad both work simultaneously.
 * Analog values take the largest magnitude; booleans are OR'd.
 */
export class CompositeInputProvider extends InputProvider {
  private providers: InputProvider[];

  constructor(...providers: InputProvider[]) {
    super();
    this.providers = providers;
  }

  update(scene: Phaser.Scene): void {
    for (const p of this.providers) {
      p.update(scene);
    }
  }

  poll(): IPlayerInput {
    const merged = emptyInput();

    for (const p of this.providers) {
      const input = p.poll();

      // Analog: take the value with largest magnitude
      if (Math.abs(input.moveX) > Math.abs(merged.moveX)) merged.moveX = input.moveX;
      if (Math.abs(input.moveY) > Math.abs(merged.moveY)) merged.moveY = input.moveY;

      // Booleans: OR
      merged.shootPressed = merged.shootPressed || input.shootPressed;
      merged.shootHeld = merged.shootHeld || input.shootHeld;
      merged.shootReleased = merged.shootReleased || input.shootReleased;
      merged.stepbackPressed = merged.stepbackPressed || input.stepbackPressed;
      merged.crossoverPressed = merged.crossoverPressed || input.crossoverPressed;
      merged.stealPressed = merged.stealPressed || input.stealPressed;
      merged.defenseStance = merged.defenseStance || input.defenseStance;
      merged.pausePressed = merged.pausePressed || input.pausePressed;
    }

    return merged;
  }
}
