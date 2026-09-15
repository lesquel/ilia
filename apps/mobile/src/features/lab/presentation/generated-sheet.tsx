import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { blocksFromGeneratedText } from '@/features/lab/domain/generated-sheet';

export function GeneratedSheet({ text }: { text: string }) {
  const theme = useTheme();
  const blocks = blocksFromGeneratedText(text);

  if (blocks.length === 0) return null;

  return (
    <View
      style={[
        styles.sheet,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.divider,
          borderRadius: theme.radius.lg,
          ...theme.shadow.md,
        },
      ]}
    >
      <Text style={[styles.kicker, { color: theme.colors.accentRamp[700] }]}>La hoja</Text>
      {blocks.map((block, blockIndex) => {
        if (block.kind === 'paragraph') {
          return (
            <Text key={`p-${blockIndex}`} style={[styles.paragraph, { color: theme.colors.text }]}>
              {block.text}
            </Text>
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
                  {row.map((cell, cellIndex) => (
                    <Text
                      key={`${rowIndex}-${cellIndex}`}
                      style={[styles.cell, { color: theme.colors.text }]}
                    >
                      {cell}
                    </Text>
                  ))}
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
  kicker: { fontSize: 12, fontWeight: '700' },
  paragraph: { fontSize: 15, lineHeight: 23 },
  table: { borderWidth: 1, minWidth: '100%' },
  tableRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'transparent' },
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
