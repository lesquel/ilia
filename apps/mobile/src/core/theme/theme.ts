import { type Palette, palette, radius, shadow, space, typography } from './tokens';

export interface Theme {
  colors: Palette;
  space: typeof space;
  radius: typeof radius;
  shadow: typeof shadow;
  typography: typeof typography;
}

/**
 * Light only. The official lockup lives on paper; following the OS into
 * dark mode turned the institute into a night app, which is not the brand.
 * `palette.dark` remains contrast-safe for tools that need to inspect it, but
 * it is intentionally not exposed as a selectable application theme.
 */
export function useTheme(): Theme {
  return {
    colors: palette.light,
    space,
    radius,
    shadow,
    typography,
  };
}
