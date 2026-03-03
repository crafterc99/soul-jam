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
  COURT_LEFT, COURT_RIGHT, COURT_TOP, COURT_BOTTOM,
  CROSSOVER_SHIFT_DISTANCE,
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
  lastViolationPlayer: number = -1;

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
    this.players[0].setInput(p1Input);
    this.players[1].setInput(p2Input);

    // Phase transitions
    const nextPhase = this.phaseManager.update(dt);
    if (nextPhase !== null) {
      this.transitionToPhase(nextPhase);
    }

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
      case GamePhase.Violation:
        break;
      case GamePhase.GameOver:
        break;
    }

    // Clamp positions to court (but check OOB first during live play)
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
    const offense = this.offensePlayer;
    const defense = this.defensePlayer;

    offense.hasBall = true;
    defense.hasBall = false;
    this.ball.setPossessor(offense.playerIndex, offense.position);

    offense.update(dt);
    defense.update(dt);
  }

  private tickInbound(dt: number): void {
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
        !offense.fsm.isInState(PLAYER_STATE.STEPBACK) &&
        !offense.fsm.isInState(PLAYER_STATE.CROSSOVER) &&
        !offense.fsm.isInState(PLAYER_STATE.SHOOTING)) {
      this.executeStepback(offense, defense);
    }

    // Handle crossover
    if (offenseInput.crossoverPressed && offense.hasBall &&
        !offense.fsm.isInState(PLAYER_STATE.STEPBACK) &&
        !offense.fsm.isInState(PLAYER_STATE.CROSSOVER) &&
        !offense.fsm.isInState(PLAYER_STATE.SHOOTING)) {
      this.executeCrossover(offense, defense);
    }

    // Handle shoot press
    if (offenseInput.shootPressed && offense.hasBall &&
        !offense.fsm.isInState(PLAYER_STATE.SHOOTING) &&
        !offense.fsm.isInState(PLAYER_STATE.STEPBACK) &&
        !offense.fsm.isInState(PLAYER_STATE.CROSSOVER)) {
      offense.fsm.setState(PLAYER_STATE.SHOOTING);
    }

    // Handle shot release
    if (offense.fsm.isInState(PLAYER_STATE.SHOOTING) && offense.shotReleased && offense.hasBall) {
      this.executeShot(offense, defense);
    }

    // Update players
    offense.update(dt);
    defense.update(dt);

    // Player collision
    this.resolvePlayerCollision();

    // Out of bounds check on ball handler
    this.checkOutOfBounds();
  }

  private tickShooting(dt: number): void {
    // Wait for ball to finish its full animation (flight + drop/bounce)
    if (this.ball.shotFinished) {
      if (this.ball.willScore) {
        this.scoreKeeper.addScore(this.phaseManager.possession, this.lastShotPoints);
        this.lastScorerIndex = this.phaseManager.possession;

        if (this.scoreKeeper.isGameOver()) {
          this.transitionToPhase(GamePhase.GameOver);
        } else {
          this.phaseManager.flipPossession();
          this.transitionToPhase(GamePhase.Scored);
        }
      } else {
        this.phaseManager.flipPossession();
        this.transitionToPhase(GamePhase.Missed);
      }
    }

    this.players[0].update(dt);
    this.players[1].update(dt);
  }

  private checkOutOfBounds(): void {
    const offense = this.offensePlayer;
    if (!offense.hasBall) return;

    const pos = offense.position;
    const margin = PLAYER_RADIUS;
    const oobMargin = 2; // small buffer so they don't trigger right at the edge

    const isOOB =
      pos.x <= COURT_LEFT + margin + oobMargin ||
      pos.x >= COURT_RIGHT - margin - oobMargin ||
      pos.y <= COURT_TOP + margin + oobMargin ||
      pos.y >= COURT_BOTTOM - margin - oobMargin;

    if (isOOB) {
      this.lastViolationPlayer = offense.playerIndex;
      this.phaseManager.flipPossession();
      this.transitionToPhase(GamePhase.Violation);
    }
  }

  private executeStepback(offense: PlayerSim, defense: PlayerSim): void {
    const sepCtx: SeparationContext = {
      offenseRatings: offense.ratings,
      defenseRatings: defense.ratings,
      offenseVelocity: offense.velocity,
    };
    const result = SeparationModel.calculate(sepCtx);

    const awayFromHoop = offense.position.subtract(this.court.hoopPosition).normalize();
    offense.stepbackVelocity = awayFromHoop.scale(result.burstVelocity);
    offense.fsm.setState(PLAYER_STATE.STEPBACK);
  }

  private executeCrossover(offense: PlayerSim, defense: PlayerSim): void {
    // Calculate perpendicular direction to offense→hoop vector
    const toHoop = this.court.hoopPosition.subtract(offense.position).normalize();
    const perpendicular = new Vector2(-toHoop.y, toHoop.x); // rotate 90 degrees

    // Choose side based on offense facing angle
    const facingDir = Vector2.fromAngle(offense.facingAngle, 1);
    const dot = facingDir.x * perpendicular.x + facingDir.y * perpendicular.y;
    const defenderShiftDir = dot >= 0 ? perpendicular : perpendicular.scale(-1);

    // Scale by ball handling vs defense ratings
    const handlingFactor = offense.ratings.steal / 100;
    const defenseFactor = defense.ratings.defense / 100;
    const effectiveness = 0.5 + 0.5 * (handlingFactor - defenseFactor * 0.6);
    const clampedEffect = Math.max(0.3, Math.min(1.0, effectiveness));

    // Push defender sideways
    const shiftAmount = CROSSOVER_SHIFT_DISTANCE * clampedEffect;
    defense.position = defense.position.add(defenderShiftDir.scale(shiftAmount));

    // Give offense a small burst in the opposite direction
    const offenseBurst = defenderShiftDir.scale(-120 * clampedEffect);
    offense.crossoverVelocity = offenseBurst;
    offense.fsm.setState(PLAYER_STATE.CROSSOVER);
  }

  private executeShot(offense: PlayerSim, defense: PlayerSim): void {
    const distToHoop = this.court.distanceToHoop(offense.position);
    const isBehindThree = this.court.isBehindThreePointLine(offense.position);

    const defCtx: DefenseContext = {
      defenderPosition: defense.position,
      shooterPosition: offense.position,
      defenderVelocity: defense.velocity,
      defenderRatings: defense.ratings,
      isInDefenseStance: defense.fsm.isInState(PLAYER_STATE.DEFENDING),
    };
    const contestPercent = DefenseModel.calculateContestPercent(defCtx);
    this.lastContestPercent = contestPercent;

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

    const willScore = ShotModel.rollShot(probability);

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
      case GamePhase.Violation:
        // Ball handler went out of bounds - possession flipped already
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
