export interface IPlayerInput {
  moveX: number;           // -1.0 to 1.0
  moveY: number;           // -1.0 to 1.0
  shootPressed: boolean;   // frame button pressed
  shootHeld: boolean;      // while held (timing meter)
  shootReleased: boolean;  // frame button released (triggers shot)
  stepbackPressed: boolean;
  crossoverPressed: boolean;
  stealPressed: boolean;   // defense: attempt steal
  defenseStance: boolean;  // held modifier
  pausePressed: boolean;
}

export function emptyInput(): IPlayerInput {
  return {
    moveX: 0,
    moveY: 0,
    shootPressed: false,
    shootHeld: false,
    shootReleased: false,
    stepbackPressed: false,
    crossoverPressed: false,
    stealPressed: false,
    defenseStance: false,
    pausePressed: false,
  };
}
