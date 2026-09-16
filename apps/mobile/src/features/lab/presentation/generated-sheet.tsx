import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import {
  blocksFromGeneratedText,
  figureFromTableCell,
  sheetMentionsVisualFigure,
} from '@/features/lab/domain/generated-sheet';
import { FractionPie, FractionPieCaption } from '@/features/lab/presentation/fraction-pie';

export function GeneratedSheet({
  text,
  showFrame = true,
}: {
  text: string;
  showFrame?: boolean;
}) {
  const theme = useTheme();
  const blocks = blocksFromGeneratedText(text);
  const mentionsVisual = sheetMentionsVisualFigure(text);

  if (blocks.length === 0) return null;

  return (
    <View
      style={[
        showFrame ? styles.sheet : styles.sheetBare,
        showFrame
          ? {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.divider,
              borderRadius: theme.radius.lg,
              ...theme.shadow.md,
            }
          : undefined,
      ]}
    >
      {showFrame ? (
        <Text style={[styles.kicker, { color: theme.colors.accentRamp[700] }]}>La hoja</Text>
      ) : null}
      {blocks.map((block, blockIndex) => {
        if (block.kind === 'paragraph') {
          return (
            <Text key={`p-${blockIndex}`} style={[styles.paragraph, { color: theme.colors.text }]}>
              {block.text}
            </Text>
          );
        }

        if (block.kind === 'figure') {
          return (
            <View key={`f-${blockIndex}`} style={styles.figureRow}>
              <FractionPie
                paintedSlices={block.paintedSlices}
                totalSlices={block.totalSlices}
              />
              <FractionPieCaption caption={block.caption} />
            </View>
          );
        }

        return (
          <ScrollView
            key={`t-${blockIndex}`}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            <View style={[styles.table, { borderColor: theme.colors.divider }]}>
              <View style={[styles.tableRow, { backgroundColor: theme.colors.accentRamp[100] }]}>
                {block.headers.map((header) => (
                  <Text
                    key={header}
                    style={[styles.headerCell, { color: theme.colors.accentRamp[800] }]}
                  >
                    {header}
                  </Text>
                ))}
              </View>
              {block.rows.map((row, rowIndex) => (
                <View
                  key={`r-${rowIndex}`}
                  style={[
                    styles.tableRow,
                    {
                      borderTopColor: theme.colors.divider,
                      backgroundColor:
                        rowIndex % 2 === 0 ? theme.colors.surface : theme.colors.neutral[100],
                    },
                  ]}
                >
                  {row.map((cell, cellIndex) => {
                    const header = block.headers[cellIndex] ?? '';
                    const pie = figureFromTableCell(cell, header, mentionsVisual);
                    if (pie) {
                      return (
                        <View key={`${rowIndex}-${cellIndex}`} style={styles.figureCell}>
                          <FractionPie
                            paintedSlices={pie.paintedSlices}
                            totalSlices={pie.totalSlices}
                          />
                        </View>
                      );
                    }
                    return (
                      <Text
                        key={`${rowIndex}-${cellIndex}`}
                        style={[styles.cell, { color: theme.colors.text }]}
                      >
                        {cell}
                      </Text>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { borderWidth: 1, paddingHorizontal: 18, paddingVertical: 16, gap: 12 },
  sheetBare: { gap: 12 },
  kicker: { fontSize: 12, fontWeight: '700' },
  paragraph: { fontSize: 15, lineHeight: 23 },
  figureRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  figureCell: {
    minWidth: 88,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  table: { borderWidth: 1, minWidth: '100%' },
  tableRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'transparent', alignItems: 'center' },
  headerCell: {
    minWidth: 160,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '700',
  },
  cell: {
    minWidth: 160,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 20,
  },
});
