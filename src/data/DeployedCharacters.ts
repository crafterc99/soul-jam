import { AnimationDef } from './types';

export interface DeployedCharacterEntry {
  id: string;
  name: string;
  spriteSize: number;
  deployedAt: string;
  animations: Record<string, AnimationDef>;
}

interface CharactersRegistry {
  version: string;
  characters: Record<string, DeployedCharacterEntry>;
}

let _registry: CharactersRegistry = { version: '1', characters: {} };

export function getDeployedCharacters(): Record<string, DeployedCharacterEntry> {
  return _registry.characters;
}

export async function loadDeployedRegistry(): Promise<void> {
  try {
    const res = await fetch('/characters-registry.json');
    if (!res.ok) return;
    const data: CharactersRegistry = await res.json();
    _registry = data;
    const count = Object.keys(data.characters).length;
    if (count > 0) {
      console.log(`[SpriteFactory] ${count} deployed character(s) loaded from registry`);
    }
  } catch {
    // No registry yet — use hardcoded CHARACTERS only
  }
}
