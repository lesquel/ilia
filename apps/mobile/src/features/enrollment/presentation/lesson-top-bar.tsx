import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

import { useTheme } from '@/core/theme';
import { Icon } from '@/core/ui/icon';
import type { CourseAccent } from '@/features/catalog';
import type { LessonStepState } from '@/features/enrollment/domain/lesson-steps';

/**
 * The lesson's top bar: back to the course, where you are in it, the lesson's
 * title and one segment per lesson in the course's own color.
 */
export function LessonTopBar({
  backHref,
  courseTitle,
  position,
  totalLessons,
  title,
  steps,
  accent,
  isWide,
  column,
}: {
  backHref: Href;
  courseTitle: string | null;
  position: number;
  totalLessons: number;
  title: string;
  steps: readonly LessonStepState[];
  accent: CourseAccent;
  isWide: boolean;
  column: ViewStyle;
}) {
  const theme = useTheme();
  const stepLabel = `Lección ${position} de ${totalLessons}`;
  const kicker = courseTitle ? `${courseTitle} · ${stepLabel}` : stepLabel;
  const done = steps.filter((step) => step === 'done').length;

  const segments = steps.length > 0 ? (
    <View
      style={[styles.segments, isWide ? styles.segmentsWide : undefined]}
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: steps.length,
        now: done,
        text: `${done} de ${steps.length} lecciones terminadas`,
      }}
    >
      {steps.map((step, index) => (
        <View
          key={index}
          style={[
            styles.segment,
            {
              backgroundColor:
                step === 'done'
                  ? accent.ink
                  : step === 'current'
                    ? accent.mid
                    : theme.colors.neutral[200],
            },
          ]}
        />
      ))}
    </View>
  ) : null;

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.divider },
      ]}
    >
      <View style={[styles.inner, isWide ? styles.innerWide : undefined, column]}>
        <View style={[styles.row, isWide ? styles.rowWide : undefined]}>
          <Link href={backHref} asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Volver al curso"
              style={({ pressed }) => [
                styles.back,
                { borderColor: theme.colors.divider, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Icon glyph={ChevronLeft} size={18} color={theme.colors.text} />
            </Pressable>
          </Link>
          <View style={styles.copy}>
            <Text
              style={[styles.kicker, { color: theme.colors.neutral[600] }]}
              numberOfLines={1}
            >
              {kicker}
            </Text>
            <Text
              style={[
                styles.title,
                isWide ? styles.titleWide : undefined,
                { color: theme.colors.text, fontFamily: theme.typography.displayBold.family },
              ]}
              numberOfLines={1}
              accessibilityRole="header"
            >
              {title}
            </Text>
          </View>
          {isWide ? segments : null}
        </View>
        {isWide ? null : segments}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderBottomWidth: 1 },
  inner: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, gap: 10 },
  innerWide: { paddingHorizontal: 24, paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowWide: { gap: 20 },
  back: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flexShrink: 1, minWidth: 0, gap: 2 },
  kicker: { fontSize: 12, fontWeight: '600' },
  title: { fontSize: 15 },
  titleWide: { fontSize: 17 },
  segments: { flexDirection: 'row', gap: 4 },
  segmentsWide: { flex: 1, gap: 6, marginHorizontal: 16, minWidth: 120 },
  segment: { flex: 1, height: 5, borderRadius: 999 },
});
