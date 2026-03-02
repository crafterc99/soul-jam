import { IPlayerInput, emptyInput } from '../input/IPlayerInput';
import { GameSimulation } from '../simulation/GameSimulation';
import { GamePhase } from '../simulation/GameState';
import { AIPersonality, AI_PRESETS } from './AIPersonality';
import { PLAYER_STATE } from '../simulation/PlayerStates';
import { Vector2 } from '../utils/Vector2';
import { THREE_POINT_RADIUS, HOOP_X, HOOP_Y } from '../config/Constants';

export class AIController {
  private personality: AIPersonality;
  private playerIndex: number;
  private decisionTimer: number = 0;
  private currentDecision: IPlayerInput = emptyInput();

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

    // Only act during live/checkball/inbound
    if (phase === GamePhase.GameOver || phase === GamePhase.Shooting) {
      return input;
    }

    // Reaction delay
    this.decisionTimer -= 1 / 60;
    if (this.decisionTimer > 0) {
      return this.currentDecision;
    }
    this.decisionTimer = this.personality.reactionDelay;

    if (iHaveBall && (phase === GamePhase.Live || phase === GamePhase.CheckBall || phase === GamePhase.Inbound)) {
      this.decideOffense(input, sim, me, opponent);
    } else if (!iHaveBall && phase === GamePhase.Live) {
      this.decideDefense(input, sim, me, opponent);
    } else if (!iHaveBall) {
      // During check ball / inbound, just move toward defense position
      this.moveToward(input, me.position, sim.court.getInboundDefensePosition());
    }

    this.currentDecision = { ...input };
    return input;
  }

  private decideOffense(
    input: IPlayerInput,
    sim: GameSimulation,
    me: import('../simulation/PlayerSim').PlayerSim,
    opponent: import('../simulation/PlayerSim').PlayerSim,
  ): void {
    const hoopPos = new Vector2(HOOP_X, HOOP_Y);
    const distToHoop = me.position.distanceTo(hoopPos);
    const distToDefender = me.position.distanceTo(opponent.position);

    // If far from hoop, drive closer
    if (distToHoop > THREE_POINT_RADIUS + 50) {
      this.moveToward(input, me.position, hoopPos);
      return;
    }

    // If defender is close and we have handles, try stepback
    if (distToDefender < 60 && Math.random() < this.personality.aggression * 0.5) {
      input.stepbackPressed = true;
      return;
    }

    // Decide whether to shoot
    const shouldShoot = distToHoop < THREE_POINT_RADIUS + 80 &&
      (distToDefender > 50 || Math.random() < this.personality.shotTendency * 0.3);

    if (shouldShoot && !me.fsm.isInState(PLAYER_STATE.SHOOTING) && !me.fsm.isInState(PLAYER_STATE.STEPBACK)) {
      // Simulate a hold + release cycle
      if (!input.shootHeld) {
        input.shootPressed = true;
        input.shootHeld = true;
      }
      // AI releases after a decent timing (~0.35-0.45s, simulated via state timer)
      if (me.fsm.isInState(PLAYER_STATE.SHOOTING) && me.stateTimer > 0.3 + Math.random() * 0.15) {
        input.shootHeld = false;
        input.shootReleased = true;
      }
      return;
    }

    // Otherwise, jockey for position
    const jitter = new Vector2(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
    );
    const idealSpot = hoopPos.add(new Vector2(-THREE_POINT_RADIUS * 0.7, (Math.random() - 0.5) * 200));
    this.moveToward(input, me.position, idealSpot.add(jitter.scale(30)));
  }

  private decideDefense(
    input: IPlayerInput,
    sim: GameSimulation,
    me: import('../simulation/PlayerSim').PlayerSim,
    opponent: import('../simulation/PlayerSim').PlayerSim,
  ): void {
    // Stay between opponent and hoop
    const hoopPos = new Vector2(HOOP_X, HOOP_Y);
    const toHoop = hoopPos.subtract(opponent.position).normalize();
    const idealDefPos = opponent.position.add(toHoop.scale(40 * this.personality.defenseIntensity));

    this.moveToward(input, me.position, idealDefPos);

    // Hold defense stance when close
    const dist = me.position.distanceTo(opponent.position);
    if (dist < 100) {
      input.defenseStance = true;
    }
  }

  private moveToward(input: IPlayerInput, from: Vector2, to: Vector2): void {
    const diff = to.subtract(from);
    const dist = diff.length();
    if (dist < 5) {
      input.moveX = 0;
      input.moveY = 0;
      return;
    }
    const dir = diff.normalize();
    input.moveX = dir.x;
    input.moveY = dir.y;
  }
}
