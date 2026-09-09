import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTheme } from '@/core/theme';
import { ErrorState, LoadingState } from '@/core/ui/state-view';
import { useEntitlements } from '@/features/billing';
import { useReply, useThread } from '@/features/forum/application/use-forum';
import { MAX_BODY_CHARS, replyLabel, timeAgo } from '@/features/forum/domain/entities';
import { ModerateControl } from '@/features/forum/presentation/moderate-control';

export function ThreadScreen() {
  const theme = useTheme();
  const { slug, threadId } = useLocalSearchParams<{ slug: string; threadId: string }>();
  const courseSlug = slug ?? '';

  const { thread, isLoading, error } = useThread(courseSlug, threadId ?? '');
  const { entitlements } = useEntitlements();
  // Null means billing is not configured, which is generous by design: a
  // misconfiguration must not silence a whole course's forum.
  const canPost = entitlements === null || entitlements.canPostInForum;
  const reply = useReply(courseSlug, threadId ?? '');
  const [body, setBody] = useState('');

  const ready = body.trim().length > 0 && !reply.isPending;

  const send = () => {
    if (!ready) return;
    reply.mutate(body.trim(), { onSuccess: () => setBody('') });
  };

  if (isLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        <LoadingState label="Cargando la discusión…" />
      </View>
    );
  }

  if (error || !thread) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        <ErrorState error={error} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.content}
    >
      <Link
        href={`/catalog/${courseSlug}/forum`}
        style={[styles.back, { color: theme.colors.accent }]}
      >
        ← Volver al foro
      </Link>

      <Text style={[styles.title, { color: theme.colors.text }]}>
        {thread.isHidden ? '[Discusión retirada por moderación]' : thread.title}
      </Text>
      <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>
        {thread.authorName} · {timeAgo(thread.createdAt)} · {replyLabel(thread.replyCount)}
      </Text>

      <View
        style={[
          styles.opening,
          {
            backgroundColor: theme.colors.neutral[100],
            borderColor: theme.colors.divider,
            borderRadius: theme.radius.md,
          },
        ]}
      >
        <Text style={[styles.body, { color: theme.colors.text }]}>{thread.body}</Text>
      </View>

      {thread.canModerate && !thread.isHidden ? (
        <ModerateControl slug={courseSlug} kind="thread" id={thread.id} />
      ) : null}

      {thread.posts.map((post) => (
        <View
          key={post.id}
          style={[
            styles.post,
            { borderColor: theme.colors.divider, borderRadius: theme.radius.md },
          ]}
        >
          <Text style={[styles.author, { color: theme.colors.text }]}>
            {post.authorName}{' '}
            <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>
              · {timeAgo(post.createdAt)}
            </Text>
          </Text>
          {/* A moderated reply is replaced, not removed: the shape of the
              conversation survives, so nobody is left wondering what the reply
              above them was answering. */}
          <Text
            style={[
              styles.body,
              {
                color: post.isHidden ? theme.colors.neutral[600] : theme.colors.text,
                fontStyle: post.isHidden ? 'italic' : 'normal',
              },
            ]}
          >
            {post.body}
          </Text>

          {thread.canModerate && !post.isHidden ? (
            <ModerateControl slug={courseSlug} kind="post" id={post.id} />
          ) : null}
        </View>
      ))}

      {/* Same rule as the forum listing, which already got this right: someone
          whose plan does not allow posting is told so instead of being handed a
          box to write in and refused afterwards. */}
      {!canPost ? (
        <View
          style={[
            styles.gate,
            { borderColor: theme.colors.divider, borderRadius: theme.radius.md },
          ]}
        >
          <Text style={[styles.replyLabel, { color: theme.colors.neutral[700] }]}>
            Con tu plan actual podés leer el foro, pero no responder.
          </Text>
          <Link href="/plans" style={[styles.planLink, { color: theme.colors.accent }]}>
            Ver planes →
          </Link>
        </View>
      ) : (
        <>
      <Text style={[styles.replyLabel, { color: theme.colors.neutral[700] }]}>Tu respuesta</Text>
      <TextInput
        value={body}
        onChangeText={setBody}
        multiline
        textAlignVertical="top"
        maxLength={MAX_BODY_CHARS}
        placeholder="Contá qué te funcionó a vos."
        placeholderTextColor={theme.colors.neutral[500]}
        accessibilityLabel="Tu respuesta"
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.neutral[100],
            borderColor: theme.colors.divider,
            borderRadius: theme.radius.md,
            color: theme.colors.text,
          },
        ]}
      />

      {reply.isError ? (
        <Text style={[styles.error, { color: theme.colors.accentRamp[700] }]}>
          No pudimos publicar tu respuesta.
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={!ready}
        onPress={send}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.md,
            opacity: !ready ? 0.5 : pressed ? 0.85 : 1,
          },
        ]}
      >
        {reply.isPending ? (
          <ActivityIndicator color="#f2f2f3" />
        ) : (
          <Text style={styles.buttonLabel}>Responder</Text>
        )}
      </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  gate: { borderWidth: 1, padding: 13.6, gap: 6.8, marginTop: 13.6 },
  planLink: { fontSize: 15, fontWeight: '600' },
  screen: { flex: 1 },
  content: {
    padding: 20.4,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    gap: 10.2,
  },
  back: { fontSize: 14, fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '600', lineHeight: 32 },
  meta: { fontSize: 12 },
  opening: { borderWidth: 1, padding: 13.6, marginVertical: 6.8 },
  post: { borderWidth: 1, padding: 13.6, gap: 3.4 },
  author: { fontSize: 14, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 23 },
  replyLabel: { fontSize: 13, marginTop: 13.6 },
  input: {
    borderWidth: 1,
    padding: 13.6,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 110,
  },
  error: { fontSize: 14 },
  button: {
    paddingVertical: 13.6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonLabel: { color: '#f2f2f3', fontSize: 16, fontWeight: '600' },
});
