import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { useCourseAccent } from '@/features/catalog';
import {
  averageScore,
  biggestDrop,
  dropSentence,
  lessonReach,
  reviewQueue,
  scoreTone,
} from '@/features/instructor/domain/dashboard';
import {
  STATUS_LABELS,
  type AuthoredCourse,
  type CourseInsights,
  type ReviewItem,
} from '@/features/instructor/domain/entities';
import { Card, KpiTile, cardLift } from '@/features/instructor/presentation/ui';

/** Above this many lessons the columns are too narrow for a label under each. */
const LABELLED_COLUMNS = 14;
const CHART_HEIGHT = 150;
export const QUEUE_LENGTH = 4;

/**
 * The four headline figures.
 *
 * Enrolment and completion come from the chosen course's insights; the mark
 * and the submissions come from the review inbox of that same course.
 */
export function KpiRow({
  insights,
  items,
  total,
}: {
  insights: CourseInsights | null;
  items: ReviewItem[];
  total: number;
}) {
  const average = averageScore(items);
  const open = reviewQueue(items, items.length).length;

  return (
    <View style={styles.kpis}>
      {insights ? (
        <>
          <KpiTile
            label="Inscritos"
            value={String(insights.enrolled)}
            hint={`${insights.inProgress} en curso · ${insights.notStarted} sin empezar`}
          />
          <KpiTile
            label="Terminan el curso"
            value={`${insights.completionRate} %`}
            hint={`${insights.finished} de ${insights.enrolled}`}
            tone={insights.finished > 0 ? 'success' : 'neutral'}
          />
        </>
      ) : null}
      <KpiTile
        label="Nota media"
        value={average === null ? '—' : String(average)}
        hint={
          average === null
            ? 'Todavía sin entregas evaluadas'
            : `sobre 100 · ${items.length} ${items.length === 1 ? 'entrega' : 'entregas'}`
        }
      />
      <KpiTile
        label="Entregas"
        value={String(total)}
        hint={open > 0 ? `${open} sin corrección humana` : 'Nada pendiente'}
        tone={open > 0 ? 'warning' : 'success'}
      />
    </View>
  );
}

/** The submissions worth a look first, each a link straight into the review. */
export function ReviewQueueCard({ items }: { items: ReviewItem[] }) {
  const theme = useTheme();
  const queue = reviewQueue(items, QUEUE_LENGTH);

  return (
    <Card style={styles.side}>
      <View style={styles.cardHeadRow}>
        <Text
          accessibilityRole="header"
          style={[
            styles.sectionTitle,
            { color: theme.colors.ink, fontFamily: theme.typography.displayBold.family },
          ]}
        >
          Para corregir hoy
        </Text>
        <Link href="/instructor/submissions" style={[styles.more, { color: theme.colors.accentAlt }]}>
          Ver todas
        </Link>
      </View>

      {queue.length === 0 ? (
        <Text style={[styles.body, { color: theme.colors.neutral[800] }]}>
          No hay entregas esperando una segunda mirada.
        </Text>
      ) : (
        <View style={styles.queue}>
          {queue.map((item) => (
            <QueueRow key={item.submissionId} item={item} />
          ))}
        </View>
      )}
    </Card>
  );
}

