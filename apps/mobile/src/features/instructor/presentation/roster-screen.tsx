import { Link, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { breakpoint, useTheme } from '@/core/theme';
import { Icon } from '@/core/ui/icon';
import { ProgressBar } from '@/core/ui/progress-bar';
import { ErrorState, LoadingState } from '@/core/ui/state-view';
import {
  useAuthoredCourseDetail,
  useCourseInsights,
  useRoster,
} from '@/features/instructor/application/use-instructor';
import {
  barWidth,
  dayLabel,
  enrollmentsSentence,
  insightsSummary,
  latestDays,
  percentOf,
  progressRows,
  type CourseInsights,
  type DayCount,
  type RosterEntry,
} from '@/features/instructor/domain/entities';
import { Card } from '@/features/instructor/presentation/ui';

/** How many day columns fit one row before the labels start to collide. */
const MAX_DAY_COLUMNS = 14;
const COLUMN_PLOT_HEIGHT = 96;

export interface RosterScreenProps {
  /**
   * The course's forum, composed by the route: this feature does not import
   * the forum's.
   */
  commentsSlot?: ReactNode;
}

/** How a course is going and who is in it (PRD I-04). */
export function RosterScreen({ commentsSlot }: RosterScreenProps) {
  const theme = useTheme();
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const id = courseId ?? '';

  const { course } = useAuthoredCourseDetail(id);
  const { insights, isLoading: insightsLoading, error: insightsError } = useCourseInsights(id);
  const { roster, isLoading: rosterLoading, error: rosterError } = useRoster(id);

  const error = insightsError ?? rosterError;
  if (error) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        <ErrorState error={error} />
      </View>
    );
  }

  const muted = theme.colors.neutral[600];

  return (
    <ScrollView style={{ backgroundColor: theme.colors.bg }} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Link href={`/instructor/courses/${id}`} asChild>
          <Pressable accessibilityRole="link" style={styles.backLink}>
            <Icon glyph={ArrowLeft} size={16} color={muted} />
            <Text style={[styles.backLabel, { color: muted }]}>Volver al curso</Text>
          </Pressable>
        </Link>
        <Text style={[styles.kicker, { color: theme.colors.accentAlt }]}>Estadísticas e inscritos</Text>
        <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={3} accessibilityRole="header">
          {course?.title ?? 'Tu curso'}
        </Text>
        <Text style={[styles.subtitle, { color: muted }]}>
          {insights
            ? insightsSummary(insights)
            : 'Quién se anotó, hasta dónde llegó y qué se está diciendo.'}
        </Text>
      </View>

      {insightsLoading || !insights ? (
        <LoadingState label="Cargando las cifras del curso…" />
      ) : (
        <>
          <StatTiles insights={insights} />

          {insights.enrolled === 0 ? (
            <Card>
              <Text style={[styles.body, { color: muted }]}>
                Cuando alguien se inscriba vas a ver aquí en qué lección se detiene cada grupo y
                cómo llegan las inscripciones.
              </Text>
            </Card>
          ) : (
            <>
              <Card
                title="Avance por lección"
                hint="Cuántas personas inscritas completaron cada lección, en el orden del temario."
              >
                <LessonProgressChart insights={insights} />
              </Card>

              <Card title="Inscripciones por día">
                <EnrollmentsChart days={insights.enrollmentsByDay} />
              </Card>
            </>
          )}
        </>
      )}

      {commentsSlot ? <Card title="Comentarios del curso">{commentsSlot}</Card> : null}

      <Card title="Inscritos" hint="Quién se anotó, de qué charla vino y hasta dónde llegó.">
        {rosterLoading ? (
          <LoadingState label="Cargando inscritos…" />
        ) : roster.length === 0 ? (
          <View style={styles.emptyRoster}>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              Todavía no hay nadie inscrito
            </Text>
            <Text style={[styles.body, { color: muted }]}>
              Publicá el curso y compartí el enlace para que empiecen a anotarse.
            </Text>
          </View>
        ) : (
          <View>
            {roster.map((entry, index) => (
              <RosterRow key={entry.userId} entry={entry} isFirst={index === 0} />
            ))}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

// Labels on tiles, bars and rows use neutral 800, the one secondary ink the
// theme flips for dark: 600 and 700 stay mid-grey there and fall under contrast
// on the dark surface, and these are the words that carry the numbers.
function StatTiles({ insights }: { insights: CourseInsights }) {
  const theme = useTheme();
  const { enrolled, finished, inProgress, notStarted, completionRate } = insights;
  const share = (count: number) =>
    enrolled > 0 ? `${percentOf(count, enrolled)}% de los inscritos` : undefined;

  return (
    <View style={styles.tiles}>
      <StatTile label="Inscritos" value={enrolled} />
      <StatTile label="Terminaron" value={finished} note={share(finished)} />
      <StatTile label="En curso" value={inProgress} note={share(inProgress)} />
      <StatTile label="Sin empezar" value={notStarted} note={share(notStarted)} />

      <Tile>
        <Text style={[styles.tileLabel, { color: theme.colors.neutral[800] }]}>Finalización</Text>
        <Text style={[styles.tileValue, { color: theme.colors.text }]}>{completionRate}%</Text>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel={`Finalización: ${finished} de ${enrolled} inscritos terminaron el curso, ${completionRate}%`}
          accessibilityValue={{ min: 0, max: 100, now: completionRate }}
          style={[styles.thinTrack, { backgroundColor: theme.colors.neutral[200] }]}
        >
          <View
            style={[
              styles.thinFill,
              { width: barWidth(completionRate, 100), backgroundColor: theme.colors.accent },
            ]}
          />
        </View>
        <Text style={[styles.tileNote, { color: theme.colors.neutral[800] }]}>
          {finished} de {enrolled} terminaron
        </Text>
      </Tile>
    </View>
  );
}

function Tile({ children }: { children: ReactNode }) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.divider,
          borderRadius: theme.radius.md,
        },
      ]}
    >
      {children}
    </View>
  );
}

