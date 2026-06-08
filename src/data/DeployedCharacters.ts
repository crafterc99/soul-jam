import { AnimationDef } from './types';

export interface DeployedAnimDef extends AnimationDef {
  url?: string; // R2 public URL — use instead of local path when present
}

export interface DeployedCharacterEntry {
  id: string;
  name: string;
  spriteSize: number;
  deployedAt: string;
  animations: Record<string, DeployedAnimDef>;
}

interface CharactersRegistry {
  version: string;
  characters: Record<string, DeployedCharacterEntry>;
  _registryUrl?: string;
}

let _registry: CharactersRegistry = { version: '1', characters: {} };

export function getDeployedCharacters(): Record<string, DeployedCharacterEntry> {
  return _registry.characters;
}

export async function loadDeployedRegistry(): Promise<void> {
  // Try R2 URL first (set as build-time env var in Railway), then fall back to local copy
  const candidates = [
    (import.meta as any).env?.VITE_R2_REGISTRY_URL as string | undefined,
    '/characters-registry.json',
  ].filter(Boolean) as string[];

  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data: CharactersRegistry = await res.json();
      _registry = data;
      const count = Object.keys(data.characters).length;
      if (count > 0) {
        console.log(`[SpriteFactory] ${count} deployed character(s) loaded from ${url}`);
      }
      return;
    } catch {
      continue;
    }
  }
}
