import { Link } from 'expo-router';
import { ArrowRight, MessageSquare } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon } from '@/core/ui/icon';
import { useThreads } from '@/features/forum/application/use-forum';
import { replyLabel, timeAgo } from '@/features/forum/domain/entities';

const DEFAULT_LIMIT = 5;

/**
 * The latest discussions of a course, for a screen that is not the forum.
 *
 * Read-only on purpose: opening, replying and moderating stay in the forum
 * screens, where the whole conversation is in view. This is the glance that
 * tells an author whether there is something to go and answer.
 */
export function RecentThreadsPanel({
  slug,
  limit = DEFAULT_LIMIT,
}: {
  slug: string;
  limit?: number;
}) {
  const theme = useTheme();
  const { threads, isLoading, error } = useThreads(slug);

  // The listing already arrives with the most recently active thread first.
  const latest = threads.slice(0, limit);
  const muted = theme.colors.neutral[600];

  return (
    <View style={styles.panel}>
      {!slug || isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={[styles.meta, { color: muted }]}>Cargando el foro…</Text>
        </View>
      ) : error ? (
        <Text style={[styles.body, { color: muted }]}>
          No pudimos cargar el foro de este curso.
        </Text>
      ) : latest.length === 0 ? (
        <Text style={[styles.body, { color: muted }]}>
          Todavía no hay discusiones. Cuando alguien pregunte algo, aparece aquí.
        </Text>
      ) : (
        <View>
          {latest.map((thread, index) => (
            <Link key={thread.id} href={`/catalog/${slug}/forum/${thread.id}`} asChild>
              <Pressable accessibilityRole="link">
                {({ pressed }) => (
                  <View
                    style={[
                      styles.row,
                      {
                        borderTopColor: index === 0 ? 'transparent' : theme.colors.divider,
                        opacity: pressed ? 0.6 : 1,
                      },
                    ]}
                  >
                    <Icon glyph={MessageSquare} size={16} color={muted} />
                    <View style={styles.rowText}>
                      <Text
                        style={[
                          styles.rowTitle,
                          { color: thread.isHidden ? muted : theme.colors.text },
                        ]}
                        numberOfLines={2}
                      >
                        {thread.isHidden ? '[Discusión retirada por moderación]' : thread.title}
                      </Text>
                      <Text style={[styles.meta, { color: muted }]} numberOfLines={1}>
                        {thread.authorName} · {replyLabel(thread.replyCount)} · última actividad{' '}
                        {timeAgo(thread.lastActivityAt ?? thread.createdAt)}
                      </Text>
                    </View>
                  </View>
                )}
              </Pressable>
            </Link>
          ))}
          {threads.length > latest.length ? (
            <Text style={[styles.meta, styles.more, { color: muted }]}>
              Y {threads.length - latest.length} más en el foro.
            </Text>
          ) : null}
        </View>
      )}

      {slug ? (
        <Link href={`/catalog/${slug}/forum`} asChild>
          <Pressable accessibilityRole="link" style={styles.forumLink}>
            <Text style={[styles.forumLabel, { color: theme.colors.accent }]}>
              Ir al foro del curso
            </Text>
            <Icon glyph={ArrowRight} size={16} color={theme.colors.accent} />
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 10.2 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 10.2 },
  body: { fontSize: 14, lineHeight: 21 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10.2,
    paddingVertical: 10.2,
    borderTopWidth: 1,
  },
  rowText: { flex: 1, minWidth: 0, gap: 3.4 },
  rowTitle: { fontSize: 15, fontWeight: '600', lineHeight: 21 },
  meta: { fontSize: 13 },
  more: { paddingTop: 3.4 },
  forumLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 6,
  },
  forumLabel: { fontSize: 15, fontWeight: '600' },
});