function QueueRow({ item }: { item: ReviewItem }) {
  const theme = useTheme();
  const tone = scoreTone(item);
  const ink =
    tone === 'success'
      ? theme.colors.success
      : tone === 'warning'
        ? theme.colors.warning
        : theme.colors.neutral[800];
  const score = item.effectiveTotal === null ? '—' : String(Math.round(item.effectiveTotal));

  return (
    <Link
      href={{ pathname: '/instructor/submissions', params: { id: item.submissionId } }}
      asChild
    >
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${item.studentName}, ${item.activityTitle}, nota ${score}`}
      >
        {({ pressed }) => (
          <View
            style={[
              styles.queueRow,
              { borderColor: theme.colors.divider, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Initials name={item.studentName} />
            <View style={styles.queueText}>
              <Text style={[styles.queueName, { color: theme.colors.text }]} numberOfLines={1}>
                {item.studentName}
              </Text>
              <Text
                style={[styles.queueMeta, { color: theme.colors.neutral[800] }]}
                numberOfLines={1}
              >
                {item.activityTitle} · intento {item.attempt}
              </Text>
            </View>
            <Text
              style={[
                styles.queueScore,
                { color: ink, fontFamily: theme.typography.displayBold.family },
              ]}
            >
              {score}
            </Text>
          </View>
        )}
      </Pressable>
    </Link>
  );
}

function Initials({ name }: { name: string }) {
  const theme = useTheme();
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase('es'))
    .join('');

  return (
    <View style={[styles.initials, { backgroundColor: theme.colors.accentRamp[100] }]}>
      <Text style={[styles.initialsText, { color: theme.colors.accentRamp[800] }]}>
        {letters || '·'}
      </Text>
    </View>
  );
}

/**
 * Where people stop: one column per lesson, in syllabus order.
 *
 * The lesson that loses the most against the one before takes the warning
 * colour, and the sentence under the chart says it in words.
 */
export function DropOffChart({
  insights,
  courseTitle,
}: {
  insights: CourseInsights;
  courseTitle: string;
}) {
  const theme = useTheme();
  const reach = lessonReach(insights);
  const drop = biggestDrop(reach);
  const labelled = reach.length <= LABELLED_COLUMNS;
  const muted = theme.colors.neutral[800];

  return (
    <Card style={styles.main}>
      <View style={styles.cardHeadRow}>
        <Text
          accessibilityRole="header"
          style={[
            styles.sectionTitle,
            { color: theme.colors.ink, fontFamily: theme.typography.displayBold.family },
          ]}
        >
          Dónde se detienen tus estudiantes
        </Text>
        <Text style={[styles.queueMeta, { color: muted }]} numberOfLines={1}>
          {courseTitle} · por lección
        </Text>
      </View>

      {reach.length === 0 ? (
        <Text style={[styles.body, { color: muted }]}>
          {insights.enrolled === 0
            ? 'Todavía no hay nadie inscrito en este curso.'
            : 'Este curso todavía no tiene lecciones.'}
        </Text>
      ) : (
        <>
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={`Llegan a cada lección: ${reach
              .map((row) => `lección ${row.number}, ${row.percent} %`)
              .join('; ')}.`}
            style={[styles.columns, { height: CHART_HEIGHT + (labelled ? 40 : 0) }]}
          >
            {reach.map((row, index) => {
              const flagged = drop?.index === index;
              const fill = flagged ? theme.colors.warning : theme.colors.accentButton;

              return (
                <View key={row.key} style={styles.column}>
                  {labelled ? (
                    <Text
                      style={[styles.columnValue, { color: flagged ? theme.colors.warning : muted }]}
                      numberOfLines={1}
                    >
                      {row.percent}%
                    </Text>
                  ) : null}
                  <View
                    style={[
                      styles.bar,
                      {
                        // A lesson someone reached never draws as an empty column.
                        height: Math.max(row.percent > 0 ? 3 : 0, (row.percent / 100) * CHART_HEIGHT),
                        backgroundColor: fill,
                      },
                    ]}
                  />
                  {labelled ? (
                    <Text
                      style={[styles.columnLabel, { color: flagged ? theme.colors.warning : muted }]}
                      numberOfLines={1}
                    >
                      L{row.number}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>

          {drop ? (
            <View
              style={[
                styles.note,
                { backgroundColor: theme.colors.warningSoft, borderRadius: theme.radius.md },
              ]}
            >
              <Text style={[styles.noteText, { color: theme.colors.warning }]}>
                {dropSentence(drop)}
              </Text>
            </View>
          ) : null}
        </>
      )}
    </Card>
  );
}

/** The courses whose figures the dashboard can show, as a row of chips. */
export function CoursePicker({
  courses,
  selectedId,
  onSelect,
}: {
  courses: AuthoredCourse[];
  selectedId: string | undefined;
  onSelect: (courseId: string) => void;
}) {
  const theme = useTheme();
  if (courses.length < 2) return null;

  return (
    <View style={styles.picker} accessibilityLabel="Curso del panel">
      {courses.map((course) => {
        const active = course.id === selectedId;
        return (
          <Pressable
            key={course.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(course.id)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: active ? theme.colors.ink : theme.colors.surface,
                borderColor: active ? theme.colors.ink : theme.colors.divider,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text
              style={[styles.chipLabel, { color: active ? '#ffffff' : theme.colors.text }]}
              numberOfLines={1}
            >
              {course.title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A course as a tile in its own colour, with whether it is live. */
export function CourseTile({ course }: { course: AuthoredCourse }) {
  const theme = useTheme();
  const accent = useCourseAccent(course.slug);
  const [hovered, setHovered] = useState(false);
  const [blocker] = course.publishBlockers;
  const live = course.status === 'published';
  const initial = course.title.trim().charAt(0).toLocaleUpperCase('es') || '·';

  return (
    <Link href={`/instructor/courses/${course.id}`} asChild>
      <Pressable
        accessibilityRole="link"
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={styles.tileHit}
      >
        {({ pressed }) => (
          // The look lives on this View: with `asChild` the Pressable is the
          // anchor on web and drops its own style.
          <View
            style={[
              styles.tile,
              {
                backgroundColor: theme.colors.surface,
                borderColor: hovered ? accent.mid : theme.colors.divider,
                borderRadius: theme.radius.lg,
                opacity: pressed ? 0.92 : 1,
                ...cardLift(hovered),
              },
            ]}
          >
            <View style={styles.tileHead}>
              <View
                style={[styles.badge, { backgroundColor: accent.wash, borderRadius: theme.radius.md }]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: accent.ink, fontFamily: theme.typography.display.family },
                  ]}
                >
                  {initial}
                </Text>
              </View>
              <View
                style={[
                  styles.status,
                  {
                    backgroundColor: live ? theme.colors.successSoft : theme.colors.neutral[200],
                    borderRadius: theme.radius.sm,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: live ? theme.colors.success : theme.colors.neutral[800] },
                  ]}
                >
                  {STATUS_LABELS[course.status]}
                </Text>
              </View>
            </View>

            <Text
              style={[
                styles.tileTitle,
                { color: theme.colors.ink, fontFamily: theme.typography.displayBold.family },
              ]}
              numberOfLines={2}
            >
              {course.title}
            </Text>
            <Text style={[styles.queueMeta, { color: theme.colors.neutral[800] }]}>
              {course.lessonCount} {course.lessonCount === 1 ? 'lección' : 'lecciones'} ·{' '}
              {course.moduleCount} {course.moduleCount === 1 ? 'módulo' : 'módulos'}
            </Text>

            {/* Shown even on a published course: an instructor who breaks one
                should find out now, not the next time they try to publish. */}
            {blocker ? (
              <Text style={[styles.blocker, { color: theme.colors.warning }]} numberOfLines={2}>
                Falta para publicar: {blocker}
              </Text>
            ) : null}
          </View>
        )}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  main: { flexGrow: 2, flexBasis: 420, minWidth: 0 },
  side: { flexGrow: 1, flexBasis: 300, minWidth: 0 },
  cardHeadRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    columnGap: 10.2,
    rowGap: 3.4,
  },
  sectionTitle: { fontSize: 19, letterSpacing: -0.2 },
  more: { fontSize: 14, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22 },
  queue: { gap: 0 },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10.2,
    paddingVertical: 10.2,
    borderTopWidth: 1,
  },
  queueText: { flex: 1, minWidth: 0, gap: 2 },
  queueName: { fontSize: 15, fontWeight: '600' },
  queueMeta: { fontSize: 13, lineHeight: 18 },
  queueScore: { fontSize: 22, minWidth: 36, textAlign: 'right' },
  initials: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: { fontSize: 13, fontWeight: '700' },
  columns: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  column: { flex: 1, minWidth: 4, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  columnValue: { fontSize: 11, fontWeight: '700' },
  columnLabel: { fontSize: 11, fontWeight: '600' },
  bar: { width: '100%', maxWidth: 44, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  note: { padding: 12 },
  noteText: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  picker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6.8 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 14,
    maxWidth: 280,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipLabel: { fontSize: 13, fontWeight: '600' },
  tileHit: { flexGrow: 1, flexBasis: 260, minWidth: 0 },
  tile: { borderWidth: 1, padding: 18, gap: 8, flexGrow: 1 },
  tileHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 20 },
  status: { paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  tileTitle: { fontSize: 18, lineHeight: 23, letterSpacing: -0.2 },
  blocker: { fontSize: 13, lineHeight: 19 },
});
