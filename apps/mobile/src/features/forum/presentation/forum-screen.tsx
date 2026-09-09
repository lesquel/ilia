import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ApiError } from '@/core/errors/api-error';
import { useTheme } from '@/core/theme';
import { EmptyState, ErrorState, LoadingState } from '@/core/ui/state-view';
import { useSession } from '@/features/auth';
import { useEntitlements } from '@/features/billing';
import { useOpenThread, useThreads } from '@/features/forum/application/use-forum';
import {
  MAX_TITLE_CHARS,
  replyLabel,
  timeAgo,
  type ThreadSummary,
} from '@/features/forum/domain/entities';

export function ForumScreen() {
  const theme = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const courseSlug = slug ?? '';

  const { threads, isLoading, error, refetch } = useThreads(courseSlug);
  const { isAuthenticated } = useSession();
  const { entitlements } = useEntitlements({ enabled: isAuthenticated });
  const open = useOpenThread(courseSlug);

  // PRD 11: reading is free, participating is not. The composer is replaced by
  // an explanation rather than by a button that 403s.
  const canPost = entitlements === null || entitlements.canPostInForum;

  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const ready = title.trim().length > 0 && body.trim().length > 0 && !open.isPending;

  const submit = () => {
    if (!ready) return;
    open.mutate(
      { title: title.trim(), body: body.trim() },
      {
        onSuccess: () => {
          setTitle('');
          setBody('');
          setComposing(false);
        },
      },
    );
  };

  if (error) {
    const denied = error instanceof ApiError && error.code === 'forum_access_denied';

    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        {denied ? (
          <EmptyState
            title="El foro es para quienes están en el curso"
            hint="Inscribite y vas a poder leer y preguntar."
          />
        ) : (
          <ErrorState error={error} onRetry={() => void refetch()} />
        )}
        <Link href={`/catalog/${courseSlug}`} style={[styles.link, { color: theme.colors.accent }]}>
          Volver al curso
        </Link>
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.content}
      data={threads}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ThreadRow thread={item} slug={courseSlug} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Link
            href={`/catalog/${courseSlug}`}
            style={[styles.back, { color: theme.colors.accent }]}
          >
            ← Volver al curso
          </Link>

          <Text style={[styles.title, { color: theme.colors.text }]}>Foro del curso</Text>
          <Text style={[styles.subtitle, { color: theme.colors.neutral[600] }]}>
            Preguntá lo que no te salga. Alguien más ya lo intentó.
          </Text>

          {!canPost ? (
            <View
              style={[
                styles.composer,
                { borderColor: theme.colors.divider, borderRadius: theme.radius.md },
              ]}
            >
              <Text style={[styles.subtitle, { color: theme.colors.neutral[700] }]}>
                Con tu plan actual podés leer el foro, pero no publicar.
              </Text>
              <Link href="/plans" style={[styles.link, { color: theme.colors.accent }]}>
                Ver planes →
              </Link>
            </View>
          ) : composing ? (
            <View
              style={[
                styles.composer,
                {
                  backgroundColor: theme.colors.neutral[100],
                  borderColor: theme.colors.divider,
                  borderRadius: theme.radius.md,
                },
              ]}
            >
              <TextInput
                value={title}
                onChangeText={setTitle}
                maxLength={MAX_TITLE_CHARS}
                placeholder="¿Cuál es tu pregunta?"
                placeholderTextColor={theme.colors.neutral[500]}
                accessibilityLabel="Título de la discusión"
                style={[
                  styles.input,
                  {
                    borderColor: theme.colors.divider,
                    borderRadius: theme.radius.sm,
                    color: theme.colors.text,
                  },
                ]}
              />
              <TextInput
                value={body}
                onChangeText={setBody}
                multiline
                textAlignVertical="top"
                placeholder="Contá qué probaste y qué pasó."
                placeholderTextColor={theme.colors.neutral[500]}
                accessibilityLabel="Cuerpo de la discusión"
                style={[
                  styles.input,
                  styles.textarea,
                  {
                    borderColor: theme.colors.divider,
                    borderRadius: theme.radius.sm,
                    color: theme.colors.text,
                  },
                ]}
              />

              {open.isError ? (
                <Text style={[styles.error, { color: theme.colors.accentRamp[700] }]}>
                  No pudimos publicar tu discusión.
                </Text>
              ) : null}

              <View style={styles.composerActions}>
                <Pressable onPress={() => setComposing(false)} accessibilityRole="button">
                  <Text style={[styles.link, { color: theme.colors.neutral[600] }]}>Cancelar</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={!ready}
                  onPress={submit}
                  style={({ pressed }) => [
                    styles.button,
                    {
                      backgroundColor: theme.colors.accent,
                      borderRadius: theme.radius.md,
                      opacity: !ready ? 0.5 : pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  {open.isPending ? (
                    <ActivityIndicator color="#f2f2f3" />
                  ) : (
                    <Text style={styles.buttonLabel}>Publicar</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => setComposing(true)}
              style={({ pressed }) => [
                styles.button,
                styles.newButton,
                {
                  backgroundColor: theme.colors.accent,
                  borderRadius: theme.radius.md,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={styles.buttonLabel}>+ Nueva discusión</Text>
            </Pressable>
          )}
        </View>
      }
      ListEmptyComponent={
        isLoading ? (
          <LoadingState label="Cargando el foro…" />
        ) : (
          <EmptyState
            title="Todavía no hay discusiones"
            hint="Sé el primero en preguntar. A alguien más le va a servir."
          />
        )
      }
    />
  );
}

function ThreadRow({ thread, slug }: { thread: ThreadSummary; slug: string }) {
  const theme = useTheme();

  return (
    <Link href={`/catalog/${slug}/forum/${thread.id}`} asChild>
      <Pressable accessibilityRole="link">
        {({ pressed }) => (
          <View
            style={[
              styles.row,
              {
                backgroundColor: theme.colors.neutral[100],
                borderColor: theme.colors.divider,
                borderRadius: theme.radius.md,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.rowTitle,
                { color: thread.isHidden ? theme.colors.neutral[600] : theme.colors.text },
              ]}
              numberOfLines={2}
            >
              {thread.isHidden ? '[Discusión retirada por moderación]' : thread.title}
            </Text>
            <Text style={[styles.rowMeta, { color: theme.colors.neutral[600] }]}>
              {thread.authorName} · {replyLabel(thread.replyCount)} · última actividad{' '}
              {timeAgo(thread.lastActivityAt)}
            </Text>
          </View>
        )}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 27.2, gap: 13.6 },
  content: {
    padding: 20.4,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    gap: 10.2,
  },
  header: { gap: 6.8, marginBottom: 6.8 },
  back: { fontSize: 14, fontWeight: '600' },
  title: { fontSize: 30, fontWeight: '600' },
  subtitle: { fontSize: 15, marginBottom: 6.8 },
  composer: { borderWidth: 1, padding: 13.6, gap: 6.8 },
  input: { borderWidth: 1, paddingHorizontal: 10.2, paddingVertical: 10.2, fontSize: 15 },
  textarea: { minHeight: 110 },
  composerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 13.6,
  },
  newButton: { alignSelf: 'flex-start', paddingHorizontal: 20.4 },
  button: {
    paddingVertical: 10.2,
    paddingHorizontal: 20.4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonLabel: { color: '#f2f2f3', fontSize: 15, fontWeight: '600' },
  error: { fontSize: 14 },
  link: { fontSize: 15, fontWeight: '600' },
  row: { borderWidth: 1, padding: 13.6, gap: 3.4 },
  rowTitle: { fontSize: 17, fontWeight: '600' },
  rowMeta: { fontSize: 12 },
});
