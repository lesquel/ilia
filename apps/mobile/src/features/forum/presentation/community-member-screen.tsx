import { Link, useLocalSearchParams } from 'expo-router';
import { MessagesSquare } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { ProfileAvatar } from '@/core/ui/profile-avatar';
import { EmptyState, ErrorState, LoadingState } from '@/core/ui/state-view';
import { Card, ScreenHeader } from '@/core/ui/surface';
import { useCommunityMember } from '@/features/forum/application/use-forum';
import { timeAgo } from '@/features/forum/domain/entities';

export function CommunityMemberScreen() {
  const theme = useTheme();
  const { memberId } = useLocalSearchParams<{ memberId: string }>();
  const { member, isLoading, error, refetch } = useCommunityMember(memberId ?? '');
  return (
    <ScrollView style={{ backgroundColor: theme.colors.bg }} contentContainerStyle={styles.content}>
      <ScreenHeader back={{ label: 'Volver a Comunidad', href: '/community' }} title="Perfil de participante" />
      {isLoading ? <LoadingState label="Cargando perfil…" /> : error ? <ErrorState error={error} onRetry={() => void refetch()} /> : member ? (
        <>
          <Card>
            <View style={styles.identity}>
              <ProfileAvatar name={member.fullName} avatarKey={member.avatarKey} avatarUrl={member.avatarUrl} size={72} />
              <View style={styles.identityCopy}>
                <Text accessibilityRole="header" style={[styles.name, { color: theme.colors.text }]}>{member.fullName}</Text>
                <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>Participación en los foros que tienes disponibles</Text>
              </View>
            </View>
          </Card>
          <Card title="Actividad reciente" hint="Discusiones y respuestas de los foros que tienes disponibles">
            {member.activity.length === 0 ? <EmptyState glyph={MessagesSquare} title="Todavía no hay actividad visible" hint="Cuando participe en un foro que compartes, sus publicaciones aparecerán aquí." /> : (
              <View style={styles.items}>
                {member.activity.map((item, index) => (
                  <Link key={`${item.kind}-${item.threadId}-${index}`} href={`/catalog/${item.courseSlug}/forum/${item.threadId}?moduleId=${item.moduleId}${item.cohortId ? `&cohortId=${item.cohortId}&cohortTitle=${encodeURIComponent(item.cohortTitle ?? '')}` : ''}`} asChild>
                    <Pressable accessibilityRole="link" style={[styles.activity, { borderTopColor: index ? theme.colors.divider : 'transparent' }]}>
                      <Text style={{ color: theme.colors.accentAlt, fontWeight: '600' }}>{item.kind === 'discussion' ? 'Abrió una discusión' : 'Respondió'} · </Text><Text style={{ color: theme.colors.text }}>{item.threadTitle}{'\n'}</Text><Text style={{ color: theme.colors.neutral[600] }}>{item.courseTitle}{item.moduleTitle ? ` · ${item.moduleTitle}` : ''} · {timeAgo(item.createdAt)}</Text>
                    </Pressable>
                  </Link>
                ))}
              </View>
            )}
          </Card>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 920, alignSelf: 'center', padding: 24, gap: 18 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 18, padding: 8 },
  identityCopy: { flex: 1, gap: 5 },
  name: { fontSize: 22, fontWeight: '700' },
  meta: { fontSize: 14 },
  items: { gap: 0 },
  activity: { paddingVertical: 13, borderTopWidth: 1 },
});
