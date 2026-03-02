import { InputProvider } from './InputProvider';
import { IPlayerInput, emptyInput } from './IPlayerInput';

export class NullInputProvider extends InputProvider {
  update(_scene: Phaser.Scene): void {
    // No-op: used for CPU-controlled slots
  }

  poll(): IPlayerInput {
    return emptyInput();
  }
}
