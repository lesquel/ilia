import type { DimensionValue } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Bone, Skeleton } from '@/core/ui/skeleton';
import { useIsWide } from '@/features/admin/presentation/ui';

/**
 * Skeletons for the admin panels' lists.
 *
 * Every admin list is the same shape: column names when wide, then rows with a
 * rule above each, laid out as columns when there is room and stacked when not
 * (`ListHeader` / `ListRow`). Each panel passes its own columns, with the
 * widths its real cells use, so the bones sit where the data will.
 */

const PLACEHOLDER_ROWS = 4;

interface ColumnBone {
  /** The cell width when wide; `undefined` makes it the flexible column. */
  width?: number;
  /** What sits in the cell: stacked bone lines, as [width, height]. */
  lines: [DimensionValue, number][];
  /** A round initials mark before the lines, as the users table draws. */
  avatar?: boolean;
}

function TableSkeleton({ label, columns }: { label: string; columns: ColumnBone[] }) {
  const theme = useTheme();
  const isWide = useIsWide();

  return (
    <Skeleton label={label} style={styles.table}>
      {isWide ? (
        <View style={styles.header}>
          {columns.map((column, index) => (
            <View key={index} style={cellStyle(column)}>
              <Bone width={72} height={12} />
            </View>
          ))}
        </View>
      ) : null}

      {Array.from({ length: PLACEHOLDER_ROWS }, (_, row) => (
        <View
          key={row}
          style={[
            styles.row,
            isWide ? styles.rowWide : undefined,
            { borderTopColor: theme.colors.divider },
          ]}
        >
          {columns.map((column, index) => (
            <View
              key={index}
              style={[
                column.avatar ? styles.avatarCell : styles.cell,
                isWide ? cellStyle(column) : undefined,
              ]}
            >
              {column.avatar ? <Bone height={36} circle /> : null}
              <View style={column.avatar ? styles.avatarLines : styles.lines}>
                {column.lines.map(([width, height], line) => (
                  <Bone key={line} width={width} height={height} />
                ))}
              </View>
            </View>
          ))}
        </View>
      ))}
    </Skeleton>
  );
}

function cellStyle(column: ColumnBone) {
  return column.width === undefined ? styles.flexCell : { width: column.width };
}

/** Person, role and state tags, role chips: the users table. */
export function UsersPanelSkeleton() {
  return (
    <TableSkeleton
      label="Cargando usuarios"
      columns={[
        { lines: [['55%', 16], ['75%', 13]], avatar: true },
        { width: 200, lines: [[150, 22]] },
        { width: 330, lines: [['90%', 36]] },
      ]}
    />
  );
}

/** Code, talk name, creation date: the cohorts table. */
export function CohortPanelSkeleton() {
  return (
    <TableSkeleton
      label="Cargando cohortes"
      columns={[
        { width: 240, lines: [[140, 15]] },
        { lines: [['70%', 13]] },
        { width: 130, lines: [[90, 13]] },
      ]}
    />
  );
}

/** Action tag and actor, raw detail, when: the audit log. */
export function AuditPanelSkeleton() {
  return (
    <TableSkeleton
      label="Cargando auditoría"
      columns={[
        { width: 240, lines: [[150, 22], [110, 13]] },
        { lines: [['90%', 12], ['60%', 12]] },
        { width: 160, lines: [[130, 13]] },
      ]}
    />
  );
}

/** The usage totals: the token count, its split and the estimated cost. */
export function UsagePanelSkeleton() {
  return (
    <Skeleton label="Cargando uso de LLM" style={styles.totals}>
      <Bone width={220} height={30} />
      <Bone width="75%" height={13} />
      <Bone width={190} height={16} />
    </Skeleton>
  );
}

const styles = StyleSheet.create({
  table: { gap: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 13.6, paddingBottom: 6.8 },
  row: { gap: 6.8, paddingVertical: 13.6, borderTopWidth: 1 },
  rowWide: { flexDirection: 'row', alignItems: 'center', gap: 13.6 },
  cell: { gap: 6, minWidth: 0 },
  lines: { gap: 6 },
  avatarCell: { flexDirection: 'row', alignItems: 'center', gap: 10.2, minWidth: 0 },
  avatarLines: { flex: 1, gap: 6, minWidth: 0 },
  flexCell: { flex: 1, minWidth: 0 },
  totals: { gap: 6.8 },
});
