import { useLocalSearchParams, type Href } from 'expo-router';
import { Clock, Lock, MessageSquare } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon } from '@/core/ui/icon';
import { ProfileAvatar } from '@/core/ui/profile-avatar';
import { ErrorState, LoadingState } from '@/core/ui/state-view';
import {
  Card,
  Fact,
  Field,
  OutlineLink,
  PrimaryButton,
  ScreenHeader,
  SectionHeading,
  SubCard,
} from '@/core/ui/surface';
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
      <Screen>
        <LoadingState label="Cargando la discusión…" />
      </Screen>
    );
  }

  if (error || !thread) {
    return (
      <Screen>
        <ErrorState error={error} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        back={{ label: 'Volver al foro', href: `/catalog/${courseSlug}/forum` as Href }}
        title={thread.isHidden ? '[Discusión retirada por moderación]' : thread.title}
      />

      <Card>
        <View style={styles.facts}>
          <View style={styles.author}>
            <ProfileAvatar name={thread.authorName} avatarKey={thread.authorAvatarKey} avatarUrl={thread.authorAvatarUrl} size={28} />
            <Text style={[styles.authorName, { color: theme.colors.text }]}>{thread.authorName}</Text>
          </View>
          <Fact glyph={Clock} label={timeAgo(thread.createdAt)} />
          <Fact glyph={MessageSquare} label={replyLabel(thread.replyCount)} />
        </View>
        <Text style={[styles.body, { color: theme.colors.text }]}>{thread.body}</Text>

        {thread.canModerate && !thread.isHidden ? (
          <ModerateControl slug={courseSlug} kind="thread" id={thread.id} />
        ) : null}
      </Card>

      {thread.posts.length > 0 ? (
        <View style={styles.replies}>
          <SectionHeading title="Respuestas" />
          {thread.posts.map((post) => (
            <Card key={post.id} style={styles.post}>
              <View style={styles.facts}>
                <View style={styles.author}>
                  <ProfileAvatar name={post.authorName} avatarKey={post.authorAvatarKey} avatarUrl={post.authorAvatarUrl} size={28} />
                  <Text style={[styles.authorName, { color: theme.colors.text }]}>{post.authorName}</Text>
                </View>
                <Fact glyph={Clock} label={timeAgo(post.createdAt)} />
              </View>
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
            </Card>
          ))}
        </View>
      ) : null}

      {/* Same rule as the forum listing, which already got this right: someone
          whose plan does not allow posting is told so instead of being handed a
          box to write in and refused afterwards. */}
      {!canPost ? (
        <SubCard style={styles.planNote}>
          <Icon glyph={Lock} size={16} color={theme.colors.neutral[600]} />
          <Text style={[styles.planNoteText, { color: theme.colors.neutral[800] }]}>
            Con tu plan actual puedes leer el foro, pero no responder.
          </Text>
          <OutlineLink href="/plans" label="Ver planes" />
        </SubCard>
      ) : (
        <Card title="Tu respuesta">
          <Field
            value={body}
            onChangeText={setBody}
            multiline
            textAlignVertical="top"
            maxLength={MAX_BODY_CHARS}
            placeholder="Cuenta qué te funcionó a ti."
            accessibilityLabel="Tu respuesta"
            style={styles.textarea}
          />

          {reply.isError ? (
            <Text
              style={[styles.error, { color: theme.colors.accentRamp[700] }]}
              accessibilityRole="alert"
            >
              No pudimos publicar tu respuesta.
            </Text>
          ) : null}

          <View style={styles.replyActions}>
            <PrimaryButton
              label="Responder"
              onPress={send}
              disabled={!ready}
              busy={reply.isPending}
            />
          </View>
        </Card>
      )}
    </Screen>
  );
}

function Screen({ children }: { children: ReactNode }) {
  const theme = useTheme();

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20.4,
    maxWidth: 860,
    width: '100%',
    alignSelf: 'center',
    gap: 20.4,
  },
  facts: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 13.6, rowGap: 3.4 },
  body: { fontSize: 15, lineHeight: 23 },
  replies: { gap: 10.2 },
  post: { gap: 6.8 },
  author: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  authorName: { fontSize: 14, fontWeight: '700' },
  planNote: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10.2 },
  planNoteText: { flexGrow: 1, flexShrink: 1, flexBasis: 220, fontSize: 14, lineHeight: 21 },
  textarea: { minHeight: 110, lineHeight: 22 },
  error: { fontSize: 14 },
  replyActions: { flexDirection: 'row', justifyContent: 'flex-end' },
});
