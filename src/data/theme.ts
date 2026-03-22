import { ThemeDef } from './types';

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

export function getTheme(): ThemeDef {
  return DEFAULT_THEME;
}
