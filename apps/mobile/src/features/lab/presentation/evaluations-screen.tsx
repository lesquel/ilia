import { Link } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { EmptyState, ErrorState, LoadingState } from '@/core/ui/state-view';
import { useSession } from '@/features/auth';
import { useGlobalSubmissionHistory } from '@/features/lab/application/use-global-submissions';
import type { SubmissionHistoryItem } from '@/features/lab/domain/submission-history';
import type { SubmissionStatus } from '@/features/lab/domain/entities';

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

export function EvaluationsScreen() {
  const theme = useTheme();
  const { isAuthenticated, isLoading: isCheckingSession } = useSession();
  const { items, isLoading, error, refetch } = useGlobalSubmissionHistory(isAuthenticated);

  if (isCheckingSession) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        <LoadingState />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        <EmptyState
          title="Inicia sesión para ver tus entregas"
          hint="Aquí aparecen los intentos de las actividades de tus cursos."
        />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        <ErrorState error={error} onRetry={() => void refetch()} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(row) => row.submission.id}
      renderItem={({ item }) => <HistoryRow item={item} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Evaluaciones</Text>
          <Text style={[styles.subtitle, { color: theme.colors.neutral[600] }]}>
            Historial de entregas en tus cursos inscritos.
          </Text>
        </View>
      }
      ListEmptyComponent={
        isLoading ? (
          <LoadingState label="Cargando entregas…" />
        ) : (
          <EmptyState
            title="Todavía no tienes entregas"
            hint="Cuando envíes un prompt en una actividad, lo verás aquí."
          />
        )
      }
    />
  );
}

function HistoryRow({ item }: { item: SubmissionHistoryItem }) {
  const theme = useTheme();
  const scored = item.submission.status === 'scored';

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
      <Text style={[styles.courseTag, { color: theme.colors.neutral[600] }]}>{item.courseTitle}</Text>
      <Text style={[styles.activityTitle, { color: theme.colors.text }]}>{item.activityTitle}</Text>

      <View style={styles.rowHead}>
        <Text style={[styles.attempt, { color: theme.colors.text }]}>
          Intento {item.submission.attempt}
        </Text>
        <Text style={[styles.status, { color: theme.colors.neutral[600] }]}>
          {statusLabel(item.submission.status)}
        </Text>
      </View>

      <Text style={[styles.prompt, { color: theme.colors.neutral[700] }]} numberOfLines={2}>
        {item.submission.prompt}
      </Text>

      {scored ? (
        <Link href={`/lab/submissions/${item.submission.id}`} asChild>
          <Pressable accessibilityRole="link" accessibilityLabel="Ver devolución de este intento">
            {({ pressed }) => (
              <Text
                style={[
                  styles.link,
                  { color: theme.colors.accent, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                Ver devolución
              </Text>
            )}
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 27.2,
  },
  content: {
    padding: 20.4,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    gap: 12,
  },
  header: {
    gap: 6.8,
    marginBottom: 6.8,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 15,
  },
  row: {
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  courseTag: {
    fontSize: 12,
  },
  activityTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  rowHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  attempt: {
    fontSize: 13,
    fontWeight: '700',
  },
  status: {
    fontSize: 12,
  },
  prompt: {
    fontSize: 13,
    lineHeight: 19,
  },
  link: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
});
