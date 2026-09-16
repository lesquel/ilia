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

const PIE_SIZE = 168;
const PIE_SIZE_COMPACT = 120;
const PIE_RADIUS_RATIO = 0.42;

const HOUR_BLOCKS = [
  { minutes: 8, label: 'apertura' },
  { minutes: 20, label: 'práctica' },
  { minutes: 12, label: 'solo' },
  { minutes: 5, label: 'cierre' },
] as const;

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

function useOnceProgress(delayMs: number, durationMs = 520) {
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
  shift = 12,
  children,
}: {
  delayMs: number;
  shift?: number;
  children: ReactNode;
}) {
  const progress = useOnceProgress(delayMs);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * shift }],
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
      {motif === 'pedido' ? <PedidoLamina compact={compact} /> : null}
      {motif === 'sheet' ? <SheetLamina compact={compact} /> : null}
      {motif === 'clock' ? <HourLamina compact={compact} /> : null}
      {motif === 'pie' ? <PieLamina compact={compact} /> : null}
      {motif === 'aula' ? <AulaLamina compact={compact} /> : null}
    </View>
  );
}

function TeachingBoard({
  kicker,
  children,
}: {
  kicker: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.board,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.divider,
          ...theme.shadow.md,
        },
      ]}
    >
      <View style={styles.boardHead}>
        <View style={[styles.signalSquare, { backgroundColor: theme.colors.accent }]} />
        <Text style={[styles.boardKicker, { color: theme.colors.accent }]}>{kicker}</Text>
      </View>
      {children}
    </View>
  );
}

function PedidoLamina({ compact }: { compact: boolean }) {
  const theme = useTheme();
  const dimProgress = useOnceProgress(720, 360);
  const strikeProgress = useOnceProgress(640, 380);
  const flojoStyle = useAnimatedStyle(() => ({
    opacity: 1 - dimProgress.value * 0.45,
  }));
  const strikeStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: strikeProgress.value }],
  }));

  return (
    <TeachingBoard kicker="El pedido">
      <Animated.View
        style={[
          styles.promptBlock,
          { backgroundColor: theme.colors.neutral[100], borderColor: theme.colors.divider },
          flojoStyle,
        ]}
      >
        <Text style={[styles.stamp, { color: theme.colors.neutral[600] }]}>Flojo</Text>
        <View style={styles.struckLine}>
          <Text style={[styles.promptLine, compact && styles.promptLineCompact, { color: theme.colors.text }]}>
            Haz un ejercicio de fracciones.
          </Text>
          <Animated.View style={[styles.strike, { backgroundColor: theme.colors.text }, strikeStyle]} />
        </View>
      </Animated.View>

      <AppearOnce delayMs={880} shift={16}>
        <View
          style={[
            styles.promptBlock,
            {
              backgroundColor: theme.colors.accentRamp[100],
              borderColor: theme.colors.accentRamp[200],
            },
          ]}
        >
          <Text style={[styles.stamp, { color: theme.colors.accent }]}>Útil</Text>
          <Text style={[styles.promptLine, compact && styles.promptLineCompact, { color: theme.colors.text }]}>
            Séptimo. Un cuarto más un medio. Tabla: consigna | respuesta.
          </Text>
        </View>
      </AppearOnce>
    </TeachingBoard>
  );
}

function SheetLamina({ compact }: { compact: boolean }) {
  const theme = useTheme();
  return (
    <TeachingBoard kicker="La tarde">
      <AppearOnce delayMs={80}>
        <Text style={[styles.boardLead, compact && styles.boardLeadCompact, { color: theme.colors.text }]}>
          Quedan dos horas. Él arma el borrador.
        </Text>
      </AppearOnce>
      <AppearOnce delayMs={420}>
        <View style={[styles.miniSheet, { borderColor: theme.colors.divider }]}>
          <View style={[styles.miniSheetHead, { backgroundColor: theme.colors.accentRamp[100] }]}>
            <Text style={[styles.miniSheetHeadCell, { color: theme.colors.accentRamp[800] }]}>
              Consigna
            </Text>
            <Text style={[styles.miniSheetHeadCell, { color: theme.colors.accentRamp[800] }]}>
              Respuesta
            </Text>
          </View>
          <View style={styles.miniSheetRow}>
            <Text style={[styles.miniSheetCell, { color: theme.colors.text }]}>1/4 + 1/2</Text>
            <Text style={[styles.miniSheetCell, { color: theme.colors.text }]}>3/4</Text>
          </View>
          <View style={[styles.miniSheetRow, { borderTopColor: theme.colors.divider, borderTopWidth: 1 }]}>
            <Text style={[styles.miniSheetCell, { color: theme.colors.text }]}>1/2 + 1/3</Text>
            <Text style={[styles.miniSheetCell, { color: theme.colors.text }]}>5/6</Text>
          </View>
        </View>
      </AppearOnce>
      <AppearOnce delayMs={820}>
        <Text style={[styles.boardNote, { color: theme.colors.neutral[700] }]}>
          Tú decides qué se fotocopia.
        </Text>
      </AppearOnce>
    </TeachingBoard>
  );
}

