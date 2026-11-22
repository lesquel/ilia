import { Link, useLocalSearchParams, type Href } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';

import { breakpoint, useTheme } from '@/core/theme';
import { Icon } from '@/core/ui/icon';
import { ErrorState } from '@/core/ui/state-view';
import { useCourse, useCourses } from '@/features/catalog/application/use-catalog';
import {
  LEVEL_LABELS,
  LESSON_KIND_LABELS,
  formatDuration,
  startingCourseId,
  syllabusStationLabel,
  syllabusStationStatuses,
  type LessonKind,
  type SyllabusStationStatus,
} from '@/features/catalog/domain/entities';
import {
  continueLabel,
  courseAdvance,
  dominantLessonKind,
  syllabusRows,
  type SyllabusRow,
} from '@/features/catalog/domain/syllabus-rows';
import { CourseCoverArt } from '@/features/catalog/presentation/course-cover-art';
import { CourseDetailScreenSkeleton } from '@/features/catalog/presentation/course-detail-screen-skeleton';
import type { CourseAccent } from '@/features/catalog/presentation/course-tone';
import { useCourseAccent } from '@/features/catalog/presentation/use-course-accent';

/**
 * Hero band in the course's color, an overlapping progress card, the syllabus
 * and side cards. Enrollment and the certificate stay slots so catalog does
 * not import those features.
 */
export interface CourseDetailScreenProps {
  /** Shown in the progress card while the teacher is not enrolled. */
  enrollmentSlot?: ReactNode;
  /** Side column, under the forum card (the certificate panel). */
  sideSlot?: ReactNode;
  /** The course forum, for an enrolled teacher. */
  forumHref?: string;
  completedLessonIds?: string[];
  passedActivityIds?: string[];
  isEnrolled?: boolean;
  onLessonPress?: (lessonId: string) => void;
}

/** The hero's second chip: what most lessons are. */
const KIND_PHRASES: Record<LessonKind, string> = {
  video: 'Lecciones en vídeo',
  slides: 'Lecciones con presentación',
  text: 'Lecciones de lectura',
  quiz: 'Lecciones de comprobación',
};

