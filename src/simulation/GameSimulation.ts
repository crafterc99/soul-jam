import { Vector2 } from '../utils/Vector2';
import { IPlayerInput } from '../input/IPlayerInput';
import { PlayerSim } from './PlayerSim';
import { BallSim } from './BallSim';
import { CourtSim } from './CourtSim';
import { PhaseManager } from './PhaseManager';
import { ScoreKeeper } from './ScoreKeeper';
import { GamePhase, GameStateSnapshot } from './GameState';
import { PLAYER_STATE } from './PlayerStates';
import { ShotModel, ShotContext } from './models/ShotModel';
import { DefenseModel, DefenseContext } from './models/DefenseModel';
import { SeparationModel, SeparationContext } from './models/SeparationModel';
import { CharacterDef } from '../data/CharacterRatings';
import {
  PLAYER_RADIUS, POINTS_TWO, POINTS_THREE,
} from '../config/Constants';

export class GameSimulation {
  players: [PlayerSim, PlayerSim];
  ball: BallSim;
  court: CourtSim;
  phaseManager: PhaseManager;
  scoreKeeper: ScoreKeeper;

  lastShotProbability: number = 0;
  lastContestPercent: number = 0;
  lastTimingGrade: string = '';
  lastShotPoints: number = 0;
  lastScorerIndex: number = -1;

  constructor(p1Char: CharacterDef, p2Char: CharacterDef) {
    this.court = new CourtSim();
    this.scoreKeeper = new ScoreKeeper();
    this.phaseManager = new PhaseManager();
    this.ball = new BallSim();

    const offensePos = this.court.getInboundOffensePosition();
    const defensePos = this.court.getInboundDefensePosition();

    this.players = [
      new PlayerSim(0, offensePos, p1Char.ratings, p1Char.color),
      new PlayerSim(1, defensePos, p2Char.ratings, p2Char.color),
    ];

    // P1 starts with ball
    this.players[0].hasBall = true;
    this.ball.setPossessor(0, this.players[0].position);
    this.phaseManager.possession = 0;
    this.phaseManager.setPhase(GamePhase.CheckBall);
  }

  get offensePlayer(): PlayerSim {
    return this.players[this.phaseManager.possession];
  }

  get defensePlayer(): PlayerSim {
    return this.players[this.phaseManager.possession === 0 ? 1 : 0];
  }

  tick(dt: number, p1Input: IPlayerInput, p2Input: IPlayerInput): void {
    // Set inputs
    this.players[0].setInput(p1Input);
    this.players[1].setInput(p2Input);

    // Phase transitions
    const nextPhase = this.phaseManager.update(dt);
    if (nextPhase !== null) {
      this.transitionToPhase(nextPhase);
    }

    // Phase-specific logic
    switch (this.phaseManager.phase) {
      case GamePhase.CheckBall:
        this.tickCheckBall(dt);
        break;
      case GamePhase.Inbound:
        this.tickInbound(dt);
        break;
      case GamePhase.Live:
        this.tickLive(dt, p1Input, p2Input);
        break;
      case GamePhase.Shooting:
        this.tickShooting(dt);
        break;
      case GamePhase.Scored:
      case GamePhase.Missed:
        // Just wait for timer
        break;
      case GamePhase.GameOver:
        break;
    }

    // Clamp positions to court
    for (const player of this.players) {
      player.position = this.court.clampPlayerPosition(player.position);
    }

    // Update ball
    if (this.ball.state === 'held') {
      const possessor = this.players[this.ball.possessorIndex];
      this.ball.update(dt, possessor.position);
    } else {
      this.ball.update(dt);
    }
  }

  private tickCheckBall(dt: number): void {
    // Players move to positions
    const offense = this.offensePlayer;
    const defense = this.defensePlayer;

    // Offense gets ball, both can move freely
    offense.hasBall = true;
    defense.hasBall = false;
    this.ball.setPossessor(offense.playerIndex, offense.position);

    offense.update(dt);
    defense.update(dt);
  }

  private tickInbound(dt: number): void {
    // Brief transition, players can't shoot yet
    const offense = this.offensePlayer;
    const defense = this.defensePlayer;
    offense.update(dt);
    defense.update(dt);
  }

  private tickLive(dt: number, p1Input: IPlayerInput, p2Input: IPlayerInput): void {
    const offense = this.offensePlayer;
    const defense = this.defensePlayer;
    const offenseInput = offense.playerIndex === 0 ? p1Input : p2Input;

    // Handle stepback
    if (offenseInput.stepbackPressed && offense.hasBall &&
        offense.fsm.isInState(PLAYER_STATE.IDLE) || offense.fsm.isInState(PLAYER_STATE.RUN)) {
      if (offenseInput.stepbackPressed && offense.hasBall && !offense.fsm.isInState(PLAYER_STATE.STEPBACK)) {
        this.executeStepback(offense, defense);
      }
    }

    // Handle shoot press
    if (offenseInput.shootPressed && offense.hasBall &&
        !offense.fsm.isInState(PLAYER_STATE.SHOOTING) &&
        !offense.fsm.isInState(PLAYER_STATE.STEPBACK)) {
      offense.fsm.setState(PLAYER_STATE.SHOOTING);
    }

    // Handle shot release
    if (offense.fsm.isInState(PLAYER_STATE.SHOOTING) && offense.shotReleased && offense.hasBall) {
      this.executeShot(offense, defense);
    }

    // Update players
    offense.update(dt);
    defense.update(dt);

    // Player collision (prevent overlapping)
    this.resolvePlayerCollision();
  }