function HourLamina({ compact }: { compact: boolean }) {
  const theme = useTheme();
  return (
    <TeachingBoard kicker="La hora">
      <AppearOnce delayMs={80}>
        <Text style={[styles.boardLead, compact && styles.boardLeadCompact, { color: theme.colors.text }]}>
          Si no le dices 45, te arma dos horas.
        </Text>
      </AppearOnce>
      <View style={styles.hourTrack}>
        {HOUR_BLOCKS.map((block, blockIndex) => (
          <HourBlock
            key={block.label}
            minutes={block.minutes}
            label={block.label}
            delayMs={280 + blockIndex * 180}
            fillColor={blockIndex % 2 === 0 ? theme.colors.accent : theme.colors.accentRamp[300]}
            compact={compact}
          />
        ))}
      </View>
      <AppearOnce delayMs={1100}>
        <Text style={[styles.boardNote, { color: theme.colors.neutral[700] }]}>
          8 + 20 + 12 + 5. Tienen que sumar 45.
        </Text>
      </AppearOnce>
    </TeachingBoard>
  );
}

function HourBlock({
  minutes,
  label,
  delayMs,
  fillColor,
  compact,
}: {
  minutes: number;
  label: string;
  delayMs: number;
  fillColor: string;
  compact: boolean;
}) {
  const theme = useTheme();
  const progress = useOnceProgress(delayMs, 420);
  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  return (
    <View style={[styles.hourBlock, { flex: minutes }]}>
      <Animated.View
        style={[styles.hourFill, { backgroundColor: fillColor }, fillStyle]}
      />
      <Text
        style={[styles.hourLabel, compact && styles.hourLabelCompact, { color: theme.colors.neutral[700] }]}
        numberOfLines={2}
      >
        {minutes} {label}
      </Text>
    </View>
  );
}

function PieLamina({ compact }: { compact: boolean }) {
  const theme = useTheme();
  const pieSize = compact ? PIE_SIZE_COMPACT : PIE_SIZE;

  return (
    <TeachingBoard kicker="El grado">
      <View style={[styles.piePair, compact ? styles.piePairCompact : undefined]}>
        <AppearOnce delayMs={80}>
          <View style={styles.pieColumn}>
            <Text style={[styles.stamp, { color: theme.colors.neutral[600] }]}>Segundo</Text>
            <LessonPie paintedSlices={0} totalSlices={8} size={pieSize} />
            <Text style={[styles.pieCaption, { color: theme.colors.neutral[700] }]}>
              ¿Cuántos trozos hay?
            </Text>
          </View>
        </AppearOnce>
        <AppearOnce delayMs={480}>
          <View style={styles.pieColumn}>
            <Text style={[styles.stamp, { color: theme.colors.accent }]}>Séptimo</Text>
            <View style={{ width: pieSize, height: pieSize }}>
              <LessonPie paintedSlices={0} totalSlices={4} size={pieSize} />
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <AppearOnce delayMs={200} shift={0}>
                  <LessonPie paintedSlices={1} totalSlices={4} size={pieSize} />
                </AppearOnce>
              </View>
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <AppearOnce delayMs={640} shift={0}>
                  <LessonPie paintedSlices={3} totalSlices={4} size={pieSize} />
                </AppearOnce>
              </View>
            </View>
            <Text style={[styles.pieCaption, { color: theme.colors.text }]}>
              Un cuarto + un medio
            </Text>
          </View>
        </AppearOnce>
      </View>
    </TeachingBoard>
  );
}

