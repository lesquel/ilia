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
