import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { ProgressBar } from '@/core/ui/progress-bar';
import { ErrorState, LoadingState } from '@/core/ui/state-view';
import {
  useActivity,
  useSubmissionResult,
} from '@/features/lab/application/use-lab';
import { dimensionName, scoreTone, type DimensionScore } from '@/features/lab/domain/entities';

export function ResultScreen() {
  const theme = useTheme();
  const router = useRouter();
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
          Esto puede tardar unos segundos. Podés salir: cuando vuelvas va a estar acá.
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
          Fue un problema nuestro, no tuyo. Probá de nuevo en unos minutos.
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

  const accent = evaluation.passed ? theme.colors.accent : theme.colors.neutral[600];

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.eyebrow, { color: theme.colors.accentRamp[700] }]}>
        Resultado · intento {submission.attempt}
      </Text>

      <Text style={[styles.total, { color: accent }]}>
        {Math.round(evaluation.effectiveTotal)}
        <Text style={[styles.totalMax, { color: theme.colors.neutral[600] }]}> / 100</Text>
      </Text>

      <Text style={[styles.verdict, { color: theme.colors.text }]}>
        {evaluation.passed ? '¡Aprobaste esta actividad! 🎉' : 'Todavía no alcanza'}
      </Text>

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

      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Por dimensión</Text>

      {evaluation.dimensionScores.map((score) => (
        <DimensionRow key={score.key} score={score} name={dimensionName(activity, score.key)} />
      ))}

      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Devolución</Text>
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

      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Tu prompt</Text>
      <Text
        style={[
          styles.prompt,
          {
            backgroundColor: theme.colors.neutral[100],
            borderColor: theme.colors.divider,
            borderRadius: theme.radius.md,
            color: theme.colors.neutral[700],
          },
        ]}
      >
        {submission.prompt}
      </Text>

      {activity && activity.attemptsLeft > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace(`/lab/${submission.activityId}`)}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: theme.colors.accent,
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
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  total: { fontSize: 64, fontWeight: '600', lineHeight: 68 },
  totalMax: { fontSize: 22, fontWeight: '400' },
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
  prompt: { borderWidth: 1, padding: 13.6, fontSize: 14, lineHeight: 21 },
  note: { fontSize: 12, lineHeight: 18 },
  button: {
    paddingVertical: 13.6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: 13.6,
  },
  buttonLabel: { color: '#f2f2f3', fontSize: 16, fontWeight: '600' },
  provenance: { fontSize: 11, textAlign: 'center', marginTop: 13.6 },
});
