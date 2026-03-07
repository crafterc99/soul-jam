import { State } from './StateMachine';
import { PlayerSim } from './PlayerSim';
import { MovementModel } from './models/MovementModel';
import { Vector2 } from '../utils/Vector2';
import { CROSSOVER_DURATION, STEPBACK_DURATION, STEAL_FREEZE_DURATION } from '../config/Constants';

export const PLAYER_STATE = {
  IDLE: 'idle',
  RUN: 'run',
  DEFENDING: 'defending',
  STEPBACK: 'stepback',
  CROSSOVER: 'crossover',
  SHOOTING: 'shooting',
  STEAL_REACH: 'steal_reach',
} as const;

export class IdleState implements State<PlayerSim> {
  name = PLAYER_STATE.IDLE;

  enter(player: PlayerSim): void {
    // Player stops
  }

  update(player: PlayerSim, dt: number): void {
    const input = player.currentInput;
    if (!input) return;

    // Transition to run if moving
    if (input.moveX !== 0 || input.moveY !== 0) {
      if (input.defenseStance) {
        player.fsm.setState(PLAYER_STATE.DEFENDING);
      } else {
        player.fsm.setState(PLAYER_STATE.RUN);
      }
      return;
    }

    if (input.defenseStance) {
      player.fsm.setState(PLAYER_STATE.DEFENDING);
      return;
    }

    // Apply deceleration
    const result = MovementModel.applyMovement(
      player.position, player.velocity,
      0, 0, player.ratings, false, dt,
    );
    player.position = result.position;
    player.velocity = result.velocity;
  }
}

export class RunState implements State<PlayerSim> {
  name = PLAYER_STATE.RUN;

  update(player: PlayerSim, dt: number): void {
    const input = player.currentInput;
    if (!input) return;

    if (input.moveX === 0 && input.moveY === 0) {
      player.fsm.setState(PLAYER_STATE.IDLE);
      return;
    }

    if (input.defenseStance) {
      player.fsm.setState(PLAYER_STATE.DEFENDING);
      return;
    }

    const result = MovementModel.applyMovement(
      player.position, player.velocity,
      input.moveX, input.moveY, player.ratings, false, dt,
    );
    player.position = result.position;
    player.velocity = result.velocity;

    // Update facing direction
    if (input.moveX !== 0 || input.moveY !== 0) {
      player.facingAngle = Math.atan2(input.moveY, input.moveX);
    }
  }
}

export class DefendingState implements State<PlayerSim> {
  name = PLAYER_STATE.DEFENDING;

  update(player: PlayerSim, dt: number): void {
    const input = player.currentInput;
    if (!input) return;

    if (!input.defenseStance) {
      if (input.moveX !== 0 || input.moveY !== 0) {
        player.fsm.setState(PLAYER_STATE.RUN);
      } else {
        player.fsm.setState(PLAYER_STATE.IDLE);
      }
      return;
    }

    const result = MovementModel.applyMovement(
      player.position, player.velocity,
      input.moveX, input.moveY, player.ratings, true, dt,
    );
    player.position = result.position;
    player.velocity = result.velocity;

    if (input.moveX !== 0 || input.moveY !== 0) {
      player.facingAngle = Math.atan2(input.moveY, input.moveX);
    }
  }
}

export class StepbackState implements State<PlayerSim> {
  name = PLAYER_STATE.STEPBACK;

  enter(player: PlayerSim): void {
    player.stateTimer = 0;
  }

  update(player: PlayerSim, dt: number): void {
    player.stateTimer += dt;

    // During movement phase, move away from hoop at burst speed
    if (player.stateTimer < player.stepbackDuration) {
      const progress = player.stateTimer / player.stepbackDuration;
      const speedCurve = 1 - progress; // decelerate over time
      const stepVel = player.stepbackVelocity.scale(speedCurve);
      player.position = player.position.add(stepVel.scale(dt));
    }

    // After movement: dead ball — player holds position, can only shoot
    // (no transition to IDLE — shooting input is checked in GameSimulation)
    player.velocity = player.velocity.scale(0);
  }
}

export class CrossoverState implements State<PlayerSim> {
  name = PLAYER_STATE.CROSSOVER;

  enter(player: PlayerSim): void {
    player.stateTimer = 0;
  }

  update(player: PlayerSim, dt: number): void {
    player.stateTimer += dt;

    if (player.stateTimer >= player.crossoverDuration) {
      player.fsm.setState(PLAYER_STATE.IDLE);
      return;
    }

    // During crossover, apply lateral burst (same deceleration curve as stepback)
    const progress = player.stateTimer / player.crossoverDuration;
    const speedCurve = 1 - progress;
    const crossVel = player.crossoverVelocity.scale(speedCurve);
    player.position = player.position.add(crossVel.scale(dt));
  }
}

export class ShootingState implements State<PlayerSim> {
  name = PLAYER_STATE.SHOOTING;

  enter(player: PlayerSim): void {
    player.stateTimer = 0;
    player.shotReleased = false;
    player.jumpHeight = 0;
  }

  update(player: PlayerSim, dt: number): void {
    const input = player.currentInput;
    if (!input) return;

    player.stateTimer += dt;

    // Visual jump arc (doesn't move game position — only used by renderer)
    const jumpDuration = 0.6;
    const jumpPeak = 30;
    const t = Math.min(player.stateTimer / jumpDuration, 1);
    player.jumpHeight = Math.sin(t * Math.PI) * jumpPeak;

    // Wait for shoot release to actually trigger the shot
    if (input.shootReleased && !player.shotReleased) {
      player.shotReleased = true;
      player.shotTimingValue = player.stateTimer;
    }

    // After release, brief follow-through animation then return to idle
    if (player.shotReleased) {
      if (player.stateTimer > player.shotTimingValue + 0.3) {
        player.jumpHeight = 0;
        player.fsm.setState(PLAYER_STATE.IDLE);
      }
    }

    // If they hold too long without releasing, force release
    if (!player.shotReleased && player.stateTimer > 1.5) {
      player.shotReleased = true;
      player.shotTimingValue = player.stateTimer;
    }

    // Player is stationary while shooting
    player.velocity = player.velocity.scale(0);
  }
}

export class StealReachState implements State<PlayerSim> {
  name = PLAYER_STATE.STEAL_REACH;

  enter(player: PlayerSim): void {
    player.stateTimer = 0;
    player.velocity = player.velocity.scale(0); // stop movement
  }

  update(player: PlayerSim, dt: number): void {
    player.stateTimer += dt;

    // Frozen during reach-in animation
    if (player.stateTimer >= STEAL_FREEZE_DURATION) {
      player.fsm.setState(PLAYER_STATE.IDLE);
    }
  }
}
