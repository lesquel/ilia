import { BookOpen, CalendarDays, ClipboardList } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { EmptyState, ErrorState, LoadingState } from '@/core/ui/state-view';
import { Card, Fact, OutlineLink, ScreenHeader, Tag, useIsWide } from '@/core/ui/surface';
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

function submissionDate(value: string | null): string {
  if (!value) return 'Fecha no disponible';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function EvaluationsScreen() {
  const { isAuthenticated, isLoading: isCheckingSession } = useSession();
  const { items, isLoading, error, refetch } = useGlobalSubmissionHistory(isAuthenticated);

  if (isCheckingSession) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (!isAuthenticated) {
    return (
      <Screen>
        <EmptyState
          glyph={ClipboardList}
          title="Inicia sesión para ver tus entregas"
          hint="Aquí aparecen los intentos de las actividades de tus cursos."
        />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState error={error} onRetry={() => void refetch()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        back={{ label: 'Mis cursos', href: '/my-courses' }}
        title="Historial de entregas"
        subtitle="Historial de entregas en tus cursos inscritos."
      />

      {isLoading ? (
        <LoadingState label="Cargando entregas…" />
      ) : items.length === 0 ? (
        <EmptyState
          glyph={ClipboardList}
          title="Todavía no tienes entregas"
          hint="Cuando envíes un prompt en una actividad, lo verás aquí."
          action={{ label: 'Ir a mis cursos', href: '/my-courses' }}
        />
      ) : (
        <Card style={styles.list}>
          {items.map((item, index) => (
            <HistoryRow key={item.submission.id} item={item} isFirst={index === 0} />
          ))}
        </Card>
      )}
    </Screen>
  );
}

function Screen({ children }: { children: ReactNode }) {
  const theme = useTheme();

  return (
    <ScrollView style={{ backgroundColor: theme.colors.bg }} contentContainerStyle={styles.content}>
      {children}
    </ScrollView>
  );
}

function HistoryRow({ item, isFirst }: { item: SubmissionHistoryItem; isFirst: boolean }) {
  const theme = useTheme();
  const isWide = useIsWide();
  const { status } = item.submission;
  const scored = status === 'scored';

  return (
    <View
      style={[
        styles.row,
        isWide ? styles.rowWide : undefined,
        isFirst ? undefined : { borderTopWidth: 1, borderTopColor: theme.colors.divider },
      ]}
    >
      <View style={styles.what}>
        <Text style={[styles.activityTitle, { color: theme.colors.text }]}>
          {item.activityTitle}
        </Text>
        <View style={styles.facts}>
          <Fact glyph={BookOpen} label={item.courseTitle} />
          <Fact glyph={CalendarDays} label={submissionDate(item.submission.createdAt)} />
        </View>
        <Text style={[styles.prompt, { color: theme.colors.neutral[800] }]} numberOfLines={2}>
          {item.submission.prompt}
        </Text>
      </View>

      <View style={[styles.result, isWide ? styles.resultWide : undefined]}>
        <Text style={[styles.attempt, { color: theme.colors.neutral[800] }]}>
          Intento {item.submission.attempt}
        </Text>
        {/* Filled once it has been read, hollow while it waits or after it
            failed, so the state does not rest on the tint alone. */}
        <Tag
          label={statusLabel(status)}
          tone={status === 'failed' ? 'neutral' : 'accent'}
          filled={scored}
        />
        {scored ? (
          <OutlineLink
            href={`/lab/submissions/${item.submission.id}`}
            label="Ver devolución"
            accessibilityLabel="Ver devolución de este intento"
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20.4,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    gap: 20.4,
  },
  // The rows bring their own vertical padding, so the card adds none between.
  list: { gap: 0, paddingVertical: 6.8 },
  row: { gap: 10.2, paddingVertical: 13.6 },
  rowWide: { flexDirection: 'row', alignItems: 'center', gap: 20.4 },
  what: { flex: 1, minWidth: 0, gap: 6.8 },
  activityTitle: { fontSize: 16, fontWeight: '600' },
  facts: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 13.6, rowGap: 3.4 },
  prompt: { fontSize: 13, lineHeight: 19 },
  result: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10.2 },
  resultWide: { justifyContent: 'flex-end' },
  attempt: { fontSize: 13, fontWeight: '700' },
});
