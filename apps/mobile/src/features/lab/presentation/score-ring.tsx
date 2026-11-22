import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/core/theme';

/** The total as a ring: the arc is the score out of 100, the number sits inside. */
export function ScoreRing({
  score,
  color,
  size = 200,
}: {
  score: number;
  color: string;
  size?: number;
}) {
  const theme = useTheme();
  const shown = Math.max(0, Math.min(100, Math.round(score)));
  const stroke = size * 0.1;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityRole="image"
      accessibilityLabel={`Nota ${shown} de 100`}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={theme.colors.neutral[200]}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - shown / 100)}
          // Start at twelve o'clock, not at three.
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text
          style={[
            styles.value,
            {
              color: theme.colors.text,
              fontFamily: theme.typography.display.family,
              fontSize: size * 0.28,
            },
          ]}
        >
          {shown}
        </Text>
        <Text style={[styles.unit, { color: theme.colors.neutral[600] }]}>de 100</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  value: { includeFontPadding: false },
  unit: { fontSize: 13, fontWeight: '600' },
});