function StatTile({ label, value, note }: { label: string; value: number; note?: string }) {
  const theme = useTheme();

  return (
    <Tile>
      <Text style={[styles.tileLabel, { color: theme.colors.neutral[800] }]}>{label}</Text>
      <Text style={[styles.tileValue, { color: theme.colors.text }]}>{value}</Text>
      {note ? (
        <Text style={[styles.tileNote, { color: theme.colors.neutral[800] }]}>{note}</Text>
      ) : null}
    </Tile>
  );
}

/**
 * One bar per lesson, in the order people walk the course.
 *
 * The drop from one row to the next is the answer to "where do they stop",
 * which is why the order is the syllabus and never the size of the bar.
 */
function LessonProgressChart({ insights }: { insights: CourseInsights }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= breakpoint.compact;
  const rows = progressRows(insights);
  const muted = theme.colors.neutral[800];

  if (rows.length === 0) {
    return (
      <Text style={[styles.body, { color: muted }]}>
        Este curso todavía no tiene lecciones ni prácticas.
      </Text>
    );
  }

  const spoken = rows
    .map(
      (row) =>
        `${row.isPractice ? 'práctica ' : ''}${row.title}: ${row.count} de ${insights.enrolled}`,
    )
    .join('; ');

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Avance por lección entre ${insights.enrolled} inscritos. ${spoken}.`}
      style={styles.barList}
    >
      {rows.map((row, index) => (
        <View key={row.key} style={[styles.barRow, isWide ? styles.barRowWide : undefined]}>
          <View style={[styles.barTitle, isWide ? styles.barTitleWide : undefined]}>
            <Text style={[styles.barIndex, { color: theme.colors.neutral[800] }]}>
              {String(index + 1).padStart(2, '0')}
            </Text>
            <Text style={[styles.barName, { color: theme.colors.text }]} numberOfLines={1}>
              {row.title}
            </Text>
            {row.isPractice ? (
              <View style={[styles.practiceTag, { backgroundColor: theme.colors.accentRamp[100] }]}>
                <Text style={[styles.practiceLabel, { color: theme.colors.accentRamp[800] }]}>
                  práctica
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.barMeasure}>
            <View style={[styles.track, { backgroundColor: theme.colors.neutral[200] }]}>
              <View
                style={[
                  styles.fill,
                  {
                    width: barWidth(row.count, insights.enrolled),
                    backgroundColor: theme.colors.accent,
                  },
                ]}
              />
            </View>
            <Text style={[styles.barValue, { color: theme.colors.text }]}>
              {row.count}
              <Text style={{ color: muted }}> · {percentOf(row.count, insights.enrolled)}%</Text>
            </Text>
          </View>
        </View>
      ))}

      {insights.activities.length > 0 ? (
        <Text style={[styles.meta, { color: muted }]}>
          En las prácticas la barra cuenta a quienes la aprobaron.
        </Text>
      ) : null}
    </View>
  );
}

function EnrollmentsChart({ days }: { days: DayCount[] }) {
  const theme = useTheme();
  const muted = theme.colors.neutral[800];

  const sentence = enrollmentsSentence(days);
  if (sentence) {
    return <Text style={[styles.body, { color: theme.colors.text }]}>{sentence}</Text>;
  }

  if (days.length === 0) {
    return (
      <Text style={[styles.body, { color: muted }]}>
        No hay fechas de inscripción registradas.
      </Text>
    );
  }

  const shown = latestDays(days, MAX_DAY_COLUMNS);
  const peak = Math.max(...shown.map((item) => item.count));
  const spoken = shown.map((item) => `${dayLabel(item.day)}: ${item.count}`).join('; ');

  return (
    <View style={styles.columnsWrap}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Inscripciones por día. ${spoken}.`}
        style={styles.columns}
      >
        {shown.map((item) => (
          <View key={item.day} style={styles.column}>
            <Text style={[styles.columnValue, { color: theme.colors.text }]}>{item.count}</Text>
            <View style={[styles.columnPlot, { borderBottomColor: theme.colors.neutral[300] }]}>
              <View
                style={[
                  styles.columnBar,
                  {
                    height: Math.max(2, (COLUMN_PLOT_HEIGHT * percentOf(item.count, peak)) / 100),
                    backgroundColor: theme.colors.accent,
                  },
                ]}
              />
            </View>
            <Text style={[styles.columnDay, { color: muted }]} numberOfLines={1}>
              {dayLabel(item.day)}
            </Text>
          </View>
        ))}
      </View>
      <Text style={[styles.meta, { color: muted }]}>
        {shown.length < days.length
          ? `Los últimos ${shown.length} días con inscripciones, de ${days.length}. `
          : ''}
        Solo aparecen los días en que alguien se inscribió.
      </Text>
    </View>
  );
}

