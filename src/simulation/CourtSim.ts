import { Vector2 } from '../utils/Vector2';
import {
  COURT_LEFT, COURT_RIGHT, COURT_TOP, COURT_BOTTOM,
  HOOP_X, HOOP_Y, THREE_POINT_RADIUS, PLAYER_RADIUS,
  CORNER_THREE_ZONE, CORNER_THREE_RADIUS,
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

  /** Check if position is out of bounds (player center past the court line + radius) */
  isOutOfBounds(pos: Vector2): boolean {
    const margin = PLAYER_RADIUS;
    return (
      pos.x < COURT_LEFT + margin ||
      pos.x > COURT_RIGHT - margin ||
      pos.y < COURT_TOP + margin ||
      pos.y > COURT_BOTTOM - margin
    );
  }

  isBehindThreePointLine(pos: Vector2): boolean {
    const dist = pos.distanceTo(this.hoopPosition);

    // Corner 3: near sidelines, use shorter distance (like real NBA courts)
    // NBA corner 3 = 22ft vs arc 3 = 23'9"
    const distToTopSideline = pos.y - COURT_TOP;
    const distToBottomSideline = COURT_BOTTOM - pos.y;
    const nearestSideline = Math.min(distToTopSideline, distToBottomSideline);

    if (nearestSideline < CORNER_THREE_ZONE) {
      // In corner zone: use shorter corner 3 radius
      // Blend smoothly between corner and arc radius based on distance to sideline
      const t = nearestSideline / CORNER_THREE_ZONE; // 0 at sideline, 1 at zone edge
      const effectiveRadius = CORNER_THREE_RADIUS + (THREE_POINT_RADIUS - CORNER_THREE_RADIUS) * t;
      return dist > effectiveRadius;
    }

    return dist > THREE_POINT_RADIUS;
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
