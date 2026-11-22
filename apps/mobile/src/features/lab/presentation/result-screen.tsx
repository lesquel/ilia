import { Link, useLocalSearchParams, useRouter, type Href } from 'expo-router';
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
import { ErrorState } from '@/core/ui/state-view';
import { PassCertificateCard } from '@/features/certificates';
import {
  useActivity,
  useMySubmissions,
  useSubmissionResult,
} from '@/features/lab/application/use-lab';
import { compareAttempts, formatScoreDelta } from '@/features/lab/domain/attempt-comparison';
import {
  dimensionName,
  simulatedEvaluationNotice,
  type DimensionScore,
} from '@/features/lab/domain/entities';
import { diffPromptWords } from '@/features/lab/domain/prompt-diff';
import {
  previousAttempt,
  resultBadge,
  scoreBand,
  type ScoreBand,
} from '@/features/lab/domain/result-display';
import { sideScoresFromEvaluation } from '@/features/lab/domain/side-scores';
import { GeneratedSheet } from '@/features/lab/presentation/generated-sheet';
import { ResultScreenSkeleton } from '@/features/lab/presentation/result-screen-skeleton';
import { ScoreRing } from '@/features/lab/presentation/score-ring';
import { SaveRecipeButton } from '@/features/recipes';

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
  // The attempt before this one, for "Qué cambió". Only real attempts: on the
  // first one there is nothing to compare and the card is not drawn.
  const { submissions } = useMySubmissions(submission?.activityId ?? '');
  const previous = submission ? previousAttempt(submissions, submission) : null;
  const previousResult = useSubmissionResult(previous?.id ?? '');

  if (isLoading) {
    return <ResultScreenSkeleton />;
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
  const badge = resultBadge({
    passed: evaluation.passed,
    simulated: Boolean(simulatedNotice),
    attempt: submission.attempt,
    maxAttempts: activity?.maxAttempts ?? null,
  });
  const badgeColors =
    badge.role === 'success'
      ? { bg: theme.colors.successSoft, fg: theme.colors.success }
      : badge.role === 'warning'
        ? { bg: theme.colors.warningSoft, fg: theme.colors.warning }
        : { bg: theme.colors.neutral[100], fg: theme.colors.neutral[700] };
  const ringColor = simulatedNotice
    ? theme.colors.neutral[400]
    : bandColor(scoreBand(evaluation.effectiveTotal), theme.colors);

  const comparison = previous
    ? compareAttempts(
        { submission: previousResult.submission ?? previous, evaluation: previousResult.evaluation },
        { submission, evaluation },
      )
    : null;
  const totalDelta = comparison?.complete ? comparison.totalDelta : null;
  const promptSegments = previous ? diffPromptWords(previous.prompt, submission.prompt) : [];
  const hasNewWords = promptSegments.some((segment) => segment.added);
  const canRetry = Boolean(activity && activity.attemptsLeft > 0 && !evaluation.passed);
  const card = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.divider,
    borderRadius: theme.radius.lg + 4,
  };

  const actions = (
    <View style={styles.actions}>
      {/* Wait for the activity: a recipe saved under a generic title is hard to find later. */}
      {activity ? (
        <SaveRecipeButton
          submissionId={submission.id}
          prompt={submission.prompt}
          activityTitle={activity.title}
          score={evaluation.effectiveTotal}
        />
      ) : null}
      {canRetry && activity ? (
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
    </View>
  );

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={[styles.content, isWide ? styles.contentWide : undefined]}
    >
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

      <View style={[styles.hero, card, isWide ? styles.heroWide : undefined]}>
        <ScoreRing score={evaluation.effectiveTotal} color={ringColor} size={isWide ? 200 : 160} />
        <View style={[styles.heroCopy, isWide ? styles.heroCopyWide : undefined]}>
          <Text style={[styles.badge, { backgroundColor: badgeColors.bg, color: badgeColors.fg }]}>
            {badge.label}
          </Text>
          <Text
            style={[
              styles.verdict,
              isWide ? styles.verdictWide : undefined,
              { color: theme.colors.text, fontFamily: theme.typography.display.family },
            ]}
            accessibilityRole="header"
          >
            {simulatedNotice
              ? 'Esta nota no cuenta.'
              : evaluation.passed
                ? 'Esta práctica cuenta.'
                : 'Todavía no alcanza'}
          </Text>
          <Text style={[styles.heroMeta, { color: theme.colors.neutral[700] }]}>
            {activity?.title ? `${activity.title} · ` : ''}Resultado del intento {submission.attempt}
            {totalDelta !== null && previous ? (
              <>
                {' · '}
                <Text
                  style={{
                    fontWeight: '700',
                    color:
                      Math.round(totalDelta) > 0
                        ? theme.colors.success
                        : Math.round(totalDelta) < 0
                          ? theme.colors.warning
                          : theme.colors.neutral[700],
                  }}
                >
                  {formatScoreDelta(totalDelta)}
                </Text>
                {` respecto al intento ${previous.attempt}`}
              </>
            ) : null}
          </Text>
        </View>
      </View>

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

      <View style={[styles.columns, isWide ? styles.columnsWide : undefined]}>
        <View style={[styles.column, styles.section, card]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]} accessibilityRole="header">
            Lo que Lía revisó
          </Text>
          {evaluation.dimensionScores.map((score) => (
            <DimensionRow key={score.key} score={score} name={dimensionName(activity, score.key)} />
          ))}
        </View>

        <View style={styles.column}>
          {previous ? (
            <View style={[styles.section, card]}>
              <View style={styles.sectionHeader}>
                <Text
                  style={[styles.sectionTitle, styles.sectionTitleFlex, { color: theme.colors.text }]}
                  accessibilityRole="header"
                >
                  Qué cambió desde el intento {previous.attempt}
                </Text>
                <Link
                  href={
                    `/lab/compare/${encodeURIComponent(submission.activityId)}?a=${previous.id}&b=${submission.id}` as Href
                  }
                  style={[styles.link, { color: theme.colors.accentAlt }]}
                >
                  Comparar lado a lado
                </Link>
              </View>
              <Text
                style={[
                  styles.diff,
                  { backgroundColor: theme.colors.bg, color: theme.colors.text, borderRadius: 16 },
                ]}
              >
                {promptSegments.map((segment, index) =>
                  segment.added ? (
                    <Text
                      key={index}
                      style={{ backgroundColor: theme.colors.successSoft, color: theme.colors.success }}
                    >
                      {segment.text}
                    </Text>
                  ) : (
                    <Text key={index}>{segment.text}</Text>
                  ),
                )}
              </Text>
              <View style={styles.legend}>
                {hasNewWords ? (
                  <>
                    <View style={[styles.legendSwatch, { backgroundColor: theme.colors.successSoft }]} />
                    <Text style={[styles.note, { color: theme.colors.neutral[600] }]}>
                      Lo nuevo respecto al intento {previous.attempt}
                    </Text>
                  </>
                ) : (
                  <Text style={[styles.note, { color: theme.colors.neutral[600] }]}>
                    No agregaste nada nuevo respecto al intento {previous.attempt}.
                  </Text>
                )}
              </View>
              {actions}
            </View>
          ) : null}

          <View style={[styles.section, card]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]} accessibilityRole="header">
              Devolución
            </Text>
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
            {previous ? null : actions}
          </View>
        </View>
      </View>

      {/* Recorded per evaluation so a grade stays explainable when the provider
          updates its model (TRD 6.3). */}
      <Text style={[styles.provenance, { color: theme.colors.neutral[500] }]}>
        Evaluado con {evaluation.model} v{evaluation.modelVersion} · rúbrica v
        {evaluation.rubricVersion}
      </Text>
    </ScrollView>
  );
}

