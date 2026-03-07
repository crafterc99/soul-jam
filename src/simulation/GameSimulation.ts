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
  STEAL_RANGE, STEAL_BASE_CHANCE, STEAL_COOLDOWN,
  STEPBACK_DEFENDER_FREEZE, CROSSOVER_DEFENDER_SHIFT,
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
  lastStealResult: 'none' | 'success' | 'fail' = 'none';

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

    // Clamp positions to court bounds
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
    const defenseInput = defense.playerIndex === 0 ? p1Input : p2Input;

    const isInStepback = offense.fsm.isInState(PLAYER_STATE.STEPBACK);
    const isInCrossover = offense.fsm.isInState(PLAYER_STATE.CROSSOVER);
    const offenseInBurstMove = isInStepback || isInCrossover;
    // After stepback movement ends, player is in dead ball (can only shoot)
    const stepbackDeadBall = isInStepback && offense.stateTimer >= offense.stepbackDuration;

    // Handle stepback
    if (offenseInput.stepbackPressed && offense.hasBall &&
        !offenseInBurstMove &&
        !offense.fsm.isInState(PLAYER_STATE.SHOOTING)) {
      this.executeStepback(offense, defense);
    }

    // Handle crossover
    if (offenseInput.crossoverPressed && offense.hasBall &&
        !offenseInBurstMove &&
        !offense.fsm.isInState(PLAYER_STATE.SHOOTING)) {
      this.executeCrossover(offense, defense);
    }

    // Handle shoot press (allowed during stepback dead ball — it's the only option)
    if (offenseInput.shootPressed && offense.hasBall &&
        !offense.fsm.isInState(PLAYER_STATE.SHOOTING) &&
        (!offenseInBurstMove || stepbackDeadBall)) {
      offense.fsm.setState(PLAYER_STATE.SHOOTING);
    }

    // Handle shot release
    if (offense.fsm.isInState(PLAYER_STATE.SHOOTING) && offense.shotReleased && offense.hasBall) {
      this.executeShot(offense, defense);
    }

    // Handle steal attempt (defense only)
    if (defenseInput.stealPressed && !defense.hasBall &&
        !defense.fsm.isInState(PLAYER_STATE.STEAL_REACH) &&
        defense.stealCooldown <= 0) {
      this.executeSteal(offense, defense);
    }

    // Update players
    offense.update(dt);
    defense.update(dt);

    // Clamp burst moves to court bounds (prevent OOB from stepback/crossover)
    if (offense.fsm.isInState(PLAYER_STATE.STEPBACK) ||
        offense.fsm.isInState(PLAYER_STATE.CROSSOVER)) {
      offense.position = this.court.clampPlayerPosition(offense.position);
    }

    // Player collision
    this.resolvePlayerCollision();

    // Out of bounds check — only during normal movement (not burst moves)
    if (!offense.fsm.isInState(PLAYER_STATE.STEPBACK) &&
        !offense.fsm.isInState(PLAYER_STATE.CROSSOVER)) {
      this.checkOutOfBounds();
    }
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

    // Use the court's proper OOB check (player circle past the court line)
    if (this.court.isOutOfBounds(offense.position)) {
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

    // Freeze defender for 1s — stepback creates real separation advantage
    defense.fsm.setState(PLAYER_STATE.STEAL_REACH);
    defense.stateTimer = -(STEPBACK_DEFENDER_FREEZE - 0.5); // extend freeze beyond normal 0.5s
  }

  private executeCrossover(offense: PlayerSim, defense: PlayerSim): void {
    // Use SeparationModel for proper burst velocity (same system as stepback)
    const sepCtx: SeparationContext = {
      offenseRatings: offense.ratings,
      defenseRatings: defense.ratings,
      offenseVelocity: offense.velocity,
    };
    const result = SeparationModel.calculate(sepCtx);

    // Calculate perpendicular direction to offense->hoop vector
    const toHoop = this.court.hoopPosition.subtract(offense.position).normalize();
    const perpendicular = new Vector2(-toHoop.y, toHoop.x);

    // Choose side based on movement input — if pressing a direction, go that way
    // If no input, pick the side away from the defender
    const input = offense.currentInput;
    let crossDir: Vector2;

    if (input && (input.moveX !== 0 || input.moveY !== 0)) {
      const moveDir = new Vector2(input.moveX, input.moveY).normalize();
      const dot = moveDir.x * perpendicular.x + moveDir.y * perpendicular.y;
      crossDir = dot >= 0 ? perpendicular : perpendicular.scale(-1);
    } else {
      // Default: go away from defender
      const awayFromDefender = offense.position.subtract(defense.position).normalize();
      const dot = awayFromDefender.x * perpendicular.x + awayFromDefender.y * perpendicular.y;
      crossDir = dot >= 0 ? perpendicular : perpendicular.scale(-1);
    }

    // Apply lateral burst to offense
    offense.crossoverVelocity = crossDir.scale(result.burstVelocity);
    offense.fsm.setState(PLAYER_STATE.CROSSOVER);

    // Crossover shifts defender in the WRONG direction (they bite on the fake)
    const fakeDir = crossDir.scale(-1); // opposite of offense's actual direction
    defense.position = defense.position.add(fakeDir.scale(CROSSOVER_DEFENDER_SHIFT));
  }

  private executeSteal(offense: PlayerSim, defense: PlayerSim): void {
    const dist = defense.position.distanceTo(offense.position);

    // Start cooldown regardless
    defense.stealCooldown = STEAL_COOLDOWN;

    // Must be close enough to attempt
    if (dist > STEAL_RANGE) {
      // Too far — reach-in freeze penalty for swiping at air
      defense.fsm.setState(PLAYER_STATE.STEAL_REACH);
      this.lastStealResult = 'fail';
      return;
    }

    // Calculate steal chance
    const defStealRating = defense.ratings.steal / 100;
    const offHandling = offense.ratings.steal / 100; // steal = ball handling on offense
    let stealChance = STEAL_BASE_CHANCE + (defStealRating - offHandling) * 0.25;

    // Bonus if offense is mid-move (vulnerable during crossover/stepback)
    if (offense.fsm.isInState(PLAYER_STATE.CROSSOVER) ||
        offense.fsm.isInState(PLAYER_STATE.STEPBACK)) {
      stealChance += 0.15;
    }

    // Bonus if defender is in defense stance
    if (defense.fsm.isInState(PLAYER_STATE.DEFENDING)) {
      stealChance += 0.10;
    }

    // Penalty if offense is stationary (protecting ball)
    if (offense.velocity.length() < 10) {
      stealChance -= 0.10;
    }

    stealChance = Math.max(0.05, Math.min(0.70, stealChance));

    if (Math.random() < stealChance) {
      // Steal success — turnover
      this.lastStealResult = 'success';
      this.lastViolationPlayer = offense.playerIndex;
      this.phaseManager.flipPossession();
      this.transitionToPhase(GamePhase.CheckBall);
    } else {
      // Steal fail — defender gets frozen (reach-in foul penalty)
      this.lastStealResult = 'fail';
      defense.fsm.setState(PLAYER_STATE.STEAL_REACH);
    }
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

    // Release ball from above player's head, slightly toward hoop
    const toHoop = this.court.hoopPosition.subtract(offense.position).normalize();
    const releasePos = new Vector2(
      offense.position.x + toHoop.x * 10,
      offense.position.y - offense.jumpHeight - 20, // above head during jump
    );
    this.ball.launchShot(releasePos, this.court.hoopPosition, willScore);

    this.phaseManager.setPhase(GamePhase.Shooting);
  }

  private resolvePlayerCollision(): void {
    const p1 = this.players[0];
    const p2 = this.players[1];
    const offense = this.offensePlayer;
    const dist = p1.position.distanceTo(p2.position);
    const minDist = PLAYER_RADIUS * 2;

    // During stepback dead ball, offense can't be pushed
    const isStepbackDeadBall = offense.fsm.isInState(PLAYER_STATE.STEPBACK) &&
      offense.stateTimer >= offense.stepbackDuration;

    if (dist < minDist && dist > 0) {
      const overlap = minDist - dist;
      const pushDir = p1.position.subtract(p2.position).normalize();
      if (isStepbackDeadBall) {
        // Only push the defender away, offense holds position
        const defIdx = offense === p1 ? 1 : 0;
        if (defIdx === 1) {
          p2.position = p2.position.add(pushDir.scale(-overlap));
        } else {
          p1.position = p1.position.add(pushDir.scale(overlap));
        }
      } else {
        p1.position = p1.position.add(pushDir.scale(overlap / 2));
        p2.position = p2.position.add(pushDir.scale(-overlap / 2));
      }
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
        this.lastStealResult = 'none';
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
