export interface AIPersonality {
  aggression: number;      // 0-1, how often AI drives to basket vs plays safe
  shotTendency: number;    // 0-1, how eagerly AI shoots
  reactionDelay: number;   // seconds of delay before reacting to opponent
  defenseIntensity: number; // 0-1, how tightly AI defends
}

export const AI_PRESETS: Record<string, AIPersonality> = {
  easy: {
    aggression: 0.3,
    shotTendency: 0.4,
    reactionDelay: 0.5,
    defenseIntensity: 0.3,
  },
  medium: {
    aggression: 0.5,
    shotTendency: 0.6,
    reactionDelay: 0.25,
    defenseIntensity: 0.6,
  },
  hard: {
    aggression: 0.7,
    shotTendency: 0.75,
    reactionDelay: 0.1,
    defenseIntensity: 0.85,
  },
};
