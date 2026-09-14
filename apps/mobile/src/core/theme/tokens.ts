/**
 * Design tokens.
 *
 * Color follows the official lockup (paper, ink, #1B70FE). Corners are
 * soft on purpose: the mark is geometric, the product is not a grid of
 * razor boxes. Light only. Spacing still uses the mockup's 3.4 scale.
 */

export const ramps = {
  neutral: {
    100: '#f4f4f4',
    200: '#e6e6e6',
    300: '#d0d0d0',
    400: '#b0b0b0',
    500: '#8a8a8a',
    600: '#6b6b6b',
    700: '#4a4a4a',
    800: '#2a2a2a',
    900: '#111111',
  },
  accent: {
    100: '#e8f1ff',
    200: '#c5dbff',
    300: '#8fb8ff',
    400: '#4d8eff',
    500: '#1b70fe',
    600: '#0e58d6',
    700: '#0a43a8',
    800: '#082e75',
    900: '#061833',
  },
  accentAlt: {
    100: '#e8f1ff',
    200: '#c5dbff',
    300: '#8fb8ff',
    400: '#4d8eff',
    500: '#1b70fe',
    600: '#0e58d6',
    700: '#0a43a8',
    800: '#082e75',
    900: '#061833',
  },
} as const;

export const palette = {
  light: {
    bg: '#f6f8fb',
    surface: '#ffffff',
    text: '#111111',
    accent: '#1b70fe',
    accentAlt: '#0e58d6',
    divider: 'rgba(17, 17, 17, 0.1)',
    neutral: ramps.neutral,
    accentRamp: ramps.accent,
    accentAltRamp: ramps.accentAlt,
  },
  dark: {
    bg: '#0a0a0a',
    surface: '#141414',
    text: '#ffffff',
    accent: '#1b70fe',
    accentAlt: '#4d8eff',
    divider: 'rgba(255, 255, 255, 0.16)',
    neutral: {
      ...ramps.neutral,
      100: '#1a1a1a',
      200: '#242424',
      800: '#d4d4d4',
    },
    accentRamp: {
      ...ramps.accent,
      100: '#0b1a33',
      200: '#0d2450',
      800: '#c5dbff',
    },
    accentAltRamp: {
      ...ramps.accentAlt,
      100: '#0b1a33',
      800: '#c5dbff',
    },
  },
} as const;

export const typography = {
  heading: {
    family: 'BarlowCondensed_600SemiBold',
    weight: '600',
  },
  body: {
    family: 'Barlow_400Regular',
    weight: '400',
  },
} as const;

export const space = {
  1: 3.4,
  2: 6.8,
  3: 10.2,
  4: 13.6,
  6: 20.4,
  8: 27.2,
} as const;

/** Soft rectangles, not the razor corners of the mark and not a pill. */
export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
} as const;

export const shadow = {
  sm: {
    shadowColor: '#1b70fe',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  md: {
    shadowColor: '#111111',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  lg: {
    shadowColor: '#111111',
    shadowOpacity: 0.1,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
} as const;

export const breakpoint = {
  compact: 760,
  medium: 1080,
} as const;

export type ThemeName = keyof typeof palette;
export type Palette = (typeof palette)[ThemeName];
