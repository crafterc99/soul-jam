import { Vector2 } from '../utils/Vector2';
import { CharacterRatings } from '../data/CharacterRatings';
import { IPlayerInput } from '../input/IPlayerInput';
import { StateMachine } from './StateMachine';
import {
  IdleState, RunState, DefendingState, StepbackState, CrossoverState, ShootingState,
  PLAYER_STATE,
} from './PlayerStates';
import { STEPBACK_DURATION } from '../config/Constants';

export class PlayerSim {
  position: Vector2;
  velocity: Vector2 = Vector2.zero();
  facingAngle: number = 0;
  ratings: CharacterRatings;
  hasBall: boolean = false;
  playerIndex: number;
  color: number;

  // State machine
  fsm: StateMachine<PlayerSim>;
  currentInput: IPlayerInput | null = null;

  // State timers
  stateTimer: number = 0;
  stepbackDuration: number = STEPBACK_DURATION;
  stepbackVelocity: Vector2 = Vector2.zero();
  crossoverVelocity: Vector2 = Vector2.zero();

  // Shooting
  shotReleased: boolean = false;
  shotTimingValue: number = 0;

  constructor(index: number, position: Vector2, ratings: CharacterRatings, color: number) {
    this.playerIndex = index;
    this.position = position.clone();
    this.ratings = ratings;
    this.color = color;

    this.fsm = new StateMachine<PlayerSim>(this);
    this.fsm.addState(new IdleState());
    this.fsm.addState(new RunState());
    this.fsm.addState(new DefendingState());
    this.fsm.addState(new StepbackState());
    this.fsm.addState(new CrossoverState());
    this.fsm.addState(new ShootingState());
    this.fsm.setState(PLAYER_STATE.IDLE);
  }

  get stateName(): string {
    return this.fsm.currentStateName;
  }

  setInput(input: IPlayerInput): void {
    this.currentInput = input;
  }

  update(dt: number): void {
    this.fsm.update(dt);
  }

  reset(position: Vector2): void {
    this.position = position.clone();
    this.velocity = Vector2.zero();
    this.hasBall = false;
    this.fsm.setState(PLAYER_STATE.IDLE);
    this.stateTimer = 0;
    this.shotReleased = false;
    this.shotTimingValue = 0;
  }
}
