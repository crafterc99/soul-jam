import { InputProvider } from './InputProvider';
import { IPlayerInput, emptyInput } from './IPlayerInput';

export class InputManager {
  private providers: Map<number, InputProvider> = new Map();

  setProvider(slot: number, provider: InputProvider): void {
    this.providers.set(slot, provider);
  }

  getProvider(slot: number): InputProvider | undefined {
    return this.providers.get(slot);
  }

  updateAll(scene: Phaser.Scene): void {
    for (const provider of this.providers.values()) {
      provider.update(scene);
    }
  }

  poll(slot: number): IPlayerInput {
    const provider = this.providers.get(slot);
    if (!provider) return emptyInput();
    return provider.poll();
  }

  pollAll(): Map<number, IPlayerInput> {
    const inputs = new Map<number, IPlayerInput>();
    for (const [slot, provider] of this.providers) {
      inputs.set(slot, provider.poll());
    }
    return inputs;
  }
}
