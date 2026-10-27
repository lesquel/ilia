import { Link, useLocalSearchParams, type Href } from 'expo-router';
import { Clock, Lock, MessageSquare, MessagesSquare, Plus } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/core/errors/api-error';
import { useTheme } from '@/core/theme';
import { Icon } from '@/core/ui/icon';
import { ProfileAvatar } from '@/core/ui/profile-avatar';
import { EmptyState, ErrorState, LoadingState } from '@/core/ui/state-view';
import {
  Card,
  Fact,
  Field,
  FieldLabel,
  OutlineButton,
  OutlineLink,
  PrimaryButton,
  ScreenHeader,
  SubCard,
} from '@/core/ui/surface';
import { useSession } from '@/features/auth';
import { useCourse } from '@/features/catalog';
import { useEntitlements } from '@/features/billing';
import { useCommunity, useOpenThread, useThreads } from '@/features/forum/application/use-forum';
import { ModerateControl } from '@/features/forum/presentation/moderate-control';
import {
  MAX_TITLE_CHARS,
  replyLabel,
  timeAgo,
  type ThreadSummary,
} from '@/features/forum/domain/entities';

export function ForumScreen() {
  const theme = useTheme();
  const { slug, moduleId: moduleParam, cohortId: cohortParam, cohortTitle: cohortTitleParam } =
    useLocalSearchParams<{ slug: string; moduleId?: string; cohortId?: string; cohortTitle?: string }>();
  const courseSlug = slug ?? '';
  const moduleId = moduleParam ?? '';
  const cohortId = cohortParam ?? '';
  const cohortTitle = cohortTitleParam ?? '';
  const courseHref = `/catalog/${courseSlug}` as Href;

  const { course } = useCourse(courseSlug);
  const activeModule = course?.modules.find((module) => module.id === moduleId);
  const {
    courses: communityCourses,
    isLoading: communityLoading,
    error: communityError,
    refetch: refetchCommunity,
  } = useCommunity();
  const communityCourse = communityCourses.find((item) => item.slug === courseSlug);
  const { threads, isLoading, error, refetch } = useThreads(
    courseSlug,
    moduleId,
    cohortId || undefined,
  );
  const { isAuthenticated } = useSession();
  const { entitlements } = useEntitlements({ enabled: isAuthenticated });
  const open = useOpenThread(courseSlug);

  // PRD 11: reading is free, participating is not. The composer is replaced by
  // an explanation rather than by a button that 403s.
  const canPost = entitlements === null || entitlements.canPostInForum;

  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const ready = Boolean(moduleId) && title.trim().length > 0 && body.trim().length > 0 && !open.isPending;

  const submit = () => {
    if (!ready) return;
    open.mutate(
      { title: title.trim(), body: body.trim(), moduleId, cohortId: cohortId || null },
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
      <Screen>
        {denied ? (
          <EmptyState
            glyph={Lock}
            title="El foro es para quienes están en el curso"
            hint="Inscríbete y vas a poder leer y preguntar."
            action={{ label: 'Volver al curso', href: courseHref }}
          />
        ) : (
          <>
            <ErrorState error={error} onRetry={() => void refetch()} />
            <View style={styles.centered}>
              <OutlineLink href={courseHref} label="Volver al curso" />
            </View>
          </>
        )}
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        back={{ label: 'Volver al curso', href: courseHref }}
        title={activeModule?.title ?? 'Foros del curso'}
        subtitle={activeModule
          ? `${cohortTitle || 'Foro general'} · Pregunta lo que te está costando; quizá alguien ya lo resolvió.`
          : 'Elige un módulo y el espacio de conversación de tu grupo.'}
        actions={
          canPost && moduleId && !composing ? (
            <PrimaryButton label="Nueva discusión" glyph={Plus} onPress={() => setComposing(true)} />
          ) : undefined
        }
      />

      {!canPost ? (
        <SubCard style={styles.planNote}>
          <Icon glyph={Lock} size={16} color={theme.colors.neutral[600]} />
          <Text style={[styles.planNoteText, { color: theme.colors.neutral[800] }]}>
            Con tu plan actual puedes leer el foro, pero no publicar.
          </Text>
          <OutlineLink href="/plans" label="Ver planes" />
        </SubCard>
      ) : composing && moduleId ? (
        <Card title="Nueva discusión">
          <View>
            <FieldLabel>Título</FieldLabel>
            <Field
              value={title}
              onChangeText={setTitle}
              maxLength={MAX_TITLE_CHARS}
              placeholder="¿Cuál es tu pregunta?"
              accessibilityLabel="Título de la discusión"
            />
          </View>
          <View>
            <FieldLabel>Detalle</FieldLabel>
            <Field
              value={body}
              onChangeText={setBody}
              multiline
              textAlignVertical="top"
              placeholder="Cuenta qué probaste y qué pasó."
              accessibilityLabel="Cuerpo de la discusión"
              style={styles.textarea}
            />
          </View>

          {open.isError ? (
            <Text
              style={[styles.error, { color: theme.colors.accentRamp[700] }]}
              accessibilityRole="alert"
            >
              No pudimos publicar tu discusión.
            </Text>
          ) : null}

          <View style={styles.composerActions}>
            <OutlineButton label="Cancelar" onPress={() => setComposing(false)} />
            <PrimaryButton
              label="Publicar"
              onPress={submit}
              disabled={!ready}
              busy={open.isPending}
            />
          </View>
        </Card>
      ) : null}

      {!moduleId && communityLoading ? <LoadingState label="Buscando los foros del curso…" /> : null}
      {!moduleId && communityError ? <ErrorState error={communityError} onRetry={() => void refetchCommunity()} /> : null}
      {!moduleId && !communityLoading && !communityError && !communityCourse?.modules.length ? (
        <EmptyState glyph={MessagesSquare} title="Este curso todavía no tiene foros" hint="Cuando tenga módulos publicados, sus conversaciones aparecerán aquí." />
      ) : null}

      {!moduleId && communityCourse?.modules.length ? (
        <Card title="Foros por módulo y grupo" hint="Cada pregunta queda junto al contenido y la cohorte correspondiente.">
          <View style={styles.moduleList}>
            {communityCourse.modules.map((module) => (
              <View key={module.id} style={styles.moduleGroup}>
                <Text style={[styles.moduleTitle, { color: theme.colors.text }]}>{module.title}</Text>
                {module.forums.map((forum) => {
                  const cohortQuery = forum.cohortId
                    ? `&cohortId=${forum.cohortId}&cohortTitle=${encodeURIComponent(forum.cohortTitle ?? '')}`
                    : '';
                  return (
                    <Link key={`${module.id}-${forum.cohortId ?? 'general'}`} href={`/catalog/${courseSlug}/forum?moduleId=${module.id}${cohortQuery}`} asChild>
                      <Pressable accessibilityRole="link" style={({ pressed }) => [styles.moduleLink, { borderColor: theme.colors.divider, opacity: pressed ? 0.72 : 1 }]}>
                        <Text style={[styles.moduleAction, { color: theme.colors.neutral[700] }]}>{forum.cohortTitle ? `Cohorte · ${forum.cohortTitle}` : 'Foro general'}</Text>
                        <Text style={[styles.moduleAction, { color: theme.colors.accentAlt }]}>Abrir foro</Text>
                      </Pressable>
                    </Link>
                  );
                })}
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      {moduleId && isLoading ? (
        <LoadingState label="Cargando el foro…" />
      ) : moduleId && threads.length === 0 ? (
        <EmptyState
          glyph={MessagesSquare}
          title="Todavía no hay discusiones"
          // Inviting someone to ask a question two lines under "tu plan no te
          // deja publicar" is the screen arguing with itself.
          hint={
            canPost
              ? 'Sé el primero en preguntar. A alguien más le va a servir.'
              : 'Cuando alguien pregunte, vas a poder leer la conversación.'
          }
        />
      ) : moduleId ? (
        <Card style={styles.list}>
          {threads.map((thread, index) => (
            <ThreadRow key={thread.id} thread={thread} slug={courseSlug} moduleId={moduleId || undefined} cohortId={cohortId || undefined} cohortTitle={cohortTitle} isFirst={index === 0} />
          ))}
        </Card>
      ) : null}
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

function ThreadRow({
  thread,
  slug,
  moduleId,
  cohortId,
  cohortTitle,
  isFirst,
}: {
  thread: ThreadSummary;
  slug: string;
  moduleId?: string;
  cohortId?: string;
  cohortTitle: string;
  isFirst: boolean;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.row,
        isFirst ? undefined : { borderTopWidth: 1, borderTopColor: theme.colors.divider },
      ]}
    >
      <ThreadLink thread={thread} slug={slug} moduleId={moduleId} cohortId={cohortId} cohortTitle={cohortTitle} />
      {/* Outside the link on purpose: nested inside it, every tap on the
          moderation control would navigate to the thread instead. */}
      {thread.canModerate && !thread.isHidden ? (
        <ModerateControl slug={slug} kind="thread" id={thread.id} />
      ) : null}
    </View>
  );
}

function ThreadLink({ thread, slug, moduleId, cohortId, cohortTitle }: { thread: ThreadSummary; slug: string; moduleId?: string; cohortId?: string; cohortTitle: string }) {
  const theme = useTheme();
  const query = [moduleId ? `moduleId=${moduleId}` : '', cohortId ? `cohortId=${cohortId}` : '', cohortTitle ? `cohortTitle=${encodeURIComponent(cohortTitle)}` : '']
    .filter(Boolean)
    .join('&');

  return (
    <View style={styles.rowLink}>
      <Link href={`/catalog/${slug}/forum/${thread.id}${query ? `?${query}` : ''}`} asChild>
        <Pressable accessibilityRole="link">
          {({ pressed }) => (
            <Text style={[styles.rowTitle, { color: thread.isHidden ? theme.colors.neutral[600] : theme.colors.text, opacity: pressed ? 0.7 : 1 }]} numberOfLines={2}>
              {thread.isHidden ? '[Discusión retirada por moderación]' : thread.title}
            </Text>
          )}
        </Pressable>
      </Link>
      <View style={styles.facts}>
        <Link href={`/community/members/${thread.authorId}`} asChild>
          <Pressable accessibilityRole="link" accessibilityLabel={`Ver perfil de ${thread.authorName}`} style={styles.author}>
            <ProfileAvatar name={thread.authorName} avatarKey={thread.authorAvatarKey} avatarUrl={thread.authorAvatarUrl} size={24} />
            <Text style={[styles.authorName, { color: theme.colors.neutral[700] }]} numberOfLines={1}>{thread.authorName}</Text>
          </Pressable>
        </Link>
        <Fact glyph={MessageSquare} label={replyLabel(thread.replyCount)} />
        <Fact glyph={Clock} label={`última actividad ${timeAgo(thread.lastActivityAt)}`} />
      </View>
    </View>
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
  centered: { alignItems: 'center' },
  planNote: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10.2 },
  planNoteText: { flexGrow: 1, flexShrink: 1, flexBasis: 220, fontSize: 14, lineHeight: 21 },
  textarea: { minHeight: 110 },
  composerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10.2,
  },
  error: { fontSize: 14 },
  // The rows bring their own vertical padding, so the card adds none between.
  list: { gap: 0, paddingVertical: 6.8 },
  moduleList: { gap: 8 },
  moduleGroup: { gap: 7 },
  moduleLink: { minHeight: 48, borderWidth: 1, borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  moduleTitle: { flex: 1, fontSize: 15, fontWeight: '600' },
  moduleAction: { fontSize: 14, fontWeight: '600' },
  row: { gap: 6.8, paddingVertical: 13.6 },
  rowLink: { gap: 6.8 },
  rowTitle: { fontSize: 17, fontWeight: '600', lineHeight: 23 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 13.6, rowGap: 3.4 },
  author: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  authorName: { fontSize: 13, lineHeight: 20 },
});
