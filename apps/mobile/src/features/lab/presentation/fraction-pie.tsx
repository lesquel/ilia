import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { useTheme } from '@/core/theme';
import type { FractionPieFigure } from '@/features/lab/domain/generated-sheet';

const PIE_SIZE = 72;
const PIE_RADIUS = 32;

function polarPoint(center: number, radius: number, angleRadians: number) {
  return {
    x: center + radius * Math.cos(angleRadians),
    y: center + radius * Math.sin(angleRadians),
  };
}

function slicePath(
  center: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarPoint(center, radius, startAngle);
  const end = polarPoint(center, radius, endAngle);
  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${center} ${center} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
}

export function FractionPie({
  paintedSlices,
  totalSlices,
}: FractionPieFigure) {
  const theme = useTheme();
  const center = PIE_SIZE / 2;
  const sliceAngle = (Math.PI * 2) / totalSlices;
  const startOffset = -Math.PI / 2;
  const paintedFill = theme.colors.accent;
  const emptyFill = theme.colors.neutral[100];
  const stroke = theme.colors.neutral[400];

  const slices = Array.from({ length: totalSlices }, (_, sliceIndex) => {
    const startAngle = startOffset + sliceIndex * sliceAngle;
    const endAngle = startAngle + sliceAngle;
    const isPainted = sliceIndex < paintedSlices;
    return (
      <Path
        key={`slice-${sliceIndex}`}
        d={slicePath(center, PIE_RADIUS, startAngle, endAngle)}
        fill={isPainted ? paintedFill : emptyFill}
      />
    );
  });

  const dividers = Array.from({ length: totalSlices }, (_, sliceIndex) => {
    const angle = startOffset + sliceIndex * sliceAngle;
    const edge = polarPoint(center, PIE_RADIUS, angle);
    return (
      <Line
        key={`cut-${sliceIndex}`}
        x1={center}
        y1={center}
        x2={edge.x}
        y2={edge.y}
        stroke={stroke}
        strokeWidth={1.25}
      />
    );
  });

  const label =
    paintedSlices > 0
      ? `${paintedSlices} de ${totalSlices} trozos`
      : `${totalSlices} trozos`;

  return (
    <View
      style={styles.wrap}
      accessibilityRole="image"
      accessibilityLabel={`Pastel de ${label}`}
    >
      <Svg width={PIE_SIZE} height={PIE_SIZE} viewBox={`0 0 ${PIE_SIZE} ${PIE_SIZE}`}>
        <Circle
          cx={center}
          cy={center}
          r={PIE_RADIUS}
          fill={emptyFill}
          stroke={stroke}
          strokeWidth={1.5}
        />
        {slices}
        {dividers}
        <Circle
          cx={center}
          cy={center}
          r={PIE_RADIUS}
          fill="none"
          stroke={stroke}
          strokeWidth={1.5}
        />
      </Svg>
    </View>
  );
}

export function FractionPieCaption({ caption }: { caption: string }) {
  const theme = useTheme();
  if (!caption.trim()) return null;
  return <Text style={[styles.caption, { color: theme.colors.text }]}>{caption}</Text>;
}

const styles = StyleSheet.create({
  wrap: { width: PIE_SIZE, height: PIE_SIZE },
  caption: { fontSize: 14, lineHeight: 21, flex: 1, minWidth: 120 },
});
