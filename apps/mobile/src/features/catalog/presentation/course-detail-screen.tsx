import { Link, useLocalSearchParams, type Href } from 'expo-router';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Layers,
  UserRound,
  type LucideIcon,
} from 'lucide-react-native';
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

import { INSTITUTE_SHORT_NAME } from '@/core/brand';
import { breakpoint, useTheme } from '@/core/theme';
import { Icon } from '@/core/ui/icon';
import { MascotGuide } from '@/core/ui/mascot-guide';
import { ErrorState, LoadingState } from '@/core/ui/state-view';
import { useCourse } from '@/features/catalog/application/use-catalog';
import {
  currentItemIdInModule,
  formatDuration,
  nextOpenSyllabusItem,
  syllabusStationLabel,
  syllabusStationStatuses,
  type Module,
  type ModuleActivity,
  type SyllabusStationStatus,
} from '@/features/catalog/domain/entities';

/**
 * Institute card + a square timeline. Enrollment stays a slot so catalog
 * does not import enrollment.
 */
export interface CourseDetailScreenProps {
  enrollmentSlot?: ReactNode;
  footerSlot?: ReactNode;
  completedLessonIds?: string[];
  passedActivityIds?: string[];
  isEnrolled?: boolean;
  nextItemTitle?: string;
  nextItemHref?: string;
  completedLessonCount?: number;
  onLessonPress?: (lessonId: string) => void;
}

