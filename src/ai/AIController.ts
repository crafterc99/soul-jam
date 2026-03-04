import { IPlayerInput, emptyInput } from '../input/IPlayerInput';
import { GameSimulation } from '../simulation/GameSimulation';
import { GamePhase } from '../simulation/GameState';
import { AIPersonality, AI_PRESETS } from './AIPersonality';
import { PLAYER_STATE } from '../simulation/PlayerStates';
import { PlayerSim } from '../simulation/PlayerSim';
import { Vector2 } from '../utils/Vector2';
import { THREE_POINT_RADIUS, HOOP_X, HOOP_Y } from '../config/Constants';

type AIState = 'idle' | 'drive' | 'position' | 'stepback' | 'crossover' | 'shoot_windup' | 'shoot_release' | 'defend' | 'defend_close';

export class AIController {
  private personality: AIPersonality;
  private playerIndex: number;
  private decisionTimer: number = 0;
  private currentDecision: IPlayerInput = emptyInput();
  private aiState: AIState = 'idle';
  private targetPosition: Vector2 = Vector2.zero();
  private shootWindupTimer: number = 0;
  private targetReleaseTime: number = 0.38; // aim for good timing

  constructor(playerIndex: number, difficulty: string = 'medium') {
    this.playerIndex = playerIndex;
    this.personality = AI_PRESETS[difficulty] || AI_PRESETS.medium;
  }

  decide(sim: GameSimulation): IPlayerInput {
    const input = emptyInput();
    const me = sim.players[this.playerIndex];
    const opponent = sim.players[this.playerIndex === 0 ? 1 : 0];
    const phase = sim.phaseManager.phase;
    const iHaveBall = sim.phaseManager.possession === this.playerIndex;

    if (phase === GamePhase.GameOver || phase === GamePhase.Shooting) {
      return input;
    }

    // Handle shooting state machine (needs per-frame updates, not delayed)
    if (this.aiState === 'shoot_windup') {
      input.shootHeld = true;
      this.shootWindupTimer += 1 / 60;
      if (this.shootWindupTimer >= this.targetReleaseTime) {
        this.aiState = 'shoot_release';
      }
      this.currentDecision = { ...input };
      return input;
    }

    if (this.aiState === 'shoot_release') {
      input.shootHeld = false;
      input.shootReleased = true;
      this.aiState = 'idle';
      this.decisionTimer = 0.5; // pause after shooting
      this.currentDecision = { ...input };
      return input;
    }

    // Reaction delay for non-shooting decisions
    this.decisionTimer -= 1 / 60;
    if (this.decisionTimer > 0) {
      return this.currentDecision;
    }
    this.decisionTimer = this.personality.reactionDelay;

    if (iHaveBall && (phase === GamePhase.Live || phase === GamePhase.CheckBall || phase === GamePhase.Inbound)) {
      this.decideOffense(input, sim, me, opponent, phase);
    } else if (!iHaveBall && phase === GamePhase.Live) {
      this.decideDefense(input, me, opponent);
    } else if (!iHaveBall) {
      this.moveToward(input, me.position, sim.court.getInboundDefensePosition(), 15);
    }

    this.currentDecision = { ...input };
    return input;
  }