  private tickShooting(dt: number): void {
    // Ball is in flight, check if it landed
    if (this.ball.state === 'dead') {
      if (this.ball.willScore) {
        this.scoreKeeper.addScore(this.phaseManager.possession, this.lastShotPoints);
        this.lastScorerIndex = this.phaseManager.possession;

        if (this.scoreKeeper.isGameOver()) {
          this.transitionToPhase(GamePhase.GameOver);
        } else {
          // After a score, defender gets possession
          this.phaseManager.flipPossession();
          this.transitionToPhase(GamePhase.Scored);
        }
      } else {
        // Miss - defender gets the rebound
        this.phaseManager.flipPossession();
        this.transitionToPhase(GamePhase.Missed);
      }
    }

    // Players can still move during flight
    this.players[0].update(dt);
    this.players[1].update(dt);
  }

  private executeStepback(offense: PlayerSim, defense: PlayerSim): void {
    const sepCtx: SeparationContext = {
      offenseRatings: offense.ratings,
      defenseRatings: defense.ratings,
      offenseVelocity: offense.velocity,
    };
    const result = SeparationModel.calculate(sepCtx);

    // Stepback direction: away from hoop
    const awayFromHoop = offense.position.subtract(this.court.hoopPosition).normalize();
    offense.stepbackVelocity = awayFromHoop.scale(result.burstVelocity);
    offense.fsm.setState(PLAYER_STATE.STEPBACK);
  }

  private executeShot(offense: PlayerSim, defense: PlayerSim): void {
    const distToHoop = this.court.distanceToHoop(offense.position);
    const isBehindThree = this.court.isBehindThreePointLine(offense.position);

    // Calculate contest
    const defCtx: DefenseContext = {
      defenderPosition: defense.position,
      shooterPosition: offense.position,
      defenderVelocity: defense.velocity,
      defenderRatings: defense.ratings,
      isInDefenseStance: defense.fsm.isInState(PLAYER_STATE.DEFENDING),
    };
    const contestPercent = DefenseModel.calculateContestPercent(defCtx);
    this.lastContestPercent = contestPercent;

    // Calculate shot probability
    const shotCtx: ShotContext = {
      distanceToHoop: distToHoop,
      contestPercent,
      timingValue: offense.shotTimingValue,
      ratings: offense.ratings,
    };
    const probability = ShotModel.calculateProbability(shotCtx);
    this.lastShotProbability = probability;
    this.lastTimingGrade = ShotModel.getTimingGrade(offense.shotTimingValue);
    this.lastShotPoints = isBehindThree ? POINTS_THREE : POINTS_TWO;

    // Roll the shot
    const willScore = ShotModel.rollShot(probability);

    // Launch ball
    offense.hasBall = false;
    this.ball.launchShot(offense.position, this.court.hoopPosition, willScore);

    this.phaseManager.setPhase(GamePhase.Shooting);
  }

  private resolvePlayerCollision(): void {
    const p1 = this.players[0];
    const p2 = this.players[1];
    const dist = p1.position.distanceTo(p2.position);
    const minDist = PLAYER_RADIUS * 2;

    if (dist < minDist && dist > 0) {
      const overlap = minDist - dist;
      const pushDir = p1.position.subtract(p2.position).normalize();
      p1.position = p1.position.add(pushDir.scale(overlap / 2));
      p2.position = p2.position.add(pushDir.scale(-overlap / 2));
    }
  }

  private transitionToPhase(phase: GamePhase): void {
    this.phaseManager.setPhase(phase);

    switch (phase) {
      case GamePhase.CheckBall: {
        const offPos = this.court.getInboundOffensePosition();
        const defPos = this.court.getInboundDefensePosition();
        this.offensePlayer.reset(offPos);
        this.defensePlayer.reset(defPos);
        this.offensePlayer.hasBall = true;
        this.ball.setPossessor(this.offensePlayer.playerIndex, offPos);
        break;
      }
      case GamePhase.Inbound:
        break;
      case GamePhase.Live:
        break;
      case GamePhase.Scored:
        break;
      case GamePhase.Missed:
        break;
      case GamePhase.GameOver:
        break;
    }
  }

  getSnapshot(): GameStateSnapshot {
    return {
      phase: this.phaseManager.phase,
      scores: [...this.scoreKeeper.scores] as [number, number],
      possession: this.phaseManager.possession,
      phaseTimer: this.phaseManager.phaseTimer,
      lastScorerIndex: this.lastScorerIndex,
      lastShotPoints: this.lastShotPoints,
    };
  }
}
