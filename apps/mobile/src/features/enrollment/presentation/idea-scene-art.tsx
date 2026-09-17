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
import { useTheme } from '@/core/theme';
import { motifForIdeaScene } from '@/features/enrollment/domain/idea-art-motif';

export type { IdeaArtMotif } from '@/features/enrollment/domain/idea-art-motif';
export { motifForIdeaScene };

const HOUR_BLOCKS = [
  { minutes: 8, label: 'apertura' },
  { minutes: 20, label: 'práctica' },
  { minutes: 12, label: 'solo' },
  { minutes: 5, label: 'cierre' },
] as const;

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
  if (motif === null) {
    return null;
  }

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
      {motif === 'pedido' || motif === 'lectura' ? <PedidoLamina compact={compact} /> : null}
      {motif === 'sheet' ? <SheetLamina compact={compact} /> : null}
      {motif === 'clock' ? <HourLamina compact={compact} /> : null}
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

  return (
    <TeachingBoard kicker="Dos pedidos">
      <View
        style={[
          styles.promptBlock,
          { backgroundColor: theme.colors.neutral[100], borderColor: theme.colors.divider },
        ]}
      >
        <Text style={[styles.leadIn, { color: theme.colors.neutral[600] }]}>
          Veamos qué pasa si pides algo como esto.
        </Text>
        <Text
          style={[styles.promptBody, compact && styles.promptBodyCompact, { color: theme.colors.text }]}
        >
          Hazme una lectura de séptimo, bien creativa, con varias preguntas.
        </Text>
      </View>

      <View
        style={[
          styles.promptBlock,
          {
            backgroundColor: theme.colors.accentRamp[100],
            borderColor: theme.colors.accentRamp[200],
          },
        ]}
      >
        <Text style={[styles.leadIn, { color: theme.colors.accent }]}>
          El mismo tema, escrito como lo pegarías tú.
        </Text>
        <Text
          style={[styles.promptBody, compact && styles.promptBodyCompact, { color: theme.colors.text }]}
        >
          Eres docente de lengua de séptimo. Ya leyeron un cuento y saben qué es el
          narrador. Escribe un párrafo de ocho líneas con una sola idea, y cinco
          preguntas que se contestan con el texto, para que distingan la idea del
          párrafo y no inventen una historia. No inventes el autor.
        </Text>
      </View>
    </TeachingBoard>
  );
}

function SheetLamina({ compact }: { compact: boolean }) {
  const theme = useTheme();

  return (
    <TeachingBoard kicker="El primer resultado">
      <Text style={[styles.boardLead, compact && styles.boardLeadCompact, { color: theme.colors.text }]}>
        El primer tiro casi nunca se fotocopia tal cual.
      </Text>
      <View
        style={[
          styles.promptBlock,
          { backgroundColor: theme.colors.neutral[100], borderColor: theme.colors.divider },
        ]}
      >
        <Text style={[styles.leadIn, { color: theme.colors.neutral[600] }]}>
          A veces te suelta esto.
        </Text>
        <Text
          style={[styles.promptBody, compact && styles.promptBodyCompact, { color: theme.colors.neutral[700] }]}
        >
          Ocho preguntas, un autor que tú no pegaste y dos páginas que no
          caben en la hora.
        </Text>
      </View>
      <View
        style={[
          styles.promptBlock,
          {
            backgroundColor: theme.colors.accentRamp[100],
            borderColor: theme.colors.accentRamp[200],
          },
        ]}
      >
        <Text style={[styles.leadIn, { color: theme.colors.accent }]}>
          Tú te quedas con esto.
        </Text>
        <Text
          style={[styles.promptBody, compact && styles.promptBodyCompact, { color: theme.colors.text }]}
        >
          El párrafo y las cinco preguntas que se contestan con el texto.
          Lo demás se tira o se vuelve a pedir.
        </Text>
      </View>
    </TeachingBoard>
  );
}

function HourLamina({ compact }: { compact: boolean }) {
  const theme = useTheme();
  return (
    <TeachingBoard kicker="La hora de clase">
      <Text style={[styles.boardLead, compact && styles.boardLeadCompact, { color: theme.colors.text }]}>
        Veamos qué pasa si no le dices que la hora dura 45 minutos: te arma una
        secuencia de dos horas.
      </Text>
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
      <Text style={[styles.boardNote, { color: theme.colors.neutral[700] }]}>
        Ocho de apertura, veinte de práctica, doce ellos solos y cinco de cierre.
        Eso suma 45.
      </Text>
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

function AulaLamina({ compact }: { compact: boolean }) {
  const theme = useTheme();
  const missingPieces = [
    'Quién faltó hoy y quién ya había leído el cuento.',
    'Qué vieron la semana pasada y qué todavía confunden.',
    'Si en tu libro dicen narrador o el que cuenta.',
  ];

  return (
    <TeachingBoard kicker="Lo que él no vio">
      <Text style={[styles.boardLead, compact && styles.boardLeadCompact, { color: theme.colors.text }]}>
        Él no estuvo en tu aula. Si no se lo cuentas, se lo inventa.
      </Text>
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

const styles = StyleSheet.create({
  poster: {
    flex: 1,
    minHeight: 420,
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
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0,
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
  leadIn: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
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
  promptBody: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  promptBodyCompact: {
    fontSize: 14,
    lineHeight: 20,
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
  readingPair: {
    gap: 12,
  },
  pieColumn: {
    alignItems: 'stretch',
    gap: 8,
    minWidth: 0,
  },
  pieCaption: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  readingCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  readingLine: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
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
