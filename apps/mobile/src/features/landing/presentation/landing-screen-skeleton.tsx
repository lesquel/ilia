import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/core/ui/skeleton';
import { CourseCardSkeleton } from '@/features/catalog/presentation/course-card-skeleton';

/**
 * The featured-courses grid on the landing page before the courses arrive:
 * the same number of cards, in the same wrapped columns with the same right
 * and bottom gutters as the loaded grid. The section heading stays real.
 */
export function LandingScreenSkeleton({
  columns,
  count,
}: {
  /** The landing page's own column count for this width. */
  columns: number;
  /** How many featured cards the page shows. */
  count: number;
}) {
  return (
    <Skeleton
      label="Cargando cursos"
      style={[styles.grid, columns > 1 ? styles.gridWide : undefined]}
    >
      {Array.from({ length: count }, (_, index) => (
        <View
          key={index}
          style={
            columns > 1
              ? [styles.cellWide, { width: `${100 / columns}%` }]
              : styles.cell
          }
        >
          <CourseCardSkeleton />
        </View>
      ))}
    </Skeleton>
  );
}

const styles = StyleSheet.create({
  // Same frame as `courseGrid` in `landing-screen.tsx`: the cells carry the
  // gutters, so the skeleton's own gap is cleared.
  grid: {
    gap: 0,
    marginRight: -16,
  },
  gridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
  },
  cell: {
    paddingBottom: 16,
  },
  cellWide: {
    paddingRight: 16,
    paddingBottom: 16,
    alignSelf: 'stretch',
  },
});
