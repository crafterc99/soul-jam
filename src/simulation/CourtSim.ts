import { Vector2 } from '../utils/Vector2';
import {
  COURT_LEFT, COURT_RIGHT, COURT_TOP, COURT_BOTTOM,
  HOOP_X, HOOP_Y, THREE_POINT_RADIUS, PLAYER_RADIUS,
} from '../config/Constants';

export class CourtSim {
  readonly hoopPosition = new Vector2(HOOP_X, HOOP_Y);

  clampPlayerPosition(pos: Vector2): Vector2 {
    const margin = PLAYER_RADIUS;
    return new Vector2(
      Math.max(COURT_LEFT + margin, Math.min(COURT_RIGHT - margin, pos.x)),
      Math.max(COURT_TOP + margin, Math.min(COURT_BOTTOM - margin, pos.y)),
    );
  }

  isInBounds(pos: Vector2): boolean {
    return (
      pos.x >= COURT_LEFT && pos.x <= COURT_RIGHT &&
      pos.y >= COURT_TOP && pos.y <= COURT_BOTTOM
    );
  }

  isBehindThreePointLine(pos: Vector2): boolean {
    const dist = pos.distanceTo(this.hoopPosition);
    return dist > THREE_POINT_RADIUS;
  }

  distanceToHoop(pos: Vector2): number {
    return pos.distanceTo(this.hoopPosition);
  }

  getCheckBallPosition(): Vector2 {
    // Top of the arc, center court
    return new Vector2(HOOP_X - THREE_POINT_RADIUS - 60, HOOP_Y);
  }

  getInboundOffensePosition(): Vector2 {
    return new Vector2(HOOP_X - THREE_POINT_RADIUS - 40, HOOP_Y);
  }

  getInboundDefensePosition(): Vector2 {
    return new Vector2(HOOP_X - THREE_POINT_RADIUS + 40, HOOP_Y);
  }
}