export function CourseDetailScreen({
  enrollmentSlot,
  sideSlot,
  forumHref,
  completedLessonIds = [],
  passedActivityIds = [],
  isEnrolled = false,
  onLessonPress,
}: CourseDetailScreenProps) {
  const theme = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { width } = useWindowDimensions();
  const isWide = width >= breakpoint.medium;
  const isPhone = width < breakpoint.compact;
  const accent = useCourseAccent(slug);

  const { course, isLoading, error, refetch } = useCourse(slug ?? '');
  // Only the first course of the route is the door; the others say their level.
  const { courses: catalog } = useCourses();

  if (isLoading) {
    return <CourseDetailScreenSkeleton />;
  }

  if (error || !course) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        <ErrorState error={error} onRetry={() => void refetch()} />
      </View>
    );
  }

  const groups = syllabusRows(course.modules, completedLessonIds, passedActivityIds, isEnrolled);
  const stationStatuses = syllabusStationStatuses(
    course.modules,
    completedLessonIds,
    passedActivityIds,
    isEnrolled,
  );
  const advance = courseAdvance(course.modules, completedLessonIds, passedActivityIds, isEnrolled);
  const buttonLabel = continueLabel(advance);
  const followHref = advance.next
    ? advance.next.kind === 'activity'
      ? `/lab/${advance.next.id}`
      : `/catalog/${course.slug}/lessons/${advance.next.id}`
    : undefined;
  const isCourseFinished =
    isEnrolled && course.modules.length > 0 && stationStatuses.every((status) => status === 'done');
  const activityCount = course.modules.reduce((total, module) => total + module.activities.length, 0);
  const kind = dominantLessonKind(course.modules);
  const statusChip = isCourseFinished
    ? 'Terminado'
    : !isEnrolled && course.id === startingCourseId(catalog)
      ? 'Empieza aquí'
      : undefined;

  const facts = [
    `${course.lessonCount} ${course.lessonCount === 1 ? 'lección' : 'lecciones'}`,
    formatDuration(course.durationSeconds),
    activityCount > 0
      ? `${activityCount} ${activityCount === 1 ? 'taller práctico' : 'talleres prácticos'}`
      : undefined,
    course.instructorName.trim() ? `Docente: ${course.instructorName}` : undefined,
  ].filter(Boolean);

  const gutter = isPhone ? 16 : 40;
  const singleModule = course.modules.length === 1 ? course.modules[0] : undefined;

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.hero, { backgroundColor: accent.ink }]}>
        <View style={styles.heroShade} />
        <View
          style={[
            styles.heroInner,
            {
              paddingHorizontal: gutter,
              paddingTop: isPhone ? 20 : 32,
              paddingBottom: isPhone ? 60 : 76,
            },
          ]}
        >
          <View style={styles.heroText}>
            {/* Native already has the stack's back button; the browser has no
                way back to the catalog short of the address bar. */}
            {Platform.OS === 'web' ? (
              <Link href="/catalog" asChild>
                <Pressable accessibilityRole="link" style={styles.backLink}>
                  <Icon glyph={ArrowLeft} size={16} color={HERO_SOFT} />
                  <Text style={[styles.backLabel, { color: HERO_SOFT }]}>Explorar cursos</Text>
                </Pressable>
              </Link>
            ) : null}
            <View style={styles.heroChips}>
              <HeroChip label={LEVEL_LABELS[course.level]} />
              {kind ? <HeroChip label={KIND_PHRASES[kind]} /> : null}
              {statusChip ? <HeroChip label={statusChip} strong /> : null}
            </View>
            <Text
              style={[
                styles.heroTitle,
                isPhone ? styles.heroTitlePhone : undefined,
                { fontFamily: theme.typography.display.family },
              ]}
              accessibilityRole="header"
            >
              {course.title}
            </Text>
            {course.summary.trim() ? (
              <Text style={styles.heroLede}>{course.summary}</Text>
            ) : null}
            <Text style={styles.heroFacts}>{facts.join(' · ')}</Text>
          </View>
          {isWide ? (
            // The same cover as the course's card, so the teacher recognizes
            // where they landed.
            <View style={[styles.heroCover, { borderRadius: theme.radius.lg }]}>
              <CourseCoverArt courseSlug={course.slug} />
            </View>
          ) : null}
        </View>
      </View>

      <View
        style={[
          styles.body,
          { paddingHorizontal: gutter },
          isWide ? styles.bodyWide : undefined,
        ]}
      >
        <View style={styles.main}>
          <View
            style={[
              styles.progressCard,
              isPhone ? undefined : styles.progressCardRow,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.divider,
                borderRadius: theme.radius.lg,
              },
              Platform.OS === 'web'
                ? ({ boxShadow: '0 10px 30px rgba(17, 19, 24, 0.06)' } as unknown as ViewStyle)
                : styles.progressCardNative,
            ]}
          >
            {isEnrolled ? (
              <>
                <View style={styles.advance}>
                  <View style={styles.advanceHead}>
                    <Text style={[styles.advanceLabel, { color: theme.colors.ink }]}>
                      Tu avance · {advance.done} de {advance.total}{' '}
                      {advance.total === 1 ? 'lección' : 'lecciones'}
                    </Text>
                    <Text style={[styles.advanceLabel, { color: accent.ink }]}>
                      {advance.percentage} %
                    </Text>
                  </View>
                  <View
                    accessibilityRole="progressbar"
                    accessibilityValue={{ min: 0, max: 100, now: advance.percentage }}
                    style={[styles.track, { backgroundColor: theme.colors.neutral[200] }]}
                  >
                    <View
                      style={[
                        styles.fill,
                        { width: `${advance.percentage}%`, backgroundColor: accent.ink },
                      ]}
                    />
                  </View>
                  {isCourseFinished ? (
                    <Text style={[styles.advanceNote, { color: theme.colors.success }]}>
                      Terminaste este curso.
                    </Text>
                  ) : advance.next ? (
                    <Text
                      style={[styles.advanceNote, { color: theme.colors.neutral[600] }]}
                      numberOfLines={1}
                    >
                      Sigue: {advance.next.title}
                    </Text>
                  ) : null}
                </View>
                {buttonLabel && followHref ? (
                  <Link href={followHref as Href} asChild>
                    <Pressable accessibilityRole="link" accessibilityLabel={buttonLabel}>
                      {({ pressed }) => (
                        <View
                          style={[
                            styles.followButton,
                            {
                              backgroundColor: accent.ink,
                              borderRadius: theme.radius.md,
                              opacity: pressed ? 0.85 : 1,
                            },
                          ]}
                        >
                          <Text style={styles.followLabel}>{buttonLabel}</Text>
                        </View>
                      )}
                    </Pressable>
                  </Link>
                ) : null}
              </>
            ) : (
              <View style={styles.enrol}>{enrollmentSlot}</View>
            )}
          </View>

          <View style={styles.syllabusHead}>
            <Text
              style={[
                styles.syllabusTitle,
                { color: theme.colors.ink, fontFamily: theme.typography.displayBold.family },
              ]}
              accessibilityRole="header"
            >
              {singleModule ? `Temario · ${singleModule.title}` : 'Temario'}
            </Text>
            {course.modules.length > 0 ? (
              <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>
                {course.lessonCount} {course.lessonCount === 1 ? 'lección' : 'lecciones'}
                {activityCount > 0
                  ? ` · ${activityCount} ${activityCount === 1 ? 'práctica' : 'prácticas'}`
                  : ''}
              </Text>
            ) : null}
          </View>

          {course.modules.length === 0 ? (
            <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>
              El temario de este curso todavía se está armando.
            </Text>
          ) : (
            groups.map((group, groupIndex) => (
              <View key={group.module.id} style={styles.group}>
                {singleModule ? null : (
                  <ModuleHeading
                    title={`${group.module.position} · ${group.module.title}`}
                    status={stationStatuses[groupIndex] ?? 'wait'}
                    isEnrolled={isEnrolled}
                    accent={accent}
                  />
                )}
                {group.rows.map((row) => (
                  <SyllabusRowView
                    key={row.id}
                    row={row}
                    accent={accent}
                    onPress={
                      onLessonPress && row.kind === 'lesson'
                        ? () => onLessonPress(row.id)
                        : undefined
                    }
                    labHref={onLessonPress && row.kind === 'activity' ? `/lab/${row.id}` : undefined}
                  />
                ))}
              </View>
            ))
          )}
        </View>

        <View style={[styles.side, isWide ? styles.sideWide : undefined]}>
          {forumHref ? (
            <View
              style={[
                styles.sideCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.divider,
                  borderRadius: theme.radius.lg,
                },
              ]}
            >
              <Text style={[styles.sideTitle, { color: theme.colors.ink }]} accessibilityRole="header">
                Foro del curso
              </Text>
              <Text style={[styles.sideText, { color: theme.colors.neutral[700] }]}>
                Comparte tu trabajo y mira cómo lo resolvieron otros docentes.
              </Text>
              <Link href={forumHref as Href} style={[styles.sideLink, { color: accent.ink }]}>
                Abrir el foro →
              </Link>
            </View>
          ) : null}
          {sideSlot}
        </View>
      </View>
    </ScrollView>
  );
}

