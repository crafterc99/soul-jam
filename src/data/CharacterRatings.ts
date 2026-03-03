export interface CharacterRatings {
  speed: number;              // max movement speed
  power: number;              // physicality, acceleration, body control
  range: number;              // shot accuracy from distance
  defense: number;            // contest effectiveness + lateral quickness
  steal: number;              // ball handling on offense, steal chance on defense
  clutchEnergy: number;       // contest resistance + timing bonus multiplier
}

export interface CharacterDef {
  id: string;
  name: string;
  title: string;             // subtitle (e.g. "Soul Guard")
  color: number;             // fallback rectangle color
  spriteKey: string;         // asset key for character sprite
  ratings: CharacterRatings;
}
