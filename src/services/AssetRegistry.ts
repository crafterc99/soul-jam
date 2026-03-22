import { CharacterDef, CourtDef } from '../data/types';

interface AssetEntry {
  path: string;
  type: 'image' | 'spritesheet';
  config?: { frameWidth: number; frameHeight: number };
}

export class AssetRegistry {
  private map = new Map<string, AssetEntry>();

  register(key: string, path: string, type: 'image' | 'spritesheet', config?: { frameWidth: number; frameHeight: number }): void {
    this.map.set(key, { path, type, config });
  }

  resolve(key: string): AssetEntry | undefined {
    return this.map.get(key);
  }

  getAll(): Map<string, AssetEntry> {
    return this.map;
  }

  registerCharacter(def: CharacterDef): void {
    // Static sprite
    this.register(def.sprites.staticKey, `assets/images/${def.sprites.staticKey.replace('char-', '')}full.png`, 'image');

    // Portrait
    this.register(def.assets.portrait, `assets/images/${def.assets.portrait}.png`, 'image');

    // Select background
    this.register(def.assets.selectBg, `assets/images/${def.id === 'ninetynine' ? '99' : def.id}-player-select.webp`, 'image');

    // Spritesheets
    const frameConfig = { frameWidth: def.sprites.frameSize, frameHeight: def.sprites.frameSize };
    for (const anim of Object.values(def.sprites.animations)) {
      if (!this.map.has(anim.textureKey)) {
        this.register(anim.textureKey, `assets/images/${anim.textureKey}.png`, 'spritesheet', frameConfig);
      }
    }
  }

  registerCourt(def: CourtDef): void {
    if (def.assets.floor && !this.map.has(def.assets.floor)) {
      this.register(def.assets.floor, `assets/images/${def.assets.floor}.webp`, 'image');
    }
    if (def.assets.thumbnail && !this.map.has(def.assets.thumbnail)) {
      this.register(def.assets.thumbnail, `assets/images/${def.assets.thumbnail}.webp`, 'image');
    }
    if (def.assets.centerLogo && !this.map.has(def.assets.centerLogo)) {
      this.register(def.assets.centerLogo, `assets/images/${def.assets.centerLogo}.png`, 'image');
    }
    if (def.assets.background && !this.map.has(def.assets.background)) {
      this.register(def.assets.background, `assets/images/${def.assets.background}.webp`, 'image');
    }
  }

  registerGlobalAssets(): void {
    this.register('loading-screen', 'assets/images/loading-screen.webp', 'image');
    this.register('playerselect-bg', 'assets/images/playerselect.jpg', 'image');
    this.register('basketball', 'assets/images/basketball.png', 'image');
  }
}

// Singleton instance
let _registry: AssetRegistry | null = null;

export function getAssetRegistry(): AssetRegistry {
  if (!_registry) {
    _registry = new AssetRegistry();
  }
  return _registry;
}

export function buildAssetRegistry(characters: Record<string, CharacterDef>, courts: Record<string, CourtDef>): AssetRegistry {
  const registry = getAssetRegistry();
  registry.registerGlobalAssets();
  for (const char of Object.values(characters)) {
    registry.registerCharacter(char);
  }
  for (const court of Object.values(courts)) {
    registry.registerCourt(court);
  }
  return registry;
}
