export interface CharacterRatings {
  speed: number;              // max movement speed
  acceleration: number;       // how fast player reaches max speed
  ballHandle: number;         // separation creation effectiveness
  shotRating: number;         // base shot accuracy
  defense: number;            // contest effectiveness
  lateralQuickness: number;   // defensive shuffle speed
  contestResistance: number;  // ability to make contested shots
}

export interface CharacterDef {
  id: string;
  name: string;
  color: number; // placeholder rectangle color
  ratings: CharacterRatings;
}