export function CourseDetailScreen({
  enrollmentSlot,
  footerSlot,
  completedLessonIds = [],
  passedActivityIds = [],
  isEnrolled = false,
  nextItemTitle,
  nextItemHref,
  completedLessonCount = 0,
  onLessonPress,
}: CourseDetailScreenProps) {
  const theme = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { width } = useWindowDimensions();
  const isWide = width >= breakpoint.compact;

  const { course, isLoading, error, refetch } = useCourse(slug ?? '');

  if (isLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        <LoadingState label="Cargando el curso…" />
      </View>
    );
  }

  if (error || !course) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        <ErrorState error={error} onRetry={() => void refetch()} />
      </View>
    );
  }

  const stationStatuses = syllabusStationStatuses(
    course.modules,
    completedLessonIds,
    passedActivityIds,
    isEnrolled,
  );
  const openItem = isEnrolled
    ? nextOpenSyllabusItem(course.modules, completedLessonIds, passedActivityIds)
    : undefined;
  const followHref =
    openItem?.kind === 'activity'
      ? `/lab/${openItem.id}`
      : openItem
        ? `/catalog/${course.slug}/lessons/${openItem.id}`
        : nextItemHref;
  const followTitle = openItem?.title ?? nextItemTitle;
  const isCourseFinished =
    isEnrolled && course.modules.length > 0 && stationStatuses.every((status) => status === 'done');
  const badgeLabel = isCourseFinished
    ? 'Terminado'
    : isEnrolled && openItem?.kind === 'activity'
      ? 'En curso · falta la práctica'
      : isEnrolled
        ? `En curso · ${completedLessonCount} de ${course.lessonCount}`
        : 'Empieza aquí';
  const lede = isCourseFinished
    ? 'Terminaste este curso.'
    : isEnrolled && followTitle
      ? `Sigue: ${followTitle}.`
      : 'Para que el lunes tengas la hoja, no otra tarde armándola.';
  const mascotLine = isEnrolled && followTitle ? `Sigue: ${followTitle}.` : 'Cuando quieras, empezamos.';
  const activityCount = course.modules.reduce((total, module) => total + module.activities.length, 0);

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.content}
    >
      {/* Native already has the stack's back button; the browser has no way
          back to the catalog short of the address bar. */}
      {Platform.OS === 'web' ? (
        <Link href="/catalog" asChild>
          <Pressable accessibilityRole="link" style={styles.backLink}>
            <Icon glyph={ArrowLeft} size={16} color={theme.colors.neutral[600]} />
            <Text style={[styles.backLabel, { color: theme.colors.neutral[600] }]}>
              Explorar cursos
            </Text>
          </Pressable>
        </Link>
      ) : null}

      <View style={[styles.split, isWide ? styles.splitWide : undefined]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.divider,
              borderRadius: theme.radius.lg,
            },
            Platform.OS === 'web'
              ? ({ boxShadow: '0 10px 28px rgba(17, 17, 17, 0.06)' } as unknown as ViewStyle)
              : undefined,
            isWide ? styles.cardWide : undefined,
            isWide && Platform.OS === 'web'
              ? ({ position: 'sticky', top: 16 } as unknown as ViewStyle)
              : undefined,
          ]}
        >
          <View
            style={[
              styles.stage,
              { backgroundColor: theme.colors.accentRamp[100], borderRadius: theme.radius.md },
            ]}
          >
            <View style={styles.kickerRow}>
              <View style={[styles.signalSquare, { backgroundColor: theme.colors.accent }]} />
              <Text style={[styles.kicker, { color: theme.colors.accentAlt }]}>
                Instituto {INSTITUTE_SHORT_NAME}
              </Text>
            </View>
            <View style={styles.stageMascot}>
              <MascotGuide
                line={mascotLine}
                lineKey={`course-card-${course.slug}`}
                holdMood="write"
                size={148}
              />
            </View>
          </View>
          <View
            style={[
              styles.badge,
              { backgroundColor: theme.colors.accentRamp[100], borderRadius: theme.radius.sm },
            ]}
          >
            <Text style={[styles.badgeText, { color: theme.colors.accentRamp[800] }]}>{badgeLabel}</Text>
          </View>
          <Text style={[styles.title, { color: theme.colors.text }]} accessibilityRole="header">{course.title}</Text>
          <Text style={[styles.lede, { color: theme.colors.neutral[700] }]}>{lede}</Text>
          <View style={styles.facts}>
            <Fact
              glyph={BookOpen}
              label={`${course.lessonCount} ${course.lessonCount === 1 ? 'lección' : 'lecciones'}`}
            />
            <Fact glyph={Clock} label={formatDuration(course.durationSeconds)} />
            {course.modules.length > 0 ? (
              <Fact
                glyph={Layers}
                label={`${course.modules.length} ${course.modules.length === 1 ? 'capítulo' : 'capítulos'}`}
              />
            ) : null}
            {course.instructorName.trim() ? (
              <Fact glyph={UserRound} label={`Docente: ${course.instructorName}`} />
            ) : null}
          </View>
          {!isEnrolled ? (
            enrollmentSlot
          ) : followHref ? (
            <Link href={followHref as Href} asChild>
              <Pressable accessibilityRole="link">
                {({ pressed }) => (
                  <View
                    style={[
                      styles.followButton,
                      {
                        backgroundColor: theme.colors.accentButton,
                        borderRadius: theme.radius.md,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Text style={styles.followLabel}>Seguir</Text>
                  </View>
                )}
              </Pressable>
            </Link>
          ) : null}
        </View>

        <View style={styles.timeline}>
          <View style={styles.timelineHead}>
            <Text style={[styles.timelineTitle, { color: theme.colors.text }]}>Temario</Text>
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
            <View style={styles.rail}>
              <View style={[styles.spine, { backgroundColor: theme.colors.accentRamp[200] }]} />
              {course.modules.map((module, moduleIndex) => (
                <SyllabusStation
                  key={module.id}
                  module={module}
                  status={stationStatuses[moduleIndex] ?? 'wait'}
                  isEnrolled={isEnrolled}
                  completedLessonIds={completedLessonIds}
                  passedActivityIds={passedActivityIds}
                  onLessonPress={onLessonPress}
                />
              ))}
            </View>
          )}
          {footerSlot}
        </View>
      </View>
    </ScrollView>
  );
}

function Fact({ glyph, label }: { glyph: LucideIcon; label: string }) {
  const theme = useTheme();

  return (
    <View style={styles.fact}>
      <Icon glyph={glyph} size={14} color={theme.colors.neutral[600]} />
      <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>{label}</Text>
    </View>
  );
}

