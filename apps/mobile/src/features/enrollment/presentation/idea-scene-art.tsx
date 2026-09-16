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
      {motif === 'pedido' ? <PedidoLamina compact={compact} /> : null}
      {motif === 'sheet' ? <SheetLamina compact={compact} /> : null}
      {motif === 'clock' ? <HourLamina compact={compact} /> : null}
      {motif === 'lectura' ? <LecturaLamina compact={compact} /> : null}
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
    <TeachingBoard kicker="Cómo se pide">
      <Animated.View
        style={[
          styles.promptBlock,
          { backgroundColor: theme.colors.neutral[100], borderColor: theme.colors.divider },
          flojoStyle,
        ]}
      >
        <Text style={[styles.leadIn, { color: theme.colors.neutral[600] }]}>
          Si pides solo esto, te arma cualquiera.
        </Text>
        <View style={styles.struckLine}>
          <Text style={[styles.promptLine, compact && styles.promptLineCompact, { color: theme.colors.text }]}>
            Hazme una lectura.
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
          <Text style={[styles.leadIn, { color: theme.colors.accent }]}>
            Si le dices el grado y cómo lo quieres de vuelta:
          </Text>
          <Text style={[styles.promptLine, compact && styles.promptLineCompact, { color: theme.colors.text }]}>
            En séptimo, un párrafo con una idea y cinco preguntas que se contestan con el texto. No inventes el autor.
          </Text>
        </View>
      </AppearOnce>
    </TeachingBoard>
  );
}

function SheetLamina({ compact }: { compact: boolean }) {
  const theme = useTheme();
  const strikeProgress = useOnceProgress(420, 380);
  const strikeStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: strikeProgress.value }],
  }));

  return (
    <TeachingBoard kicker="El primer tiro">
      <AppearOnce delayMs={80}>
        <Text style={[styles.boardLead, compact && styles.boardLeadCompact, { color: theme.colors.text }]}>
          Sale un borrador. Tú no lo fotocopias así.
        </Text>
      </AppearOnce>
      <AppearOnce delayMs={280}>
        <View
          style={[
            styles.promptBlock,
            { backgroundColor: theme.colors.neutral[100], borderColor: theme.colors.divider },
          ]}
        >
          <View style={styles.struckLine}>
            <Text style={[styles.promptLine, compact && styles.promptLineCompact, { color: theme.colors.neutral[700] }]}>
              Ocho preguntas. Un autor que no pegaste. Dos páginas.
            </Text>
            <Animated.View style={[styles.strike, { backgroundColor: theme.colors.text }, strikeStyle]} />
          </View>
        </View>
      </AppearOnce>
      <AppearOnce delayMs={720}>
        <View
          style={[
            styles.promptBlock,
            {
              backgroundColor: theme.colors.accentRamp[100],
              borderColor: theme.colors.accentRamp[200],
            },
          ]}
        >
          <Text style={[styles.promptLine, compact && styles.promptLineCompact, { color: theme.colors.text }]}>
            El párrafo y las cinco preguntas. Esto sí.
          </Text>
        </View>
      </AppearOnce>
    </TeachingBoard>
  );
}

function HourLamina({ compact }: { compact: boolean }) {
  const theme = useTheme();
  return (
    <TeachingBoard kicker="La hora de clase">
      <AppearOnce delayMs={80}>
        <Text style={[styles.boardLead, compact && styles.boardLeadCompact, { color: theme.colors.text }]}>
          Si no le dices que dura 45 minutos, te arma una de dos horas.
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
          Apertura, práctica, ellos solos y el cierre. Tiene que dar 45.
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

function LecturaLamina({ compact }: { compact: boolean }) {
  const theme = useTheme();

  return (
    <TeachingBoard kicker="El grado no es un detalle">
      <View style={styles.readingPair}>
        <AppearOnce delayMs={80}>
          <View style={styles.pieColumn}>
            <Text style={[styles.leadIn, { color: theme.colors.neutral[600] }]}>
              Si no le dices el grado, te arma una receta.
            </Text>
            <View
              style={[
                styles.readingCard,
                { backgroundColor: theme.colors.neutral[100], borderColor: theme.colors.divider },
              ]}
            >
              <Text style={[styles.readingLine, { color: theme.colors.neutral[700] }]}>1. Hierve el agua.</Text>
              <Text style={[styles.readingLine, { color: theme.colors.neutral[700] }]}>2. Echa el arroz.</Text>
              <Text style={[styles.readingLine, { color: theme.colors.neutral[700] }]}>3. Espera veinte minutos.</Text>
            </View>
            <Text style={[styles.pieCaption, { color: theme.colors.neutral[700] }]}>
              Eso es de segundo.
            </Text>
          </View>
        </AppearOnce>
        <AppearOnce delayMs={480}>
          <View style={styles.pieColumn}>
            <Text style={[styles.leadIn, { color: theme.colors.accent }]}>
              En séptimo: un párrafo y preguntas del texto.
            </Text>
            <View
              style={[
                styles.readingCard,
                {
                  backgroundColor: theme.colors.accentRamp[100],
                  borderColor: theme.colors.accentRamp[200],
                },
              ]}
            >
              <Text style={[styles.readingLine, compact && styles.promptLineCompact, { color: theme.colors.text }]}>
                Juana llega a Tarqui y se lleva dos libras.
              </Text>
              <Text style={[styles.readingLine, { color: theme.colors.neutral[700] }]}>1. ¿Dónde está?</Text>
              <Text style={[styles.readingLine, { color: theme.colors.neutral[700] }]}>2. ¿Qué se lleva?</Text>
            </View>
            <Text style={[styles.pieCaption, { color: theme.colors.text }]}>
              Eso ya es de séptimo.
            </Text>
          </View>
        </AppearOnce>
      </View>
    </TeachingBoard>
  );
}

function AulaLamina({ compact }: { compact: boolean }) {
  const theme = useTheme();
  const missingPieces = [
    'quién faltó hoy',
    'qué ya vieron la semana pasada',
    'si en tu libro dicen narrador o el que cuenta',
  ];

  return (
    <TeachingBoard kicker="Lo que él no vio">
      <AppearOnce delayMs={80}>
        <Text style={[styles.boardLead, compact && styles.boardLeadCompact, { color: theme.colors.text }]}>
          Él no estuvo en tu aula. Si no se lo cuentas, se lo inventa.
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