function bandColor(
  band: ScoreBand,
  colors: { success: string; accentButton: string; warning: string },
): string {
  if (band === 'success') return colors.success;
  if (band === 'primary') return colors.accentButton;
  return colors.warning;
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
  const shown = Math.max(0, Math.min(100, Math.round(score.score)));
  const color = bandColor(scoreBand(score.score), theme.colors);

  return (
    <View style={styles.dimension}>
      <View style={styles.dimensionHeader}>
        <Text style={[styles.dimensionName, { color: theme.colors.text }]}>{name}</Text>
        <Text style={[styles.dimensionScore, { color }]}>{shown}</Text>
      </View>

      <View
        style={[styles.dimensionTrack, { backgroundColor: theme.colors.neutral[100] }]}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: shown, text: `${name}: ${shown} de 100` }}
      >
        <View style={[styles.dimensionFill, { width: `${shown}%`, backgroundColor: color }]} />
      </View>

      {/* PRD E-06: a number with no reason is not reviewable. */}
      <Text style={[styles.justification, { color: theme.colors.neutral[600] }]}>
        {score.justification}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 6.8 },
  hero: { borderWidth: 1, padding: 20, gap: 16, alignItems: 'center' },
  heroWide: { flexDirection: 'row', padding: 28, gap: 28 },
  heroCopy: { gap: 10, alignSelf: 'stretch' },
  heroCopyWide: { flex: 1, minWidth: 0, alignSelf: 'center' },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 13,
    fontWeight: '700',
  },
  heroMeta: { fontSize: 15, lineHeight: 22 },
  columns: { gap: 16, marginTop: 6.8 },
  columnsWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 20 },
  column: { gap: 16, flex: 1, minWidth: 0 },
  section: { borderWidth: 1, padding: 20, gap: 14 },
  sectionHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionTitleFlex: { flexShrink: 1 },
  link: { fontSize: 14, fontWeight: '600' },
  diff: { padding: 16, fontSize: 15, lineHeight: 25, overflow: 'hidden' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 10, height: 10, borderRadius: 3 },
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
    maxWidth: 1240,
    padding: 32,
    gap: 16,
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
  verdict: { fontSize: 26, lineHeight: 30 },
  verdictWide: { fontSize: 36, lineHeight: 40 },
  waitTitle: { fontSize: 20, fontWeight: '600', textAlign: 'center' },
  waitHint: { fontSize: 14, textAlign: 'center', maxWidth: 380 },
  panel: { borderWidth: 1, padding: 13.6, gap: 3.4, marginVertical: 6.8 },
  panelTitle: { fontSize: 15, fontWeight: '600', marginBottom: 3.4 },
  failure: { fontSize: 14, lineHeight: 21 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  dimension: { gap: 6 },
  dimensionTrack: { height: 10, borderRadius: 999, overflow: 'hidden' },
  dimensionFill: { height: '100%', borderRadius: 999 },
  dimensionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dimensionName: { fontSize: 14, fontWeight: '600', flex: 1 },
  dimensionScore: { fontSize: 14, fontWeight: '700' },
  justification: { fontSize: 13, lineHeight: 19 },
  body: { fontSize: 15, lineHeight: 23 },
  promptBody: { fontSize: 14, lineHeight: 21 },
  note: { fontSize: 12, lineHeight: 18 },
  button: {
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  buttonLabel: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  provenance: { fontSize: 11, textAlign: 'center', marginTop: 13.6 },
});
