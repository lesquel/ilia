import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/core/theme';

/**
 * Skeletons: the screen's shape drawn before its data arrives.
 *
 * A spinner says "wait"; a skeleton says "this is what is coming", so the page
 * does not jump when the data lands and a slow connection does not look like an
 * empty one. Each screen draws its own skeleton from these pieces, matching its
 * real layout, inside one `Skeleton` so every bone pulses together.
 */

/**
 * The pulsing, accessible frame around a screen's bones.
 *
 * One animation for the whole group: bones pulsing out of step read as noise.
 * With reduced motion on, the shapes stay still.
 */
export function Skeleton({
  label,
  children,
  style,
}: {
  /** What is loading, for screen readers: "Cargando tus cursos". */
  label: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    opacity.value = withRepeat(
      withTiming(0.45, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [opacity, reduceMotion]);

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={[styles.group, pulse, style]}
    >
      {children}
    </Animated.View>
  );
}

/** One placeholder shape. Use inside `Skeleton`. */
export function Bone({
  width = '100%',
  height = 14,
  radius,
  circle = false,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  /** A round avatar or icon: `height` is the diameter. */
  circle?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          width: circle ? height : width,
          height,
          borderRadius: circle ? height / 2 : (radius ?? theme.radius.sm),
          backgroundColor: theme.colors.neutral[200],
        },
        style,
      ]}
    />
  );
}

/** A paragraph: full lines and a shorter last one, as real text ends. */
export function BoneLines({
  lines = 3,
  height = 12,
  gap = 8,
  lastWidth = '60%',
}: {
  lines?: number;
  height?: number;
  gap?: number;
  lastWidth?: DimensionValue;
}) {
  return (
    <View style={{ gap }}>
      {Array.from({ length: lines }, (_, index) => (
        <Bone key={index} height={height} width={index === lines - 1 ? lastWidth : '100%'} />
      ))}
    </View>
  );
}

/** A card frame in the app's surface colour, for skeletons of card layouts. */
export function BoneCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.divider,
          borderRadius: theme.radius.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** A list row: a round mark, a title and a shorter detail line. */
export function BoneRow({ withAvatar = true }: { withAvatar?: boolean }) {
  return (
    <View style={styles.row}>
      {withAvatar ? <Bone circle height={40} /> : null}
      <View style={styles.rowText}>
        <Bone height={14} width="70%" />
        <Bone height={11} width="45%" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 16,
  },
  card: {
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  rowText: {
    flex: 1,
    gap: 8,
  },
});
