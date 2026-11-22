import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { breakpoint, useTheme } from '@/core/theme';
import { Bone, BoneLines, Skeleton } from '@/core/ui/skeleton';
import { Card } from '@/core/ui/surface';

/**
 * "Mis cursos" before the enrolments arrive: the continue hero (cover beside
 * the copy on a wide window, above it on a phone), then the grid of the other
 * courses at the screen's own columns and card width.
 *
 * `withHeader` draws the screen header too, for the moment the session is
 * still being checked and the real header is not on screen yet.
 */
export function MyCoursesScreenSkeleton({
  withHeader = false,
  label = 'Cargando tus cursos',
}: {
  withHeader?: boolean;
  label?: string;
}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= breakpoint.compact;

  // Same breakpoints and cap as `MyCoursesScreen`.
  const columns = width >= breakpoint.medium ? 3 : width >= breakpoint.compact ? 2 : 1;
  const contentWidth = Math.min(width, CONTENT_MAX_WIDTH) - CONTENT_PADDING * 2;
  const cardWidth = (contentWidth - GRID_GAP * (columns - 1)) / columns;

  return (
    <Skeleton label={label} style={styles.group}>
      {withHeader ? (
        <View style={[styles.header, isWide ? styles.headerWide : undefined]}>
          <View style={styles.headerCopy}>
            <Bone height={30} width={200} />
            <Bone height={15} width={isWide ? 320 : '85%'} />
          </View>
          <Bone height={44} width={190} radius={theme.radius.md} />
        </View>
      ) : null}

      <Card style={[styles.hero, isWide ? styles.heroWide : undefined]}>
        <View style={isWide ? styles.heroCoverWide : undefined}>
          <Bone height={COVER_HEIGHT} radius={0} />
        </View>
        <View style={styles.heroBody}>
          <View style={styles.tags}>
            <Bone height={22} width={136} />
            <Bone height={22} width={84} />
          </View>
          <Bone height={26} width="72%" />
          <Bone height={14} width="55%" />
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <ProgressBone />
            </View>
            <Bone height={20} width={44} />
          </View>
          <View style={styles.actions}>
            <Bone height={44} width={170} radius={theme.radius.md} />
            <Bone height={44} width={120} radius={theme.radius.md} />
          </View>
        </View>
      </Card>

      <View style={styles.section}>
        <Bone height={18} width={150} />
        <View style={columns > 1 ? styles.grid : styles.stack}>
          {Array.from({ length: columns }, (_, index) => (
            <View key={index} style={columns > 1 ? { width: cardWidth } : undefined}>
              <Card style={styles.card}>
                <Bone height={22} width={92} />
                <View style={styles.cardHead}>
                  <Bone height={18} width="90%" />
                  <Bone height={18} width="60%" />
                  <Bone height={13} width={120} style={styles.fact} />
                </View>
                <ProgressBone />
                <View style={styles.next}>
                  <BoneLines lines={2} height={13} gap={6} lastWidth="70%" />
                </View>
                <Bone height={44} width={170} radius={theme.radius.md} />
              </Card>
            </View>
          ))}
        </View>
      </View>
    </Skeleton>
  );
}

/** `ProgressBar`: a 6 px track and its 12 px label below. */
function ProgressBone() {
  return (
    <View style={styles.progress}>
      <Bone height={6} />
      <Bone height={12} width={160} />
    </View>
  );
}

const CONTENT_MAX_WIDTH = 1080;
const CONTENT_PADDING = 20.4;
const GRID_GAP = 13.6;
/** `CourseCoverArt` reserves this height for every cover. */
const COVER_HEIGHT = 268;

const styles = StyleSheet.create({
  // The screen's content gap, so the bones sit where the real blocks will.
  group: { gap: 20.4 },
  header: { gap: 13.6 },
  headerWide: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  headerCopy: { flexShrink: 1, minWidth: 0, gap: 6.8 },
  hero: { padding: 0, gap: 0, overflow: 'hidden' },
  heroWide: { flexDirection: 'row', alignItems: 'stretch' },
  heroCoverWide: { width: 340, justifyContent: 'center' },
  heroBody: { padding: 20.4, gap: 10.2, flex: 1, minWidth: 0, justifyContent: 'center' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6.8 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 13.6 },
  progressTrack: { flex: 1 },
  progress: { gap: 3.4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10.2, marginTop: 3.4 },
  section: { gap: 13.6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: GRID_GAP },
  stack: { gap: GRID_GAP },
  card: { flexGrow: 1, gap: 10.2 },
  cardHead: { gap: 3.4 },
  fact: { marginTop: 3 },
  next: { flexGrow: 1 },
});
