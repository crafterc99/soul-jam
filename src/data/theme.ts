import { ThemeDef } from './types';
import { getActiveSkin } from './skins';

export const DEFAULT_THEME: ThemeDef = {
  id: 'default',
  colors: {
    background: '#1a1a2e',
    surface: '#0a0a2a',
    primary: '#ff6600',
    text: '#ffffff',
    textDim: '#888888',
  },
  fonts: {
    heading: 'monospace',
    body: 'monospace',
    score: 'monospace',
  },
  assets: {
    menuBg: 'loading-screen',
  },
};

/**
 * @deprecated Use getActiveSkin() directly for skin-driven values.
 * This wrapper exists for backwards compatibility with code that still reads ThemeDef.
 */
export function getTheme(): ThemeDef {
  const skin = getActiveSkin();
  return {
    id: skin.id,
    colors: {
      background: '#' + ((skin.screens.courtSelect.bg as { color: number }).color?.toString(16).padStart(6, '0') || DEFAULT_THEME.colors.background.replace('#', '')),
      surface: '#' + skin.hud.scoreboard.bgColor.toString(16).padStart(6, '0'),
      primary: skin.hud.scoreboard.scoreColor,
      text: '#ffffff',
      textDim: skin.hud.controlsHint.color,
    },
    fonts: {
      heading: skin.hud.scoreboard.scoreFont,
      body: skin.hud.feedback.font,
      score: skin.hud.scoreboard.scoreFont,
    },
    assets: {
      menuBg: 'key' in skin.screens.menu.bg ? (skin.screens.menu.bg as { key: string }).key : undefined,
    },
  };
}
