import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/core/ui/skeleton';

import { CourseCardSkeleton } from './course-card-skeleton';

/**
 * The catalogue grid before its courses arrive.
 *
 * The screen passes its own `columns` and `cardMaxWidth`, the numbers its
 * FlatList uses, so the placeholder grid is the real grid at every width. The
 * header (title, search, chips) stays real above it.
 */
export function CatalogScreenSkeleton({
  columns,
  cardMaxWidth,
  rows = 2,
  label = 'Buscando cursos',
  gap,
}: {
  columns: number;
  cardMaxWidth: number;
  rows?: number;
  label?: string;
  /** The list's own gap between rows. */
  gap: number;
}) {
  return (
    <Skeleton label={label} style={{ gap }}>
      {Array.from({ length: rows }, (_, row) => (
        <View key={row} style={columns > 1 ? [styles.row, { gap }] : undefined}>
          {Array.from({ length: columns }, (_, column) => (
            <View
              key={column}
              style={columns > 1 ? [styles.item, { maxWidth: cardMaxWidth }] : undefined}
            >
              <CourseCardSkeleton />
            </View>
          ))}
        </View>
      ))}
    </Skeleton>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  item: {
    flex: 1,
  },
});
