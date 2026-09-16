import { useEffect, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { useTheme } from '@/core/theme';
import { motifForIdeaScene } from '@/features/enrollment/domain/idea-art-motif';

export type { IdeaArtMotif } from '@/features/enrollment/domain/idea-art-motif';
export { motifForIdeaScene };

const PIE_SIZE = 96;
const PIE_RADIUS = 40;

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

function useOnceProgress(delayMs: number, durationMs = 480) {
  const prefersReducedMotion = useReducedMotion();
  const progress = useSharedValue(prefersReducedMotion ? 1 : 0);

  useEffect(() => {
    if (prefersReducedMotion) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withDelay(
      delayMs,
      withTiming(1, { duration: durationMs, easing: Easing.out(Easing.cubic) }),
    );
  }, [delayMs, durationMs, prefersReducedMotion, progress]);

  return progress;
}

function AppearOnce({
  delayMs,
  children,
}: {
  delayMs: number;
  children: ReactNode;
}) {
  const progress = useOnceProgress(delayMs);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 10 }],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

export function IdeaSceneArt({
  plainText,
  sceneIndex,
  compact,
}: {
  plainText: string;
  sceneIndex: number;
  compact: boolean;
}) {
  const theme = useTheme();
  const motif = motifForIdeaScene(plainText, sceneIndex);
  const signalProgress = useOnceProgress(0, 320);
  const signalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: signalProgress.value }],
  }));

  return (
    <View
      style={[
        styles.poster,
        compact ? styles.posterCompact : undefined,
        { backgroundColor: theme.colors.accentRamp[100] },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View
        style={[
          styles.signalSquare,
          { backgroundColor: theme.colors.accent },
          signalStyle,
        ]}
      />
      {motif === 'clock' ? <ClockMotif /> : null}
      {motif === 'sheet' ? <SheetMotif /> : null}
      {motif === 'pedido' ? <PedidoMotif /> : null}
      {motif === 'aula' ? <AulaMotif /> : null}
      {motif === 'pie' ? <PieMotif compact={compact} /> : null}
    </View>
  );
}

function ClockMotif() {
  const theme = useTheme();
  const handProgress = useOnceProgress(180, 900);
  const handStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${handProgress.value * 270}deg` }],
  }));

  return (
    <View style={styles.motifCenter}>
      <View
        style={[
          styles.clockFace,
          { borderColor: theme.colors.accent, backgroundColor: theme.colors.surface },
        ]}
      >
        <Animated.View style={[styles.clockHandPivot, handStyle]} pointerEvents="none">
          <View style={[styles.clockHand, { backgroundColor: theme.colors.accent }]} />
        </Animated.View>
        <AppearOnce delayMs={420}>
          <Text style={[styles.clockLabel, { color: theme.colors.accent }]}>45</Text>
        </AppearOnce>
      </View>
    </View>
  );
}

function SheetMotif() {
  const theme = useTheme();
  return (
    <View style={styles.motifCenter}>
      <AppearOnce delayMs={80}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.divider,
            },
          ]}
        >
          <GrowingLine delayMs={220} color={theme.colors.neutral[200]} widthPercent={100} />
          <GrowingLine delayMs={360} color={theme.colors.neutral[200]} widthPercent={100} />
          <GrowingLine delayMs={500} color={theme.colors.accentRamp[200]} widthPercent={62} />
          <GrowingLine delayMs={640} color={theme.colors.neutral[200]} widthPercent={100} />
        </View>
      </AppearOnce>
    </View>
  );
}

function PedidoMotif() {
  const theme = useTheme();
  return (
    <View style={styles.motifCenter}>
      <AppearOnce delayMs={80}>
        <View
          style={[
            styles.promptCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.divider,
            },
          ]}
        >
          <Text style={[styles.promptHint, { color: theme.colors.neutral[500] }]}>prompt ▸</Text>
          <GrowingLine delayMs={280} color={theme.colors.neutral[200]} widthPercent={100} />
          <GrowingLine delayMs={520} color={theme.colors.accent} widthPercent={62} />
        </View>
      </AppearOnce>
    </View>
  );
}

function AulaMotif() {
  const theme = useTheme();
  return (
    <View style={styles.aula}>
      <AppearOnce delayMs={80}>
        <View
          style={[
            styles.desk,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider },
          ]}
        />
      </AppearOnce>
      <AppearOnce delayMs={220}>
        <View
          style={[
            styles.desk,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider },
          ]}
        />
      </AppearOnce>
      <AppearOnce delayMs={400}>
        <View style={[styles.board, { backgroundColor: theme.colors.accent }]} />
      </AppearOnce>
    </View>
  );
}

function PieMotif({ compact }: { compact: boolean }) {
  return (
    <View style={[styles.pieRow, compact ? styles.pieRowCompact : undefined]}>
      <AppearOnce delayMs={80}>
        <LessonPieCard
          caption="contar trozos"
          paintedSlices={0}
          totalSlices={8}
        />
      </AppearOnce>
      <AppearOnce delayMs={520}>
        <LessonPieCard
          caption="un cuarto + un medio"
          paintedSlices={3}
          totalSlices={4}
        />
      </AppearOnce>
    </View>
  );
}

function LessonPieCard({
  caption,
  paintedSlices,
  totalSlices,
}: {
  caption: string;
  paintedSlices: number;
  totalSlices: number;
}) {
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
    return (
      <Path
        key={`slice-${sliceIndex}`}
        d={slicePath(center, PIE_RADIUS, startAngle, endAngle)}
        fill={sliceIndex < paintedSlices ? paintedFill : emptyFill}
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

  return (
    <View style={styles.pieCard}>
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
      <Text style={[styles.pieCaption, { color: theme.colors.neutral[700] }]}>{caption}</Text>
    </View>
  );
}

function GrowingLine({
  delayMs,
  color,
  widthPercent,
}: {
  delayMs: number;
  color: string;
  widthPercent: number;
}) {
  const progress = useOnceProgress(delayMs, 420);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.sheetLine,
        { backgroundColor: color, width: `${widthPercent}%` },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  poster: {
    flex: 1,
    borderRadius: 20,
    minHeight: 280,
    overflow: 'hidden',
    justifyContent: 'center',
    padding: 28,
  },
  posterCompact: {
    flex: 0,
    minHeight: 160,
    padding: 16,
  },
  signalSquare: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 14,
    height: 14,
  },
  motifCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockFace: {
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  clockHandPivot: {
    position: 'absolute',
    top: 14,
    bottom: 74,
    left: 71,
    width: 4,
    transformOrigin: 'bottom',
  },
  clockHand: {
    flex: 1,
    borderRadius: 99,
  },
  clockLabel: {
    fontSize: 40,
    fontWeight: '700',
  },
  sheet: {
    width: 132,
    height: 168,
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    gap: 12,
    transform: [{ rotate: '6deg' }],
  },
  sheetLine: {
    height: 8,
    borderRadius: 99,
    alignSelf: 'flex-start',
    transformOrigin: 'left center',
  },
  promptCard: {
    width: '100%',
    maxWidth: 240,
    minHeight: 140,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  promptHint: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  aula: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
  },
  desk: {
    width: 168,
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
  },
  board: {
    width: 120,
    height: 72,
    marginTop: 8,
  },
  pieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  pieRowCompact: {
    gap: 12,
  },
  pieCard: {
    alignItems: 'center',
    gap: 8,
    maxWidth: 140,
  },
  pieCaption: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
