import Phaser from 'phaser';
import { SCENE_GAME, SCENE_PAUSE, SCENE_MENU, GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';
import { InputManager } from '../input/InputManager';
import { KeyboardInputProvider, WASD_BINDINGS, ARROW_BINDINGS } from '../input/KeyboardInputProvider';
import { NullInputProvider } from '../input/NullInputProvider';
import { GameSimulation } from '../simulation/GameSimulation';
import { GamePhase } from '../simulation/GameState';
import { CHARACTERS } from '../data/Characters';
import { CourtRenderer } from '../rendering/CourtRenderer';
import { PlayerRenderer } from '../rendering/PlayerRenderer';
import { BallRenderer } from '../rendering/BallRenderer';
import { HUDRenderer } from '../rendering/HUDRenderer';
import { AIController } from '../ai/AIController';
import { LocalStorageService } from '../services/LocalStorageService';

export interface GameSceneData {
  mode: 'cpu' | 'local2p';
  p1CharacterId: string;
  p2CharacterId: string;
}

export class GameScene extends Phaser.Scene {
  private inputManager!: InputManager;
  private sceneData!: GameSceneData;
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
    this.sceneData = data;
    this.gameOverShown = false;
  }

  create(): void {
    const p1Char = CHARACTERS[this.sceneData.p1CharacterId];
    const p2Char = CHARACTERS[this.sceneData.p2CharacterId];

    // Setup simulation
    this.sim = new GameSimulation(p1Char, p2Char);

    // Setup input
    this.inputManager = new InputManager();
    this.inputManager.setProvider(0, new KeyboardInputProvider(WASD_BINDINGS));

    if (this.sceneData.mode === 'local2p') {
      this.inputManager.setProvider(1, new KeyboardInputProvider(ARROW_BINDINGS));
    } else {
      this.inputManager.setProvider(1, new NullInputProvider());
      this.aiController = new AIController(1, 'medium');
    }

    // Setup renderers
    this.courtRenderer = new CourtRenderer(this);
    this.playerRenderers = [
      new PlayerRenderer(this, this.sim.players[0], `P1 ${p1Char.name}`, p1Char.spriteKey,
        p1Char.dribbleAnimKey, p1Char.idleDribbleAnimKey,
        p1Char.defensiveSlideLeftAnimKey, p1Char.defensiveSlideRightAnimKey,
        p1Char.jumpshotAnimKey, p1Char.stepbackAnimKey),
      new PlayerRenderer(this, this.sim.players[1], `P2 ${p2Char.name}`, p2Char.spriteKey,
        p2Char.dribbleAnimKey, p2Char.idleDribbleAnimKey,
        p2Char.defensiveSlideLeftAnimKey, p2Char.defensiveSlideRightAnimKey,
        p2Char.jumpshotAnimKey, p2Char.stepbackAnimKey),
    ];
    this.ballRenderer = new BallRenderer(this, this.sim.ball);
    this.hudRenderer = new HUDRenderer(this, this.sim);

    // Pause handling
    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.launch(SCENE_PAUSE);
      this.scene.pause();
    });
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000; // convert ms to seconds

    this.inputManager.updateAll(this);

    const p1Input = this.inputManager.poll(0);
    let p2Input = this.inputManager.poll(1);

    // AI override for CPU slot
    if (this.aiController) {
      p2Input = this.aiController.decide(this.sim);
    }

    // Check pause
    if (p1Input.pausePressed || p2Input.pausePressed) {
      this.scene.launch(SCENE_PAUSE);
      this.scene.pause();
      return;
    }

    // Tick simulation
    this.sim.tick(dt, p1Input, p2Input);

    // Update renderers
    this.playerRenderers[0].update();
    this.playerRenderers[1].update();

    // Hide the separate ball when a dribble animation is showing it
    const possessorIdx = this.sim.ball.possessorIndex;
    this.ballRenderer.hidden = this.sim.ball.state === 'held' &&
      this.playerRenderers[possessorIdx].isDribbleAnimActive;
    this.ballRenderer.update();
    this.hudRenderer.update(dt);

    // Game over handling
    if (this.sim.phaseManager.phase === GamePhase.GameOver && !this.gameOverShown) {
      this.gameOverShown = true;
      this.showGameOver();
    }
  }

  private showGameOver(): void {
    const winner = this.sim.scoreKeeper.getWinner();
    const scores = this.sim.scoreKeeper.scores;

    // Save match result
    const storage = new LocalStorageService();
    storage.saveMatchResult({
      timestamp: Date.now(),
      mode: this.sceneData.mode,
      p1Character: this.sceneData.p1CharacterId,
      p2Character: this.sceneData.p2CharacterId,
      p1Score: scores[0],
      p2Score: scores[1],
      winner: winner ?? 0,
    });

    // Overlay
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6);
    overlay.setDepth(200);

    const winnerText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60,
      winner !== null ? `PLAYER ${winner + 1} WINS!` : 'GAME OVER', {
      fontSize: '48px',
      color: '#ff6600',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(201);

    const scoreDisplay = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2,
      `${scores[0]} - ${scores[1]}`, {
      fontSize: '36px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(201);

    const continueText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80,
      'Press SPACE to return to menu', {
      fontSize: '20px',
      color: '#aaaaaa',
    }).setOrigin(0.5).setDepth(201);

    this.input.keyboard?.once('keydown-SPACE', () => {
      this.scene.start(SCENE_MENU);
    });
    this.input.keyboard?.once('keydown-ENTER', () => {
      this.scene.start(SCENE_MENU);
    });
  }
}