function AulaLamina({ compact }: { compact: boolean }) {
  const theme = useTheme();
  const missingPieces = ['quién faltó', 'qué ya vieron', 'cómo lo dicen en tu libro'];

  return (
    <TeachingBoard kicker="El aula">
      <AppearOnce delayMs={80}>
        <Text style={[styles.boardLead, compact && styles.boardLeadCompact, { color: theme.colors.text }]}>
          El modelo no estuvo. Si no se lo dices, lo inventa.
        </Text>
      </AppearOnce>
      {missingPieces.map((piece, pieceIndex) => (
        <AppearOnce key={piece} delayMs={360 + pieceIndex * 220}>
          <View style={styles.aulaRow}>
            <View style={[styles.aulaTick, { backgroundColor: theme.colors.accent }]} />
            <Text style={[styles.aulaLine, compact && styles.promptLineCompact, { color: theme.colors.text }]}>
              {piece}
            </Text>
          </View>
        </AppearOnce>
      ))}
    </TeachingBoard>
  );
}

function LessonPie({
  paintedSlices,
  totalSlices,
  size,
}: {
  paintedSlices: number;
  totalSlices: number;
  size: number;
}) {
  const theme = useTheme();
  const center = size / 2;
  const radius = size * PIE_RADIUS_RATIO;
  const sliceAngle = (Math.PI * 2) / totalSlices;
  const startOffset = -Math.PI / 2;
  const paintedFill = theme.colors.accent;
  const emptyFill = theme.colors.neutral[100];
  const stroke = theme.colors.neutral[400];

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle
        cx={center}
        cy={center}
        r={radius}
        fill={emptyFill}
        stroke={stroke}
        strokeWidth={2}
      />
      {Array.from({ length: totalSlices }, (_, sliceIndex) => {
        const startAngle = startOffset + sliceIndex * sliceAngle;
        const endAngle = startAngle + sliceAngle;
        return (
          <Path
            key={`slice-${sliceIndex}`}
            d={slicePath(center, radius, startAngle, endAngle)}
            fill={sliceIndex < paintedSlices ? paintedFill : emptyFill}
          />
        );
      })}
      {Array.from({ length: totalSlices }, (_, sliceIndex) => {
        const angle = startOffset + sliceIndex * sliceAngle;
        const edge = polarPoint(center, radius, angle);
        return (
          <Line
            key={`cut-${sliceIndex}`}
            x1={center}
            y1={center}
            x2={edge.x}
            y2={edge.y}
            stroke={stroke}
            strokeWidth={1.5}
          />
        );
      })}
      <Circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  poster: {
    flex: 1,
    minHeight: 340,
    justifyContent: 'center',
    borderRadius: 20,
    padding: 20,
  },
  posterCompact: {
    flex: 0,
    minHeight: 280,
    padding: 12,
  },
  board: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 22,
    paddingVertical: 20,
    gap: 16,
  },
  boardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signalSquare: {
    width: 10,
    height: 10,
  },
  boardKicker: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  boardLead: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
  },
  boardLeadCompact: {
    fontSize: 16,
    lineHeight: 22,
  },
  boardNote: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  promptBlock: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  stamp: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  struckLine: {
    alignSelf: 'flex-start',
  },
  promptLine: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
  },
  promptLineCompact: {
    fontSize: 15,
    lineHeight: 22,
  },
  strike: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '48%',
    height: 2,
    transformOrigin: 'left center',
  },
  miniSheet: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  miniSheetHead: {
    flexDirection: 'row',
  },
  miniSheetHeadCell: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: '700',
  },
  miniSheetRow: {
    flexDirection: 'row',
  },
  miniSheetCell: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 17,
    fontWeight: '600',
  },
  hourTrack: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
  },
  hourBlock: {
    minWidth: 0,
    gap: 6,
  },
  hourFill: {
    height: 28,
    borderRadius: 4,
    transformOrigin: 'left center',
  },
  hourLabel: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
  hourLabelCompact: {
    fontSize: 10,
  },
  piePair: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    gap: 16,
  },
  piePairCompact: {
    gap: 10,
  },
  pieColumn: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  pieCaption: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  aulaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aulaTick: {
    width: 8,
    height: 8,
  },
  aulaLine: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
  },
});
