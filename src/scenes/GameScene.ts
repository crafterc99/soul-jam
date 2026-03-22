import Phaser from 'phaser';
import { SCENE_GAME, SCENE_PAUSE, SCENE_RESULT, GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';
import { InputManager } from '../input/InputManager';
import { KeyboardInputProvider, WASD_BINDINGS, ARROW_BINDINGS } from '../input/KeyboardInputProvider';
import { GamepadInputProvider } from '../input/GamepadInputProvider';
import { CompositeInputProvider } from '../input/CompositeInputProvider';
import { NullInputProvider } from '../input/NullInputProvider';
import { GameSimulation } from '../simulation/GameSimulation';
import { GamePhase } from '../simulation/GameState';
import { CHARACTERS } from '../data/Characters';
import { getCourtDef } from '../data/courts';
import { getTheme } from '../data/theme';
import { MatchConfig } from '../data/types';
import { CourtRenderer } from '../rendering/CourtRenderer';
import { PlayerRenderer } from '../rendering/PlayerRenderer';
import { BallRenderer } from '../rendering/BallRenderer';
import { HUDRenderer } from '../rendering/HUDRenderer';
import { AIController } from '../ai/AIController';

export interface GameSceneData extends MatchConfig {}

export class GameScene extends Phaser.Scene {
  private inputManager!: InputManager;
  private matchConfig!: MatchConfig;
  private sim!: GameSimulation;

  private courtRenderer!: CourtRenderer;
  private playerRenderers!: [PlayerRenderer, PlayerRenderer];
  private ballRenderer!: BallRenderer;
  private hudRenderer!: HUDRenderer;

  private aiController: AIController | null = null;
  private gameOverShown = false;

  constructor() {
    super({ key: SCENE_GAME });
  }

  init(data: GameSceneData): void {
    this.matchConfig = data;
    this.gameOverShown = false;
  }

  create(): void {
    const p1Char = CHARACTERS[this.matchConfig.p1CharacterId];
    const p2Char = CHARACTERS[this.matchConfig.p2CharacterId];
    const courtDef = getCourtDef(this.matchConfig.courtId);
    const theme = getTheme();

    // Setup simulation
    this.sim = new GameSimulation(p1Char, p2Char);

    // Setup input
    this.inputManager = new InputManager();
    this.inputManager.setProvider(0, new CompositeInputProvider(
      new KeyboardInputProvider(WASD_BINDINGS),
      new GamepadInputProvider(0),
    ));

    if (this.matchConfig.mode === 'local2p') {
      this.inputManager.setProvider(1, new CompositeInputProvider(
        new KeyboardInputProvider(ARROW_BINDINGS),
        new GamepadInputProvider(1),
      ));
    } else {
      this.inputManager.setProvider(1, new NullInputProvider());
      this.aiController = new AIController(1, this.matchConfig.aiDifficulty);
    }

    // Setup renderers with new data-driven configs
    this.courtRenderer = new CourtRenderer(this, courtDef);
    this.playerRenderers = [
      new PlayerRenderer(this, this.sim.players[0], `P1 ${p1Char.name}`, p1Char),
      new PlayerRenderer(this, this.sim.players[1], `P2 ${p2Char.name}`, p2Char),
    ];
    this.ballRenderer = new BallRenderer(this, this.sim.ball);
    this.hudRenderer = new HUDRenderer(this, this.sim, theme);

    // Pause handling
    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.launch(SCENE_PAUSE);
      this.scene.pause();
    });
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;

    this.inputManager.updateAll(this);

    const p1Input = this.inputManager.poll(0);
    let p2Input = this.inputManager.poll(1);

    if (this.aiController) {
      p2Input = this.aiController.decide(this.sim);
    }

    if (p1Input.pausePressed || p2Input.pausePressed) {
      this.scene.launch(SCENE_PAUSE);
      this.scene.pause();
      return;
    }

    this.sim.tick(dt, p1Input, p2Input);

    this.playerRenderers[0].update();
    this.playerRenderers[1].update();

    const possessorIdx = this.sim.ball.possessorIndex;
    this.ballRenderer.hidden = this.sim.ball.state === 'held' &&
      this.playerRenderers[possessorIdx].isDribbleAnimActive;
    this.ballRenderer.update();
    this.hudRenderer.update(dt);

    // Game over → go to Result screen
    if (this.sim.phaseManager.phase === GamePhase.GameOver && !this.gameOverShown) {
      this.gameOverShown = true;
      // Short delay before transitioning to result
      this.time.delayedCall(1500, () => {
        this.scene.start(SCENE_RESULT, {
          matchConfig: this.matchConfig,
          scores: [...this.sim.scoreKeeper.scores] as [number, number],
          winner: this.sim.scoreKeeper.getWinner(),
        });
      });
    }
  }
}