function SyllabusStation({
  module,
  status,
  isEnrolled,
  completedLessonIds,
  passedActivityIds,
  onLessonPress,
}: {
  module: Module;
  status: SyllabusStationStatus;
  isEnrolled: boolean;
  completedLessonIds: string[];
  passedActivityIds: string[];
  onLessonPress?: (lessonId: string) => void;
}) {
  const theme = useTheme();
  const label = syllabusStationLabel(status, isEnrolled);
  const currentItemId =
    status === 'now' && isEnrolled
      ? currentItemIdInModule(module, completedLessonIds, passedActivityIds)
      : undefined;
  const isHere = status === 'now' && isEnrolled;
  const rowCount = module.lessons.length + module.activities.length;

  return (
    <View
      style={[
        styles.station,
        {
          backgroundColor: isHere ? theme.colors.accentRamp[100] : theme.colors.surface,
          borderColor: isHere ? theme.colors.accentRamp[200] : theme.colors.divider,
          borderRadius: theme.radius.md,
        },
        status === 'done' ? { opacity: 0.55 } : undefined,
      ]}
    >
      <View
        style={[
          styles.node,
          {
            backgroundColor: status === 'wait' ? theme.colors.surface : theme.colors.accent,
            borderColor: status === 'wait' ? theme.colors.neutral[300] : theme.colors.accent,
          },
        ]}
      />
      <View style={styles.stationHead}>
        <Text
          style={[
            styles.stationTitle,
            { color: status === 'done' ? theme.colors.neutral[600] : theme.colors.text },
          ]}
        >
          {module.position} · {module.title}
        </Text>
        {label ? (
          <View
            style={[
              styles.here,
              {
                backgroundColor: status === 'now' ? theme.colors.accentButton : theme.colors.neutral[200],
              },
            ]}
          >
            <Text
              style={[
                styles.hereLabel,
                { color: status === 'now' ? '#ffffff' : theme.colors.neutral[700] },
              ]}
            >
              {label}
            </Text>
          </View>
        ) : null}
      </View>

      {module.lessons.map((lesson, lessonIndex) => {
        const isDone = completedLessonIds.includes(lesson.id);
        const isCurrent = lesson.id === currentItemId;
        return (
          <SyllabusRow
            key={lesson.id}
            indexLabel={String(lessonIndex + 1).padStart(2, '0')}
            title={lesson.title}
            trailing={formatDuration(lesson.durationSeconds)}
            isDone={isDone}
            isCurrent={isCurrent}
            isLast={lessonIndex === rowCount - 1}
            accessibilityLabel={`${lesson.title}, ${isDone ? 'completada' : 'pendiente'}`}
            onPress={onLessonPress ? () => onLessonPress(lesson.id) : undefined}
          />
        );
      })}

      {module.activities.map((activity: ModuleActivity, activityIndex) => {
        const isPassed = passedActivityIds.includes(activity.id);
        const isCurrent = activity.id === currentItemId;
        const row = (
          <SyllabusRow
            indexLabel={String(module.lessons.length + activityIndex + 1).padStart(2, '0')}
            title={activity.title}
            trailing={isPassed ? 'Hecha' : 'práctica'}
            isDone={isPassed}
            isCurrent={isCurrent}
            isLast={module.lessons.length + activityIndex === rowCount - 1}
            isPractice
            accessibilityLabel={`Actividad: ${activity.title}, ${isPassed ? 'aprobada' : 'pendiente'}`}
          />
        );
        if (!onLessonPress) {
          return <View key={activity.id}>{row}</View>;
        }
        return (
          <Link key={activity.id} href={`/lab/${activity.id}`} asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Actividad: ${activity.title}, ${isPassed ? 'aprobada' : 'pendiente'}`}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              {row}
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}

function SyllabusRow({
  indexLabel,
  title,
  trailing,
  isDone,
  isCurrent,
  isLast,
  isPractice = false,
  accessibilityLabel,
  onPress,
}: {
  indexLabel: string;
  title: string;
  trailing: string;
  isDone: boolean;
  isCurrent: boolean;
  isLast: boolean;
  isPractice?: boolean;
  accessibilityLabel: string;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const row = (
    <View
      style={[
        styles.row,
        { borderBottomColor: isCurrent || isLast ? 'transparent' : theme.colors.divider },
        isCurrent
          ? {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.sm,
              paddingHorizontal: 8,
              marginHorizontal: -8,
            }
          : undefined,
      ]}
    >
      <View
        style={[
          styles.rowMark,
          {
            backgroundColor: isDone || isCurrent ? theme.colors.accent : theme.colors.surface,
            borderColor: isDone || isCurrent ? theme.colors.accent : theme.colors.neutral[400],
          },
        ]}
      />
      <Text
        style={[
          styles.rowIndex,
          { color: isCurrent ? theme.colors.accentAlt : theme.colors.neutral[500] },
        ]}
      >
        {indexLabel}
      </Text>
      <Text
        style={[
          styles.rowTitle,
          {
            color: isDone && !isCurrent ? theme.colors.neutral[500] : theme.colors.text,
            fontWeight: isCurrent ? '700' : '400',
          },
        ]}
        numberOfLines={2}
      >
        {title}
      </Text>
      {isPractice && !isCurrent && !isDone ? (
        // The practice is what the course is for; it should not read like a
        // duration.
        <View style={[styles.practiceTag, { backgroundColor: theme.colors.accentRamp[100] }]}>
          <Text style={[styles.practiceLabel, { color: theme.colors.accentRamp[700] }]}>
            {trailing}
          </Text>
        </View>
      ) : (
        <Text
          style={[
            styles.rowTrailing,
            { color: isCurrent ? theme.colors.accentAlt : theme.colors.neutral[500] },
          ]}
        >
          {isCurrent ? 'Aquí' : isDone ? 'Hecha' : trailing}
        </Text>
      )}
    </View>
  );

  if (!onPress) {
    return row;
  }

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {row}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 20.4,
    maxWidth: 1080,
    width: '100%',
    alignSelf: 'center',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 6,
    marginBottom: 10,
  },
  backLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  split: {
    gap: 28,
  },
  splitWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 36,
  },
  card: {
    borderWidth: 1,
    padding: 22,
    gap: 10,
  },
  cardWide: {
    width: 320,
    flexShrink: 0,
  },
  stage: {
    paddingTop: 14,
    paddingHorizontal: 14,
    marginBottom: 6,
    overflow: 'hidden',
  },
  stageMascot: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 10,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  facts: {
    gap: 8,
    marginTop: 4,
  },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signalSquare: {
    width: 8,
    height: 8,
  },
  kicker: {
    fontSize: 13,
    fontWeight: '600',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: -0.8,
  },
  lede: {
    fontSize: 16,
    lineHeight: 24,
  },
  meta: {
    fontSize: 13,
  },
  followButton: {
    alignSelf: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 22,
    minHeight: 48,
    justifyContent: 'center',
  },
  followLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  timeline: {
    flex: 1,
    minWidth: 0,
    paddingTop: 4,
  },
  timelineHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  timelineTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  rail: {
    position: 'relative',
    paddingLeft: 28,
  },
  spine: {
    position: 'absolute',
    left: 5,
    top: 26,
    bottom: 26,
    width: 2,
  },
  station: {
    position: 'relative',
    marginBottom: 16,
    borderWidth: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  node: {
    position: 'absolute',
    // One pixel further out than the rail's padding: the station's own border.
    left: -29,
    top: 20,
    width: 12,
    height: 12,
    borderWidth: 2,
  },
  stationHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  stationTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  here: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  hereLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  practiceTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  practiceLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  rowMark: {
    width: 10,
    height: 10,
    borderWidth: 2,
    flexShrink: 0,
  },
  rowIndex: {
    width: 22,
    fontSize: 12,
    fontWeight: '700',
  },
  rowTitle: {
    flex: 1,
    fontSize: 14,
  },
  rowTrailing: {
    fontSize: 12,
  },
});