const HERO_SOFT = 'rgba(255, 255, 255, 0.92)';

function HeroChip({ label, strong = false }: { label: string; strong?: boolean }) {
  return (
    <View
      style={[
        styles.heroChip,
        { backgroundColor: strong ? '#ffffff' : 'rgba(255, 255, 255, 0.2)' },
      ]}
    >
      <Text style={[styles.heroChipLabel, strong ? { color: '#111318' } : undefined]}>
        {label}
      </Text>
    </View>
  );
}

function ModuleHeading({
  title,
  status,
  isEnrolled,
  accent,
}: {
  title: string;
  status: SyllabusStationStatus;
  isEnrolled: boolean;
  accent: CourseAccent;
}) {
  const theme = useTheme();
  const label = syllabusStationLabel(status, isEnrolled);

  return (
    <View style={styles.moduleHead}>
      <Text style={[styles.moduleTitle, { color: theme.colors.ink }]}>{title}</Text>
      {label ? (
        <View
          style={[
            styles.moduleTag,
            { backgroundColor: status === 'now' ? accent.ink : theme.colors.neutral[200] },
          ]}
        >
          <Text
            style={[
              styles.moduleTagLabel,
              { color: status === 'now' ? '#ffffff' : theme.colors.neutral[700] },
            ]}
          >
            {label}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function rowMeta(row: SyllabusRow): string {
  if (row.kind === 'activity') {
    if (row.state === 'done') return 'Aprobada';
    if (row.state === 'current') return 'Sigues aquí';
    return 'Práctica';
  }
  if (row.state === 'done') return 'Hecha';
  if (row.state === 'current') return 'Sigues aquí';
  const duration = formatDuration(row.durationSeconds ?? 0);
  return row.lessonKind ? `${LESSON_KIND_LABELS[row.lessonKind]} · ${duration}` : duration;
}

function SyllabusRowView({
  row,
  accent,
  onPress,
  labHref,
}: {
  row: SyllabusRow;
  accent: CourseAccent;
  onPress?: () => void;
  labHref?: string;
}) {
  const theme = useTheme();
  const isDone = row.state === 'done';
  const isCurrent = row.state === 'current';
  const mark = isDone ? '✓' : row.kind === 'activity' ? '★' : String(row.number ?? '');
  const accessibilityLabel =
    row.kind === 'activity'
      ? `Actividad: ${row.title}, ${isDone ? 'aprobada' : 'pendiente'}`
      : `${row.title}, ${isDone ? 'completada' : isCurrent ? 'sigues aquí' : 'pendiente'}`;

  const content = (
    <View
      style={[
        styles.row,
        {
          backgroundColor: isCurrent ? accent.wash : theme.colors.surface,
          borderColor: isCurrent ? accent.ink : theme.colors.divider,
        },
      ]}
    >
      <View
        style={[
          styles.dot,
          {
            backgroundColor: isDone
              ? accent.ink
              : isCurrent
                ? theme.colors.surface
                : theme.colors.neutral[100],
            borderColor: isCurrent ? accent.ink : 'transparent',
          },
        ]}
      >
        <Text
          style={[
            styles.dotLabel,
            {
              color: isDone ? '#ffffff' : isCurrent ? accent.ink : theme.colors.neutral[600],
            },
          ]}
        >
          {mark}
        </Text>
      </View>
      <Text
        style={[
          styles.rowTitle,
          { color: theme.colors.ink, fontWeight: isCurrent ? '700' : '500' },
        ]}
        numberOfLines={2}
      >
        {row.kind === 'activity' ? `Taller · ${row.title}` : row.title}
      </Text>
      <Text
        style={[
          styles.rowMeta,
          { color: isCurrent ? accent.ink : theme.colors.neutral[600] },
          isCurrent ? styles.rowMetaCurrent : undefined,
        ]}
      >
        {rowMeta(row)}
      </Text>
    </View>
  );

  if (labHref) {
    return (
      <Link href={labHref as Href} asChild>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={accessibilityLabel}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          {content}
        </Pressable>
      </Link>
    );
  }

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View accessible accessibilityLabel={accessibilityLabel}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  hero: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  heroShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 70,
    backgroundColor: 'rgba(0, 0, 0, 0.14)',
  },
  heroInner: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 32,
  },
  heroText: {
    flex: 1,
    minWidth: 0,
    gap: 14,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 4,
  },
  backLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  heroChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  heroChipLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 52,
    lineHeight: 54,
    letterSpacing: -1,
  },
  heroTitlePhone: {
    fontSize: 34,
    lineHeight: 37,
    letterSpacing: -0.6,
  },
  heroLede: {
    maxWidth: 560,
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 17,
    lineHeight: 25,
  },
  heroFacts: {
    color: HERO_SOFT,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
  },
  heroCover: {
    width: 340,
    flexShrink: 0,
    overflow: 'hidden',
    marginBottom: -20,
  },
  body: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    gap: 24,
  },
  bodyWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 32,
  },
  main: {
    flex: 1,
    minWidth: 0,
    marginTop: -36,
    gap: 8,
  },
  progressCard: {
    borderWidth: 1,
    paddingVertical: 22,
    paddingHorizontal: 24,
    gap: 16,
    marginBottom: 4,
  },
  progressCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  progressCardNative: {
    shadowColor: '#111318',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  advance: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  advanceHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  advanceLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  advanceNote: {
    fontSize: 13,
  },
  track: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  followButton: {
    minHeight: 48,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  enrol: {
    flex: 1,
    minWidth: 0,
  },
  syllabusHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    marginBottom: 4,
  },
  syllabusTitle: {
    flexShrink: 1,
    fontSize: 22,
    lineHeight: 27,
  },
  meta: {
    fontSize: 13,
  },
  group: {
    gap: 8,
    marginBottom: 8,
  },
  moduleHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  moduleTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  moduleTag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  moduleTagLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  dot: {
    width: 30,
    height: 30,
    flexShrink: 0,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  rowTitle: {
    flex: 1,
    fontSize: 15,
  },
  rowMeta: {
    fontSize: 13,
  },
  rowMetaCurrent: {
    fontWeight: '700',
  },
  side: {
    gap: 16,
  },
  sideWide: {
    width: 360,
    flexShrink: 0,
    paddingTop: 28,
  },
  sideCard: {
    borderWidth: 1,
    padding: 22,
    gap: 12,
  },
  sideTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sideText: {
    fontSize: 14,
    lineHeight: 21,
  },
  sideLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});
