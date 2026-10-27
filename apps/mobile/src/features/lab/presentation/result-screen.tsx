import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { breakpoint, useTheme } from '@/core/theme';
import { ProgressBar } from '@/core/ui/progress-bar';
import { ErrorState, LoadingState } from '@/core/ui/state-view';
import { PassCertificateCard } from '@/features/certificates';
import {
  useActivity,
  useSubmissionResult,
} from '@/features/lab/application/use-lab';
import {
  dimensionName,
  scoreTone,
  simulatedEvaluationNotice,
  type DimensionScore,
} from '@/features/lab/domain/entities';
import { sideScoresFromEvaluation } from '@/features/lab/domain/side-scores';
import { GeneratedSheet } from '@/features/lab/presentation/generated-sheet';

export function ResultScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= breakpoint.compact;
  const { submissionId } = useLocalSearchParams<{ submissionId: string }>();

  const { submission, evaluation, isWaiting, isLoading, error } = useSubmissionResult(
    submissionId ?? '',
  );
  const { activity } = useActivity(submission?.activityId ?? '');

  if (isLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        <LoadingState label="Buscando tu entrega…" />
      </View>
    );
  }

  if (error || !submission) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        <ErrorState error={error} />
      </View>
    );
  }

  if (isWaiting) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: theme.colors.bg }]}>
        <ActivityIndicator color={theme.colors.accent} />
        <Text style={[styles.waitTitle, { color: theme.colors.text }]}>Evaluando tu prompt…</Text>
        <Text style={[styles.waitHint, { color: theme.colors.neutral[600] }]}>
          Esto puede tardar unos segundos. Puedes salir: cuando vuelvas va a estar aquí.
        </Text>
      </View>
    );
  }

  if (submission.status === 'failed') {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: theme.colors.bg }]}>
        <Text style={[styles.waitTitle, { color: theme.colors.text }]}>
          No pudimos evaluar tu entrega
        </Text>
        <Text style={[styles.waitHint, { color: theme.colors.neutral[600] }]}>
          Fue un problema nuestro, no tuyo. Prueba de nuevo en unos minutos.
        </Text>
      </View>
    );
  }

  if (!evaluation) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        <ErrorState error={null} />
      </View>
    );
  }

  const simulatedNotice = simulatedEvaluationNotice(evaluation.model);
  const accent = evaluation.passed && !simulatedNotice ? theme.colors.accentAlt : theme.colors.neutral[600];
  const sides = sideScoresFromEvaluation(activity, evaluation.dimensionScores);
  const generatedText = evaluation.generatedText.trim();

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={[styles.content, isWide ? styles.contentWide : undefined]}
    >
      <Text style={[styles.eyebrow, { color: theme.colors.accentRamp[700] }]}>
        Resultado · intento {submission.attempt}
      </Text>

      {simulatedNotice ? (
        <View
          style={[
            styles.panel,
            { borderColor: theme.colors.divider, borderRadius: theme.radius.md },
          ]}
        >
          <Text style={[styles.panelTitle, { color: theme.colors.text }]}>{simulatedNotice}</Text>
        </View>
      ) : null}

      <Text style={[styles.verdict, { color: theme.colors.text }]}>
        {simulatedNotice
          ? 'Esta nota no cuenta.'
          : evaluation.passed
            ? 'Esta práctica cuenta.'
            : 'Todavía no alcanza'}
      </Text>

      <View style={[styles.pair, isWide ? styles.pairWide : undefined]}>
        <View style={[styles.station, isWide ? styles.stationWide : undefined]}>
          <Text style={[styles.stationLabel, { color: theme.colors.neutral[600] }]}>El pedido</Text>
          <View
            style={[
              styles.stationCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.divider,
                borderRadius: theme.radius.lg,
              },
            ]}
          >
            <Text style={[styles.promptBody, { color: theme.colors.text }]}>{submission.prompt}</Text>
          </View>
          <SideScore label="Nota del pedido" value={sides.promptScore} color={accent} />
        </View>

        <Text
          style={[styles.arrow, { color: theme.colors.neutral[400] }, isWide ? undefined : styles.arrowDown]}
          accessibilityLabel="El pedido produce la hoja"
        >
          {isWide ? '→' : '↓'}
        </Text>

        <View style={[styles.station, isWide ? styles.stationWide : undefined]}>
          <Text style={[styles.stationLabel, { color: theme.colors.neutral[600] }]}>La hoja</Text>
          <View
            style={[
              styles.stationCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.divider,
                borderRadius: theme.radius.lg,
              },
            ]}
          >
            {generatedText ? (
              <GeneratedSheet text={generatedText} showFrame={false} />
            ) : (
              <Text style={[styles.body, { color: theme.colors.neutral[600] }]}>
                Esta lectura no guardó la hoja.
              </Text>
            )}
          </View>
          <SideScore label="Nota de la hoja" value={sides.resultScore} color={accent} />
        </View>
      </View>

      {evaluation.passed && !simulatedNotice && activity?.courseSlug ? (
        <PassCertificateCard
          slug={activity.courseSlug}
          courseTitle={activity.courseTitle || activity.title}
        />
      ) : null}

      {/* With the reason, not just the fact. A grade changed for reasons the
          teacher cannot see is worse than one she can question — the same rule
          the certificate follows when it says why it was revoked. */}
      {evaluation.wasOverridden ? (
        <View
          style={[
            styles.override,
            { borderColor: theme.colors.divider, borderRadius: theme.radius.md },
          ]}
        >
          <Text style={[styles.note, { color: theme.colors.accentRamp[700] }]}>
            Esta nota fue ajustada por el instructor.
          </Text>
          {evaluation.overrideReason ? (
            <Text style={[styles.overrideReason, { color: theme.colors.neutral[700] }]}>
              {evaluation.overrideReason}
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* Objective failures first: they are certain, specific, and fixable in
          seconds. The model's opinion comes after. */}
      {evaluation.checkFailures.length > 0 ? (
        <View
          style={[
            styles.panel,
            { borderColor: theme.colors.divider, borderRadius: theme.radius.md },
          ]}
        >
          <Text style={[styles.panelTitle, { color: theme.colors.text }]}>
            Requisitos que no cumpliste
          </Text>
          {evaluation.checkFailures.map((failure) => (
            <Text key={failure} style={[styles.failure, { color: theme.colors.neutral[700] }]}>
              • {failure}
            </Text>
          ))}
          <Text style={[styles.note, { color: theme.colors.neutral[600] }]}>
            Mientras falte alguno, la actividad no se aprueba — por más alto que sea el puntaje.
          </Text>
        </View>
      ) : null}

      <Text style={[styles.sectionTitle, { color: theme.colors.text }]} accessibilityRole="header">Por dimensión</Text>

      {evaluation.dimensionScores.map((score) => (
        <DimensionRow key={score.key} score={score} name={dimensionName(activity, score.key)} />
      ))}

      <Text style={[styles.sectionTitle, { color: theme.colors.text }]} accessibilityRole="header">Devolución</Text>
      <Text style={[styles.body, { color: theme.colors.text }]}>{evaluation.feedback}</Text>

      <View
        style={[
          styles.panel,
          {
            backgroundColor: theme.colors.accentRamp[100],
            borderColor: theme.colors.divider,
            borderRadius: theme.radius.md,
          },
        ]}
      >
        <Text style={[styles.panelTitle, { color: theme.colors.accentRamp[800] }]}>
          Qué cambiar en el próximo intento
        </Text>
        <Text style={[styles.body, { color: theme.colors.accentRamp[800] }]}>
          {evaluation.suggestion}
        </Text>
      </View>

      {activity && activity.attemptsLeft > 0 && !evaluation.passed ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace(`/lab/${submission.activityId}`)}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: theme.colors.accentButton,
              borderRadius: theme.radius.md,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={styles.buttonLabel}>
            Intentar de nuevo ({activity.attemptsLeft} restantes)
          </Text>
        </Pressable>
      ) : null}

      {/* Recorded per evaluation so a grade stays explainable when the provider
          updates its model (TRD 6.3). */}
      <Text style={[styles.provenance, { color: theme.colors.neutral[500] }]}>
        Evaluado con {evaluation.model} v{evaluation.modelVersion} · rúbrica v
        {evaluation.rubricVersion}
      </Text>
    </ScrollView>
  );
}