function RosterRow({ entry, isFirst }: { entry: RosterEntry; isFirst: boolean }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= breakpoint.compact;
  const muted = theme.colors.neutral[800];

  const dates = [
    entry.enrolledAt ? `Se inscribió el ${dayLabel(entry.enrolledAt)}` : null,
    entry.lastActivityAt ? `última actividad el ${dayLabel(entry.lastActivityAt)}` : null,
  ].filter(Boolean);

  return (
    <View
      style={[
        styles.rosterRow,
        isWide ? styles.rosterRowWide : undefined,
        { borderTopColor: isFirst ? 'transparent' : theme.colors.divider },
      ]}
    >
      <View style={styles.rosterWho}>
        <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
          {entry.fullName}
        </Text>
        {/* The email is here on purpose: reaching a teacher who stopped halfway is
            the entire point of looking at this list. */}
        <Text selectable style={[styles.meta, { color: muted }]} numberOfLines={1}>
          {entry.email}
        </Text>
        <View style={styles.rosterTags}>
          <View
            style={[
              styles.cohortTag,
              {
                backgroundColor: entry.cohortName
                  ? theme.colors.accentRamp[100]
                  : theme.colors.neutral[200],
                borderRadius: theme.radius.sm,
              },
            ]}
          >
            <Text
              style={[
                styles.cohortLabel,
                {
                  color: entry.cohortName ? theme.colors.accentRamp[800] : theme.colors.neutral[800],
                },
              ]}
            >
              {entry.cohortName ?? 'Inscripción abierta'}
            </Text>
          </View>
          {dates.length > 0 ? (
            <Text style={[styles.rosterDates, { color: muted }]}>{dates.join(' · ')}</Text>
          ) : null}
        </View>
      </View>

      <View style={[styles.rosterProgress, isWide ? styles.rosterProgressWide : undefined]}>
        <ProgressBar
          percentage={entry.percentage}
          label={`${entry.lessonsCompleted} de ${entry.lessonsTotal} lecciones · ${entry.percentage}%`}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 27.2 },
  content: {
    padding: 20.4,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    gap: 20.4,
  },
  header: { gap: 6.8 },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 6,
  },
  backLabel: { fontSize: 14, fontWeight: '600' },
  kicker: { fontSize: 13, fontWeight: '600' },
  title: { fontSize: 30, fontWeight: '700', lineHeight: 36, letterSpacing: -0.6 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  body: { fontSize: 15, lineHeight: 22 },
  meta: { fontSize: 13, lineHeight: 19 },

  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10.2 },
  // Five across on a desktop, two on a phone: the basis is what decides.
  tile: { flexGrow: 1, flexBasis: 150, borderWidth: 1, padding: 13.6, gap: 3.4 },
  tileLabel: { fontSize: 13, fontWeight: '600' },
  tileValue: { fontSize: 30, fontWeight: '700', lineHeight: 36, letterSpacing: -0.6 },
  tileNote: { fontSize: 12, lineHeight: 17 },
  thinTrack: { height: 4, borderRadius: 2, overflow: 'hidden', marginVertical: 3.4 },
  thinFill: { height: '100%', borderRadius: 2 },

  barList: { gap: 10.2 },
  barRow: { gap: 3.4 },
  barRowWide: { flexDirection: 'row', alignItems: 'center', gap: 13.6 },
  barTitle: { flexDirection: 'row', alignItems: 'center', gap: 6.8, minWidth: 0 },
  barTitleWide: { width: '38%' },
  barIndex: { width: 20, fontSize: 12, fontWeight: '700' },
  barName: { flexShrink: 1, fontSize: 14 },
  practiceTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  practiceLabel: { fontSize: 11, fontWeight: '700' },
  barMeasure: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10.2, minWidth: 0 },
  track: { flex: 1, height: 12, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  barValue: { width: 76, fontSize: 13, fontWeight: '700', textAlign: 'right' },

  columnsWrap: { gap: 10.2 },
  columns: { flexDirection: 'row', alignItems: 'flex-end', gap: 6.8 },
  column: { flex: 1, maxWidth: 56, minWidth: 0, alignItems: 'center', gap: 3.4 },
  columnValue: { fontSize: 12, fontWeight: '700' },
  columnPlot: {
    alignSelf: 'stretch',
    height: COLUMN_PLOT_HEIGHT,
    justifyContent: 'flex-end',
    borderBottomWidth: 1,
  },
  // Rounded at the data end only, so the column sits flat on its baseline.
  columnBar: { borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  columnDay: { fontSize: 11 },

  emptyRoster: { gap: 3.4, paddingVertical: 6.8 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  rosterRow: { gap: 10.2, paddingVertical: 13.6, borderTopWidth: 1 },
  rosterRowWide: { flexDirection: 'row', alignItems: 'center', gap: 20.4 },
  rosterWho: { flex: 1, minWidth: 0, gap: 3.4 },
  rosterTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6.8,
    marginTop: 3.4,
  },
  cohortTag: { paddingHorizontal: 8, paddingVertical: 3 },
  cohortLabel: { fontSize: 12, fontWeight: '600' },
  rosterDates: { fontSize: 12 },
  name: { fontSize: 16, fontWeight: '600' },
  rosterProgress: { alignSelf: 'stretch' },
  rosterProgressWide: { width: 260, alignSelf: 'center' },
});
