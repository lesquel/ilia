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
      return 'Leyendo…';
    case 'scored':
      return 'Leído';
    case 'failed':
      return 'No se pudo leer';
  }
}

export function AttemptHistory({ activityId }: { activityId: string }) {
  const { submissions, isLoading } = useMySubmissions(activityId);

  if (isLoading || submissions.length === 0) return null;

  return (
    <View style={styles.block}>
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
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.divider,
          borderRadius: theme.radius.md,
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
          style={[styles.link, { color: theme.colors.accentAlt }]}
        >
          Ver esa devolución
        </Link>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 8, marginTop: 18 },
  row: { borderWidth: 1, padding: 12, gap: 4 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  attempt: { fontSize: 13, fontWeight: '700' },
  status: { fontSize: 12 },
  prompt: { fontSize: 13, lineHeight: 19 },
  failure: { fontSize: 12 },
  link: { fontSize: 13, fontWeight: '600', marginTop: 4 },
});
