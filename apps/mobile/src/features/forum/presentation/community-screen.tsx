import { useRouter } from 'expo-router';
import { BookOpen, MessagesSquare } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon } from '@/core/ui/icon';
import { EmptyState, ErrorState, LoadingState } from '@/core/ui/state-view';
import { Card, ScreenHeader } from '@/core/ui/surface';
import { useSession } from '@/features/auth';
import { useCommunity } from '@/features/forum/application/use-forum';

export function CommunityScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useSession();
  const { courses, isLoading, error, refetch } = useCommunity();
  return (
    <ScrollView style={{ backgroundColor: theme.colors.bg }} contentContainerStyle={styles.content}>
      <ScreenHeader title="Comunidad" subtitle="Continúa las conversaciones de los cursos en los que participas." />
      {user ? (
        <Pressable accessibilityRole="link" onPress={() => router.push(`/community/members/${user.id}`)} style={[styles.profileLink, { borderColor: theme.colors.divider }]}>
          <Icon glyph={BookOpen} size={18} color={theme.colors.accent} />
          <Text style={[styles.profileText, { color: theme.colors.accentAlt }]}>Ver mi actividad en foros</Text>
        </Pressable>
      ) : null}
      {isLoading ? <LoadingState label="Buscando tus foros…" /> : error ? <ErrorState error={error} onRetry={() => void refetch()} /> : courses.length === 0 ? (
        <EmptyState glyph={MessagesSquare} title="Aún no tienes foros disponibles" hint="Cuando te inscribas en un curso, su foro aparecerá aquí." action={{ label: 'Explorar cursos', href: '/catalog' }} />
      ) : (
        <Card title="Foros de tus cursos" hint={`${courses.length} ${courses.length === 1 ? 'curso' : 'cursos'}`}>
          <View style={styles.list}>
            {courses.map((course) => (
              <View key={course.slug} style={[styles.course, { borderColor: theme.colors.divider }]}>
                <View style={styles.courseHeading}>
                  <View style={styles.icon}><Icon glyph={MessagesSquare} size={20} color={theme.colors.accent} /></View>
                  <View style={styles.copy}>
                    <Text style={[styles.title, { color: theme.colors.text }]}>{course.title}</Text>
                    {course.summary ? <Text style={[styles.summary, { color: theme.colors.neutral[600] }]} numberOfLines={2}>{course.summary}</Text> : null}
                  </View>
                </View>
                <View style={styles.modules}>
                  {course.modules.length ? course.modules.map((module) => (
                    <View key={module.id} style={styles.moduleGroup}>
                      <Text style={[styles.moduleTitle, { color: theme.colors.text }]}>{module.title}</Text>
                      {module.forums.map((forum) => {
                        const cohortQuery = forum.cohortId
                          ? `&cohortId=${forum.cohortId}&cohortTitle=${encodeURIComponent(forum.cohortTitle ?? '')}`
                          : '';
                        return (
                          <Pressable key={`${module.id}-${forum.cohortId ?? 'general'}`} accessibilityRole="link" onPress={() => router.push(`/catalog/${course.slug}/forum?moduleId=${module.id}${cohortQuery}`)} style={({ pressed }) => [styles.module, { borderColor: theme.colors.divider, opacity: pressed ? 0.72 : 1 }]}>
                            <Text style={[styles.moduleLabel, { color: theme.colors.neutral[700] }]}>{forum.cohortTitle ? `Cohorte · ${forum.cohortTitle}` : 'Foro general'}</Text>
                            <Text style={[styles.link, { color: theme.colors.accentAlt }]}>Abrir foro</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )) : <Text style={[styles.summary, { color: theme.colors.neutral[600] }]}>Este curso todavía no tiene módulos publicados.</Text>}
                </View>
              </View>
            ))}
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 920, alignSelf: 'center', padding: 24, gap: 18 },
  profileLink: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderWidth: 1, borderRadius: 12, alignSelf: 'flex-start' },
  profileText: { fontSize: 14, fontWeight: '600' },
  list: { gap: 10 },
  course: { gap: 12, padding: 16, borderWidth: 1, borderRadius: 12 },
  courseHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  modules: { flex: 1, gap: 12, marginLeft: 52 },
  moduleGroup: { gap: 7 },
  module: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  moduleTitle: { flex: 1, fontSize: 14, fontWeight: '600' },
  moduleLabel: { flex: 1, fontSize: 14 },
  icon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 5 },
  title: { fontSize: 17, fontWeight: '700' },
  summary: { fontSize: 14, lineHeight: 21 },
  link: { fontSize: 14, fontWeight: '600', paddingTop: 3 },
});
