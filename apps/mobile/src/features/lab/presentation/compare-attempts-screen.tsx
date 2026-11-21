import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { useIsWide } from '@/core/ui/surface';
import { EmptyState } from '@/core/ui/state-view';
import {
  useActivity,
  useMySubmissions,
  useSubmissionResult,
} from '@/features/lab/application/use-lab';
import {
  compareAttempts,
  defaultComparisonPair,
  formatScoreDelta,
  orderPair,
} from '@/features/lab/domain/attempt-comparison';
import { dimensionName, type Submission } from '@/features/lab/domain/entities';
import { CompareAttemptsScreenSkeleton } from '@/features/lab/presentation/compare-attempts-screen-skeleton';

export function CompareAttemptsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const isWide = useIsWide();
  const params = useLocalSearchParams<{ activityId: string; a?: string; b?: string }>();
  const activityId = params.activityId ?? '';

  const { activity } = useActivity(activityId);
  const { submissions, isLoading } = useMySubmissions(activityId);

  const fallback = defaultComparisonPair(submissions);
  const byId = (id?: string) => submissions.find((item) => item.id === id);
  let first = byId(params.a) ?? byId(fallback?.[0]);
  let second = byId(params.b) ?? byId(fallback?.[1]);
  if (first && second && first.id === second.id) {
    // A hand-edited link pointing twice at one attempt falls back to the latest two.
    first = byId(fallback?.[0]);
    second = byId(fallback?.[1]);
  }
  const [earlier, later] =
    first && second && first.id !== second.id
      ? orderPair(first, second)
      : [undefined, undefined];

  const left = useSubmissionResult(earlier?.id ?? '');
  const right = useSubmissionResult(later?.id ?? '');

  if (isLoading) {
    return <CompareAttemptsScreenSkeleton />;
  }

  if (!earlier || !later) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        <EmptyState
          title="Todavía no hay dos intentos"
          hint="Cuando entregues un segundo pedido vas a poder ponerlo al lado del primero."
        />
      </View>
    );
  }

  const comparison = compareAttempts(
    { submission: left.submission ?? earlier, evaluation: left.evaluation },
    { submission: right.submission ?? later, evaluation: right.evaluation },
  );

  const pick = (slot: 'a' | 'b', id: string) => {
    const other = slot === 'a' ? later.id : earlier.id;
    if (id === other) return;
    router.setParams(slot === 'a' ? { a: id, b: other } : { a: other, b: id });
  };

  const muted = theme.colors.neutral[600];
  const card = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.divider,
    borderRadius: theme.radius.lg,
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={[styles.content, isWide ? styles.contentWide : undefined]}
    >
      <Text style={[styles.eyebrow, { color: theme.colors.accentRamp[700] }]}>
        Comparar intentos{activity ? ` · ${activity.title}` : ''}
      </Text>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        Intento {earlier.attempt} al lado del intento {later.attempt}
      </Text>

      <ChipRow label="Antes" submissions={submissions} selected={earlier.id} blocked={later.id} onPick={(id) => pick('a', id)} />
      <ChipRow label="Después" submissions={submissions} selected={later.id} blocked={earlier.id} onPick={(id) => pick('b', id)} />

      <View style={[styles.pair, isWide ? styles.pairWide : undefined]}>
        {[
          { submission: earlier, total: comparison.earlierTotal },
          { submission: later, total: comparison.laterTotal },
        ].map(({ submission, total }) => (
          <View key={submission.id} style={[styles.column, isWide ? styles.columnWide : undefined]}>
            <Text style={[styles.columnTitle, { color: theme.colors.text }]}>
              Intento {submission.attempt}
            </Text>
            <View style={[styles.card, card]}>
              <Text style={[styles.prompt, { color: theme.colors.text }]}>{submission.prompt}</Text>
            </View>
            <Text style={[styles.score, { color: theme.colors.text }]}>
              {total !== null ? `Nota: ${Math.round(total)}` : 'Nota: todavía sin leer'}
            </Text>
          </View>
        ))}
      </View>

      <View style={[styles.card, card, styles.summary]}>
        <Text style={[styles.columnTitle, { color: theme.colors.text }]}>Qué cambió</Text>
        {comparison.totalDelta !== null ? (
          <Text style={[styles.body, { color: theme.colors.text }]}>
            Nota total: {formatScoreDelta(comparison.totalDelta)}
          </Text>
        ) : null}
        {!comparison.complete ? (
          <Text style={[styles.body, { color: muted }]}>
            Uno de los dos intentos todavía no tiene nota. El cambio completo aparece cuando se lean
            los dos.
          </Text>
        ) : null}
        {comparison.dimensions.map((item) => (
          <View key={item.key} style={styles.dimRow}>
            <Text style={[styles.body, { color: theme.colors.neutral[700] }]}>
              {dimensionName(activity, item.key)}
            </Text>
            <Text style={[styles.body, styles.dimValue, { color: theme.colors.text }]}>
              {item.delta !== null ? formatScoreDelta(item.delta) : '—'}
            </Text>
          </View>
        ))}
        {comparison.fixedRequirements.length > 0 ? (
          <>
            <Text style={[styles.listTitle, { color: theme.colors.accentAlt }]}>Ahora cumples</Text>
            {comparison.fixedRequirements.map((item) => (
              <Text key={item} style={[styles.body, { color: theme.colors.neutral[700] }]}>· {item}</Text>
            ))}
          </>
        ) : null}
        {comparison.newRequirements.length > 0 ? (
          <>
            <Text style={[styles.listTitle, { color: theme.colors.accentRamp[700] }]}>
              Antes cumplías y ahora no
            </Text>
            {comparison.newRequirements.map((item) => (
              <Text key={item} style={[styles.body, { color: theme.colors.neutral[700] }]}>· {item}</Text>
            ))}
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

function ChipRow({
  label,
  submissions,
  selected,
  blocked,
  onPick,
}: {
  label: string;
  submissions: Submission[];
  selected: string;
  blocked: string;
  onPick: (id: string) => void;
}) {
  const theme = useTheme();
  const ordered = [...submissions].sort((x, y) => x.attempt - y.attempt);

  return (
    <View style={styles.chipRow}>
      <Text style={[styles.chipLabel, { color: theme.colors.neutral[600] }]}>{label}</Text>
      {ordered.map((item) => {
        const active = item.id === selected;
        const disabled = item.id === blocked;
        return (
          <Pressable
            key={item.id}
            onPress={() => onPick(item.id)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`${label}: intento ${item.attempt}`}
            accessibilityState={{ selected: active, disabled }}
            aria-pressed={active}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: active ? theme.colors.accentButton : 'transparent',
                borderColor: active ? theme.colors.accent : theme.colors.divider,
                borderRadius: theme.radius.sm,
                opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={[styles.chipText, { color: active ? '#ffffff' : theme.colors.neutral[700] }]}>
              Intento {item.attempt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 14 },
  contentWide: { maxWidth: 1040, width: '100%', alignSelf: 'center', padding: 32 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  title: { fontSize: 22, fontWeight: '700' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  chipLabel: { fontSize: 13, fontWeight: '600', minWidth: 64 },
  chip: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 13, fontWeight: '600' },
  pair: { gap: 16 },
  pairWide: { flexDirection: 'row', alignItems: 'flex-start' },
  column: { gap: 8 },
  columnWide: { flex: 1 },
  columnTitle: { fontSize: 15, fontWeight: '700' },
  card: { borderWidth: 1, padding: 14 },
  prompt: { fontSize: 14, lineHeight: 21 },
  score: { fontSize: 14, fontWeight: '600' },
  summary: { gap: 6 },
  body: { fontSize: 14, lineHeight: 20 },
  dimRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  dimValue: { fontWeight: '700' },
  listTitle: { fontSize: 13, fontWeight: '700', marginTop: 8 },
});
