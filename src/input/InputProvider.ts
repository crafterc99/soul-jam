import { IPlayerInput } from './IPlayerInput';

export abstract class InputProvider {
  abstract poll(): IPlayerInput;
  abstract update(scene: Phaser.Scene): void;
}
