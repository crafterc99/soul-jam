import { Vector2 } from '../utils/Vector2';
import {
  COURT_LEFT, COURT_RIGHT, COURT_TOP, COURT_BOTTOM,
  HOOP_X, HOOP_Y, THREE_POINT_RADIUS, PLAYER_RADIUS,
} from '../config/Constants';

export class CourtSim {
  readonly hoopPosition = new Vector2(HOOP_X, HOOP_Y);

  // Top of the 3pt arc = same Y as the hoop (apex, directly in front of basket)
  private readonly checkBallY = HOOP_Y;

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
    return pos.distanceTo(this.hoopPosition) > THREE_POINT_RADIUS;
  }

  distanceToHoop(pos: Vector2): number {
    return pos.distanceTo(this.hoopPosition);
  }

  // Get the X position on the 3pt arc at a given Y
  private arcXAtY(y: number): number {
    const dy = y - HOOP_Y;
    const dxSq = THREE_POINT_RADIUS * THREE_POINT_RADIUS - dy * dy;
    if (dxSq <= 0) return HOOP_X + THREE_POINT_RADIUS;
    return HOOP_X + Math.sqrt(dxSq);
  }

  // Check ball / inbound at the TOP CENTER (apex) of the 3pt arc
  getCheckBallPosition(): Vector2 {
    const arcX = this.arcXAtY(this.checkBallY);
    return new Vector2(arcX + 50, this.checkBallY);
  }

  getInboundOffensePosition(): Vector2 {
    const arcX = this.arcXAtY(this.checkBallY);
    return new Vector2(arcX + 30, this.checkBallY);
  }

  getInboundDefensePosition(): Vector2 {
    const arcX = this.arcXAtY(this.checkBallY);
    return new Vector2(arcX - 30, this.checkBallY);
  }
}
