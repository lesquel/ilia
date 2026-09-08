/**
 * Design tokens, transcribed from the mockup's `:root` block.
 *
 * Source of truth: `docs/mockup/plataforma-educativa-ia.source.html`.
 * If a value changes there, it changes here — not the other way around.
 */

/**
 * Tonal ramps. Generated in OKLCH on one shared lightness scale, so step N of
 * any ramp carries the same visual value as step N of the others. That is what
 * lets a neutral surface and an accent surface sit side by side without one
 * looking heavier than the other.
 */
export const ramps = {
  neutral: {
    100: '#f5f5f8',
    200: '#e7e7ea',
    300: '#d4d4d7',
    400: '#b7b7ba',
    500: '#98989b',
    600: '#7a7a7d',
    700: '#5d5d60',
    800: '#424244',
    900: '#2b2b2d',
  },
  accent: {
    100: '#eef6ff',
    200: '#d6ebff',
    300: '#b5d9fd',
    400: '#94bce3',
    500: '#749dc4',
    600: '#597ea3',
    700: '#416180',
    800: '#2c455d',
    900: '#1d2d3d',
  },
  accentAlt: {
    100: '#eef6ff',
    200: '#d6ebff',
    300: '#bdd8f2',
    400: '#9ebbd8',
    500: '#7e9cb8',
    600: '#627d98',
    700: '#486077',
    800: '#314457',
    900: '#1f2d3a',
  },
} as const;

/**
 * Semantic colors per theme.
 *
 * `divider` is flattened from the mockup's `color-mix()`, which React Native
 * cannot evaluate: light is `#1d1f20` at 16%, dark is `#e8eaec` at 18%.
 */
export const palette = {
  light: {
    bg: '#f2f2f3',
    surface: '#e9e9ea',
    text: '#1d1f20',
    accent: '#5980a6',
    accentAlt: '#728fab',
    divider: 'rgba(29, 31, 32, 0.16)',
    neutral: ramps.neutral,
    accentRamp: ramps.accent,
    accentAltRamp: ramps.accentAlt,
  },
  dark: {
    bg: '#15181b',
    surface: '#1d2126',
    text: '#e8eaec',
    accent: '#7ea6cd',
    accentAlt: '#7ea6cd',
    divider: 'rgba(232, 234, 236, 0.18)',
    neutral: {
      ...ramps.neutral,
      100: '#22262b',
      200: '#2b3036',
      800: '#c9ced3',
    },
    accentRamp: {
      ...ramps.accent,
      100: '#1f2c39',
      200: '#26384a',
      800: '#bcd6ef',
    },
    accentAltRamp: {
      ...ramps.accentAlt,
      100: '#1f2c39',
      800: '#bcd6ef',
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

/**
 * Spacing scale, base 3.4. Kept at the mockup's exact values rather than
 * rounded to a 4pt grid, so a screen ported from the mockup lands on the same
 * rhythm instead of drifting a little at every nesting level.
 */
export const space = {
  1: 3.4,
  2: 6.8,
  3: 10.2,
  4: 13.6,
  6: 20.4,
  8: 27.2,
} as const;

export const radius = {
  sm: 2,
  md: 4,
  lg: 7,
} as const;

/**
 * Elevation. React Native has no box-shadow on Android, so each level carries
 * both the iOS/web shadow and the Android elevation that approximates it.
 */
export const shadow = {
  sm: {
    shadowColor: '#2b2b2d',
    shadowOpacity: 0.14,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  md: {
    shadowColor: '#2b2b2d',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  lg: {
    shadowColor: '#2b2b2d',
    shadowOpacity: 0.22,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
} as const;

/**
 * Breakpoints, taken from the mockup's container queries.
 *
 * `compact` is where the sidebar gives way to the bottom tab bar — the single
 * most consequential layout switch in the product, because it is what separates
 * the student's phone from the instructor's desktop.
 */
export const breakpoint = {
  compact: 760,
  medium: 1080,
} as const;

export type ThemeName = keyof typeof palette;
export type Palette = (typeof palette)[ThemeName];
