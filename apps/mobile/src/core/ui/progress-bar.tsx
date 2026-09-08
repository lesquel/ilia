import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';

/**
 * A progress bar with its value stated in text.
 *
 * The number is not decoration: a bar alone is invisible to a screen reader and
 * hard to read at a glance on a phone held at arm's length.
 */
export function ProgressBar({
  percentage,
  label,
}: {
  percentage: number;
  label?: string;
}) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(100, percentage));

  return (
    <View style={styles.container}>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: clamped }}
        style={[
          styles.track,
          { backgroundColor: theme.colors.neutral[300], borderRadius: theme.radius.sm },
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              width: `${clamped}%`,
              backgroundColor: theme.colors.accent,
              borderRadius: theme.radius.sm,
            },
          ]}
        />
      </View>

      <Text style={[styles.label, { color: theme.colors.neutral[600] }]}>
        {label ?? `${clamped}% completado`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 3.4,
  },
  track: {
    height: 6,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  label: {
    fontSize: 12,
  },
});