function SideScore({
  label,
  value,
  color,
}: {
  label: string;
  value: number | null;
  color: string;
}) {
  const theme = useTheme();
  if (value === null) return null;

  return (
    <View style={styles.sideScore}>
      <Text style={[styles.sideScoreLabel, { color: theme.colors.neutral[600] }]}>{label}</Text>
      <Text style={[styles.sideScoreValue, { color }]}>{Math.round(value)}</Text>
    </View>
  );
}

function DimensionRow({ score, name }: { score: DimensionScore; name: string }) {
  const theme = useTheme();
  const tone = scoreTone(score.score);
  const color =
    tone === 'strong'
      ? theme.colors.accent
      : tone === 'fair'
        ? theme.colors.neutral[600]
        : theme.colors.neutral[700];

  return (
    <View
      style={[styles.dimension, { borderColor: theme.colors.divider, borderRadius: theme.radius.md }]}
    >
      <View style={styles.dimensionHeader}>
        <Text style={[styles.dimensionName, { color: theme.colors.text }]}>{name}</Text>
        <Text style={[styles.dimensionScore, { color }]}>{Math.round(score.score)}</Text>
      </View>

      <ProgressBar percentage={score.score} label="" />

      {/* PRD E-06: a number with no reason is not reviewable. */}
      <Text style={[styles.justification, { color: theme.colors.neutral[600] }]}>
        {score.justification}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  override: { borderWidth: 1, padding: 13.6, gap: 3.4, marginTop: 6.8 },
  overrideReason: { fontSize: 14, lineHeight: 21 },
  screen: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 20.4, gap: 10.2 },
  content: {
    padding: 20.4,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
    gap: 10.2,
  },
  contentWide: {
    maxWidth: 1080,
  },
  pair: {
    gap: 12,
    marginVertical: 8,
  },
  pairWide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  station: {
    gap: 8,
  },
  stationWide: {
    flex: 1,
    minWidth: 0,
  },
  stationLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  stationCard: {
    borderWidth: 1,
    padding: 16,
  },
  arrow: {
    fontSize: 28,
    fontWeight: '600',
    alignSelf: 'center',
    marginTop: 18,
  },
  arrowDown: {
    marginTop: 0,
    marginBottom: 0,
  },
  sideScore: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sideScoreLabel: {
    fontSize: 13,
  },
  sideScoreValue: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  verdict: { fontSize: 20, fontWeight: '600', marginBottom: 6.8 },
  waitTitle: { fontSize: 20, fontWeight: '600', textAlign: 'center' },
  waitHint: { fontSize: 14, textAlign: 'center', maxWidth: 380 },
  panel: { borderWidth: 1, padding: 13.6, gap: 3.4, marginVertical: 6.8 },
  panelTitle: { fontSize: 15, fontWeight: '600', marginBottom: 3.4 },
  failure: { fontSize: 14, lineHeight: 21 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginTop: 13.6 },
  dimension: { borderWidth: 1, padding: 13.6, gap: 6.8 },
  dimensionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dimensionName: { fontSize: 15, fontWeight: '600', flex: 1 },
  dimensionScore: { fontSize: 20, fontWeight: '600' },
  justification: { fontSize: 13, lineHeight: 19 },
  body: { fontSize: 15, lineHeight: 23 },
  promptBody: { fontSize: 14, lineHeight: 21 },
  note: { fontSize: 12, lineHeight: 18 },
  button: {
    paddingVertical: 13.6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: 13.6,
  },
  buttonLabel: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  provenance: { fontSize: 11, textAlign: 'center', marginTop: 13.6 },
});