  private decideOffense(
    input: IPlayerInput,
    sim: GameSimulation,
    me: PlayerSim,
    opponent: PlayerSim,
    phase: GamePhase,
  ): void {
    const hoopPos = new Vector2(HOOP_X, HOOP_Y);
    const distToHoop = me.position.distanceTo(hoopPos);
    const distToDefender = me.position.distanceTo(opponent.position);

    // During check ball, just hold position
    if (phase === GamePhase.CheckBall || phase === GamePhase.Inbound) {
      this.aiState = 'idle';
      return;
    }

    // Can't act during stepback or crossover
    if (me.fsm.isInState(PLAYER_STATE.STEPBACK) || me.fsm.isInState(PLAYER_STATE.CROSSOVER)) {
      return;
    }

    // Already shooting
    if (me.fsm.isInState(PLAYER_STATE.SHOOTING)) {
      return;
    }

    // Step 1: If far from shooting range, drive to the hoop
    if (distToHoop > THREE_POINT_RADIUS + 30) {
      this.aiState = 'drive';
      // Pick a spot inside the arc, slightly randomized
      const angle = Math.atan2(me.position.y - hoopPos.y, me.position.x - hoopPos.x);
      const targetDist = THREE_POINT_RADIUS * 0.6;
      this.targetPosition = hoopPos.add(Vector2.fromAngle(angle, targetDist));
      this.moveToward(input, me.position, this.targetPosition, 20);
      return;
    }

    // Step 2: In range. If defender is close, consider stepback or crossover
    if (distToDefender < 55 && !me.fsm.isInState(PLAYER_STATE.STEPBACK) && !me.fsm.isInState(PLAYER_STATE.CROSSOVER)) {
      // Crossover when defender is in the driving lane (between offense and hoop)
      const toHoop = hoopPos.subtract(me.position).normalize();
      const toDefender = opponent.position.subtract(me.position).normalize();
      const inLane = toHoop.x * toDefender.x + toHoop.y * toDefender.y;

      if (inLane > 0.4 && Math.random() < this.personality.aggression * 0.35) {
        input.crossoverPressed = true;
        this.aiState = 'crossover';
        this.decisionTimer = 0.4;
        return;
      }

      if (Math.random() < this.personality.aggression * 0.4) {
        input.stepbackPressed = true;
        this.aiState = 'stepback';
        this.decisionTimer = 0.5;
        return;
      }
    }

    // Step 3: Decide to shoot
    const isOpen = distToDefender > 60;
    const shootChance = isOpen
      ? this.personality.shotTendency * 0.8
      : this.personality.shotTendency * 0.2;

    if (Math.random() < shootChance) {
      // Start shooting
      input.shootPressed = true;
      input.shootHeld = true;
      this.aiState = 'shoot_windup';
      this.shootWindupTimer = 0;
      // Vary timing based on personality
      this.targetReleaseTime = 0.33 + Math.random() * 0.12;
      return;
    }

    // Step 4: Jockey for position (move to a good spot, then stop)
    this.aiState = 'position';
    // Pick a stable spot instead of random jitter each frame
    if (this.targetPosition.lengthSquared() === 0 || me.position.distanceTo(this.targetPosition) < 15) {
      const angle = -Math.PI * 0.4 + Math.random() * Math.PI * 0.8; // arc on right side of hoop
      const dist = THREE_POINT_RADIUS * (0.5 + Math.random() * 0.3);
      this.targetPosition = hoopPos.add(Vector2.fromAngle(angle, dist));
    }
    this.moveToward(input, me.position, this.targetPosition, 15);
  }

  private decideDefense(
    input: IPlayerInput,
    me: PlayerSim,
    opponent: PlayerSim,
  ): void {
    const hoopPos = new Vector2(HOOP_X, HOOP_Y);
    const distToOpponent = me.position.distanceTo(opponent.position);

    // Position between opponent and hoop
    const toHoop = hoopPos.subtract(opponent.position).normalize();
    const cushion = 35 + (1 - this.personality.defenseIntensity) * 40;
    const idealDefPos = opponent.position.add(toHoop.scale(cushion));

    this.moveToward(input, me.position, idealDefPos, 10);

    // Defense stance when close
    if (distToOpponent < 90) {
      input.defenseStance = true;
      this.aiState = 'defend_close';

      // Attempt steal when very close and opponent is vulnerable
      if (distToOpponent < 50 && me.stealCooldown <= 0 &&
          !me.fsm.isInState(PLAYER_STATE.STEAL_REACH)) {
        const isOpponentVulnerable =
          opponent.fsm.isInState(PLAYER_STATE.CROSSOVER) ||
          opponent.fsm.isInState(PLAYER_STATE.STEPBACK);

        // Higher steal chance when opponent is mid-move
        const stealAttemptChance = isOpponentVulnerable
          ? this.personality.defenseIntensity * 0.6
          : this.personality.defenseIntensity * 0.15;

        if (Math.random() < stealAttemptChance) {
          input.stealPressed = true;
        }
      }
    } else {
      this.aiState = 'defend';
    }
  }

  private moveToward(input: IPlayerInput, from: Vector2, to: Vector2, deadzone: number): void {
    const diff = to.subtract(from);
    const dist = diff.length();
    if (dist < deadzone) {
      input.moveX = 0;
      input.moveY = 0;
      return;
    }
    const dir = diff.normalize();
    // Use full input magnitude (1.0) - let the movement model handle speed
    input.moveX = dir.x;
    input.moveY = dir.y;
  }
}
