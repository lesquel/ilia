import { useColorScheme } from 'react-native';

import { type Palette, palette, radius, shadow, space, typography } from './tokens';

export interface Theme {
  colors: Palette;
  space: typeof space;
  radius: typeof radius;
  shadow: typeof shadow;
  typography: typeof typography;
}

export function useTheme(): Theme {
  const scheme = useColorScheme();

  return {
    colors: scheme === 'dark' ? palette.dark : palette.light,
    space,
    radius,
    shadow,
    typography,
  };
}
