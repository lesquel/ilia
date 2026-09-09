import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { useMySubmissions } from '@/features/lab/application/use-lab';
import type { Submission, SubmissionStatus } from '@/features/lab/domain/entities';

/**
 * The teacher's previous attempts at this activity.
 *
 * Attempts are limited, so someone about to spend one deserves to see what they
 * already tried. Comparing your own prompts is the part of the exercise that
 * actually teaches.
 */

function statusLabel(status: SubmissionStatus): string {
  switch (status) {
    case 'pending':
      return 'En cola';
    case 'running':
      return 'Evaluando…';
    case 'scored':
      return 'Evaluado';
    case 'failed':
      return 'No se pudo evaluar';
  }
}

export function AttemptHistory({ activityId }: { activityId: string }) {
  const theme = useTheme();
  const { submissions, isLoading } = useMySubmissions(activityId);

  // Nothing to say on a first attempt, and a "todavía no hay intentos" box
  // above an empty editor is just noise.
  if (isLoading || submissions.length === 0) return null;

  return (
    <View style={styles.block}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Tus intentos anteriores</Text>

      {submissions.map((submission) => (
        <AttemptRow key={submission.id} submission={submission} />
      ))}
    </View>
  );
}

function AttemptRow({ submission }: { submission: Submission }) {
  const theme = useTheme();
  const scored = submission.status === 'scored';

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: theme.colors.neutral[100],
          borderColor: theme.colors.divider,
          borderRadius: theme.radius.sm,
        },
      ]}
    >
      <View style={styles.rowHead}>
        <Text style={[styles.attempt, { color: theme.colors.text }]}>
          Intento {submission.attempt}
        </Text>
        <Text style={[styles.status, { color: theme.colors.neutral[600] }]}>
          {statusLabel(submission.status)}
        </Text>
      </View>

      {/* The prompt itself, trimmed. Seeing what you wrote last time is the
          whole point of the list. */}
      <Text style={[styles.prompt, { color: theme.colors.neutral[700] }]} numberOfLines={2}>
        {submission.prompt}
      </Text>

      {submission.failureReason ? (
        <Text style={[styles.failure, { color: theme.colors.accentRamp[700] }]}>
          {submission.failureReason}
        </Text>
      ) : null}

      {scored ? (
        <Link
          href={`/lab/submissions/${submission.id}`}
          style={[styles.link, { color: theme.colors.accent }]}
        >
          Ver la devolución →
        </Link>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 6.8, marginTop: 13.6 },
  title: { fontSize: 15, fontWeight: '600', marginBottom: 3.4 },
  row: { borderWidth: 1, padding: 10.2, gap: 3.4 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  attempt: { fontSize: 14, fontWeight: '600' },
  status: { fontSize: 12 },
  prompt: { fontSize: 13, lineHeight: 19 },
  failure: { fontSize: 12 },
  link: { fontSize: 13, fontWeight: '600', marginTop: 3.4 },
});
