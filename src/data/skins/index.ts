import { SkinBundle } from './types';
import { DEFAULT_SKIN } from './defaultSkin';

let _activeSkin: SkinBundle = DEFAULT_SKIN;

export function getActiveSkin(): SkinBundle {
  return _activeSkin;
}

export function setActiveSkin(skin: SkinBundle): void {
  _activeSkin = skin;
}

export { DEFAULT_SKIN } from './defaultSkin';
export type { SkinBundle } from './types';
export type {
  AssetSlot,
  HexColor,
  CSSColor,
  CourtSkinDef,
  HoopSkinDef,
  PlayerEffectsSkinDef,
  HUDSkinDef,
  ScoreboardSkinDef,
  FeedbackSkinDef,
  TimingMeterSkinDef,
  CardSkinDef,
  ScreenSkinDef,
  PauseScreenSkinDef,
} from './types';
