import { Link, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { ProgressBar } from '@/core/ui/progress-bar';
import { EmptyState, ErrorState, LoadingState } from '@/core/ui/state-view';
import { useRoster } from '@/features/instructor/application/use-instructor';
import type { RosterEntry } from '@/features/instructor/domain/entities';

/** Who is enrolled and how far they got (PRD I-04). */
export function RosterScreen() {
  const theme = useTheme();
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const id = courseId ?? '';

  const { roster, isLoading, error } = useRoster(id);

  if (error) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        <ErrorState error={error} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.content}
      data={roster}
      keyExtractor={(item) => item.userId}
      renderItem={({ item }) => <RosterRow entry={item} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Link
            href={`/instructor/courses/${id}`}
            style={[styles.link, { color: theme.colors.accent }]}
          >
            ← Volver al curso
          </Link>
          <Text style={[styles.title, { color: theme.colors.text }]}>Inscritos</Text>
          <Text style={[styles.subtitle, { color: theme.colors.neutral[600] }]}>
            Quién se anotó, de qué charla vino y hasta dónde llegó.
          </Text>
        </View>
      }
      ListEmptyComponent={
        isLoading ? (
          <LoadingState label="Cargando inscritos…" />
        ) : (
          <EmptyState
            title="Todavía no hay nadie inscrito"
            hint="Publicá el curso y compartí el enlace para que empiecen a anotarse."
          />
        )
      }
    />
  );
}

function RosterRow({ entry }: { entry: RosterEntry }) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.neutral[100],
          borderColor: theme.colors.divider,
          borderRadius: theme.radius.md,
        },
      ]}
    >
      <Text style={[styles.name, { color: theme.colors.text }]}>{entry.fullName}</Text>
      {/* The email is here on purpose: reaching a teacher who stopped halfway is
          the entire point of looking at this list. */}
      <Text selectable style={[styles.meta, { color: theme.colors.neutral[600] }]}>
        {entry.email}
      </Text>

      {entry.cohortName ? (
        <Text style={[styles.cohort, { color: theme.colors.accentRamp[700] }]}>
          {entry.cohortName}
        </Text>
      ) : (
        <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>
          Inscripción abierta
        </Text>
      )}

      <ProgressBar
        percentage={entry.percentage}
        label={`${entry.lessonsCompleted} de ${entry.lessonsTotal} lecciones · ${entry.percentage}%`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 27.2 },
  content: {
    padding: 20.4,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    gap: 10.2,
  },
  header: { gap: 6.8, marginBottom: 6.8 },
  title: { fontSize: 30, fontWeight: '600' },
  subtitle: { fontSize: 15, lineHeight: 22 },
  link: { fontSize: 15, fontWeight: '600' },
  card: { borderWidth: 1, padding: 13.6, gap: 3.4 },
  name: { fontSize: 17, fontWeight: '600' },
  meta: { fontSize: 13 },
  cohort: { fontSize: 12, fontWeight: '600' },
});
