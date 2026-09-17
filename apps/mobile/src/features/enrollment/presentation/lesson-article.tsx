import {
  ArrowDown,
  Check,
  Lightbulb,
  MessageSquare,
  Quote,
  ShieldAlert,
  Sparkles,
  Table2,
  X,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { breakpoint, useTheme } from '@/core/theme';
import { Icon } from '@/core/ui/icon';
import {
  displayExampleTitle,
  looksLikeExpectedResult,
  parseLessonBody,
  type ExampleKind,
  type LessonBlock,
  type LessonInline,
  type LessonTable,
  type WorkedExample,
} from '@/features/enrollment/domain/lesson-body';

const READABLE_FONT =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/**
 * The written lesson, as an article — not a dump of the body string.
 */
export function LessonArticle({ body }: { body: string }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= breakpoint.compact;
  const blocks = parseLessonBody(body);

  return (
    <View
      style={[
        styles.paper,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.divider,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      {blocks.map((block, index) => (
        <LessonBlockView
          key={`${block.type}-${index}`}
          block={block}
          isLead={index === 0 && block.type === 'paragraph'}
          isWide={isWide}
        />
      ))}
    </View>
  );
}

export function LessonBlockView({
  block,
  isLead,
  isWide,
  size = 'article',
}: {
  block: LessonBlock;
  isLead: boolean;
  isWide: boolean;
  size?: 'article' | 'slide';
}) {
  const theme = useTheme();

  switch (block.type) {
    case 'paragraph':
      return (
        <Text
          style={[
            styles.paragraph,
            isLead ? styles.lead : undefined,
            size === 'slide' ? styles.slideParagraph : undefined,
            { color: isLead ? theme.colors.text : theme.colors.neutral[800] },
          ]}
        >
          <InlineText inlines={block.inlines} />
        </Text>
      );

    case 'quote':
      return (
        <View
          style={[
            styles.quote,
            {
              backgroundColor: theme.colors.neutral[100],
              borderLeftColor: theme.colors.text,
              borderRadius: theme.radius.sm,
            },
          ]}
        >
          <Icon glyph={Quote} size={16} color={theme.colors.neutral[400]} />
          <Text style={[styles.quoteText, { color: theme.colors.text }]}>
            <InlineText inlines={block.inlines} />
          </Text>
        </View>
      );

    case 'callout':
      return (
        <View
          style={[
            styles.rule,
            {
              backgroundColor: theme.colors.accentRamp[100],
              borderRadius: theme.radius.md,
            },
          ]}
        >
          <View style={styles.ruleHead}>
            <Icon glyph={ShieldAlert} size={18} color={theme.colors.accent} />
            <Text style={[styles.ruleKicker, { color: theme.colors.accentRamp[700] }]}>
              Regla práctica
            </Text>
          </View>
          <Text style={[styles.ruleBody, { color: theme.colors.text }]}>
            <InlineText inlines={stripRulePrefix(block.inlines)} />
          </Text>
        </View>
      );

    case 'list':
      return (
        <View style={styles.listBlock}>
          {block.heading ? (
            <Text style={[styles.listHeading, { color: theme.colors.text }]}>{block.heading}</Text>
          ) : null}
          {block.items.map((item, itemIndex) => (
            <View key={`${block.ordered ? 'n' : 'b'}-${itemIndex}`} style={styles.listRow}>
              {block.ordered ? (
                <View style={[styles.stepIndex, { backgroundColor: theme.colors.text }]}>
                  <Text style={styles.stepIndexLabel}>{itemIndex + 1}</Text>
                </View>
              ) : (
                <View style={[styles.bullet, { backgroundColor: theme.colors.accent }]} />
              )}
              <Text style={[styles.listItem, { color: theme.colors.neutral[800] }]}>
                <InlineText inlines={item} />
              </Text>
            </View>
          ))}
        </View>
      );

    case 'contrast':
      return (
        <View style={[styles.contrast, isWide ? styles.contrastWide : undefined]}>
          <ContrastCard
            title={block.serveHeading}
            items={block.serveItems}
            tone="serve"
          />
          <ContrastCard
            title={block.avoidHeading}
            items={block.avoidItems}
            tone="avoid"
          />
        </View>
      );

    case 'example':
      return <ExampleCard example={block.example} />;

    case 'examplePair':
      return (
        <View style={[styles.examplePair, isWide ? styles.examplePairWide : undefined]}>
          <ExampleCard example={block.weak} tone="weak" />
          <ExampleCard example={block.strong} tone="strong" />
        </View>
      );

    case 'promptResult':
      return (
        <View style={styles.promptResult}>
          <ExampleCard example={block.prompt} />
          <View style={styles.resultBridge}>
            <Icon glyph={ArrowDown} size={16} color={theme.colors.accent} />
            <Text style={[styles.resultBridgeLabel, { color: theme.colors.accent }]}>
              Con este prompt esperamos
            </Text>
          </View>
          <ExampleCard example={block.result} tone="result" />
        </View>
      );
  }
}

const EXAMPLE_GLYPH: Record<ExampleKind, LucideIcon> = {
  prompt: MessageSquare,
  output: Sparkles,
  table: Table2,
  artifact: Lightbulb,
};

export function ExampleCard({
  example,
  tone = 'plain',
}: {
  example: WorkedExample;
  tone?: 'plain' | 'weak' | 'strong' | 'result';
}) {
  const theme = useTheme();
  const isResult = tone === 'result' || looksLikeExpectedResult(example.title);
  const kicker =
    tone === 'weak'
      ? 'Veamos qué pasa si pides esto'
      : tone === 'strong'
        ? 'El mismo tema, escrito entero'
        : isResult
          ? 'Con este pedido te sale esto'
          : example.kind === 'prompt'
            ? 'Lo que le pegas'
            : 'Un ejemplo';
  const kickerColor =
    tone === 'weak' ? theme.colors.neutral[700] : theme.colors.accentRamp[700];
  const headBackground =
    tone === 'weak'
      ? theme.colors.neutral[100]
      : isResult
        ? theme.colors.accentRamp[100]
        : theme.colors.neutral[100];

  return (
    <View
      style={[
        styles.example,
        {
          backgroundColor: isResult ? theme.colors.accentRamp[100] : theme.colors.surface,
          borderColor: theme.colors.divider,
          borderRadius: theme.radius.md,
        },
      ]}
    >
      <View style={[styles.exampleHead, { backgroundColor: headBackground }]}>
        <Icon glyph={EXAMPLE_GLYPH[example.kind]} size={16} color={kickerColor} />
        <View style={styles.exampleHeadCopy}>
          <Text style={[styles.exampleKicker, { color: kickerColor }]}>{kicker}</Text>
          <Text style={[styles.exampleTitle, { color: theme.colors.text }]}>
            {displayExampleTitle(example.title)}
          </Text>
        </View>
      </View>
      <View style={styles.exampleBody}>
        {example.inlines.length > 0 ? (
          <Text
            style={[
              example.kind === 'prompt' && !example.table
                ? styles.promptText
                : example.table
                  ? styles.readingPassage
                  : styles.exampleText,
              {
                color: theme.colors.text,
                backgroundColor: example.table ? theme.colors.surface : undefined,
              },
            ]}
          >
            <InlineText inlines={example.inlines} />
          </Text>
        ) : null}
        {example.table ? (
          looksLikeExerciseSheet(example.table) ? (
            <ExerciseSheet table={example.table} />
          ) : (
            <ExampleTable table={example.table} />
          )
        ) : null}
      </View>
    </View>
  );
}

function looksLikeExerciseSheet(table: LessonTable): boolean {
  const headers = table.headers.map((header) => header.toLocaleLowerCase('es')).join(' ');
  return /consigna|ejercicio|pregunta|ítem|item/.test(headers);
}

function answerColumnLabel(table: LessonTable, answerColumn: number): string {
  const header = table.headers[answerColumn]?.toLocaleLowerCase('es') ?? '';
  if (header.includes('contesta')) return '';
  return 'Clave: ';
}

function ExerciseSheet({ table }: { table: LessonTable }) {
  const theme = useTheme();
  const promptColumn = table.headers.findIndex((header) =>
    /consigna|ejercicio|pregunta|ítem|item/.test(header.toLocaleLowerCase('es')),
  );
  const answerColumn = table.headers.findIndex((header) =>
    /respuesta|clave|qué debe|que debe|contesta/.test(header.toLocaleLowerCase('es')),
  );
  const numberColumn = table.headers.findIndex((header) => {
    const normalized = header.toLocaleLowerCase('es').trim();
    return normalized === '#' || normalized === 'n' || normalized === 'nº' || normalized === 'n.º';
  });

  return (
    <View style={styles.sheet}>
      {table.rows.map((row, rowIndex) => {
        const exerciseNumber = numberColumn >= 0 ? row[numberColumn] : String(rowIndex + 1);
        const prompt = row[promptColumn] ?? row[0];
        const answer = answerColumn >= 0 ? row[answerColumn] : null;

        return (
          <View
            key={`${exerciseNumber}-${prompt}`}
            style={[
              styles.sheetItem,
              { borderBottomColor: theme.colors.divider, backgroundColor: theme.colors.surface },
            ]}
          >
            <Text style={[styles.sheetNumber, { color: theme.colors.accent }]}>{exerciseNumber}.</Text>
            <View style={styles.sheetCopy}>
              <Text style={[styles.sheetPrompt, { color: theme.colors.text }]}>{prompt}</Text>
              {answer ? (
                <Text style={[styles.sheetAnswer, { color: theme.colors.neutral[700] }]}>
                  {answerColumnLabel(table, answerColumn)}
                  {answer}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function ExampleTable({ table }: { table: LessonTable }) {
  const theme = useTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.table}>
        <View style={[styles.tableRow, { backgroundColor: theme.colors.neutral[100] }]}>
          {table.headers.map((header) => (
            <Text
              key={header}
              style={[styles.tableHeader, { color: theme.colors.text, width: tableColumnWidth(table) }]}
            >
              {header}
            </Text>
          ))}
        </View>
        {table.rows.map((row, rowIndex) => (
          <View
            key={`${row[0]}-${rowIndex}`}
            style={[
              styles.tableRow,
              {
                borderTopColor: theme.colors.divider,
                backgroundColor: rowIndex % 2 === 0 ? theme.colors.surface : theme.colors.neutral[100],
              },
            ]}
          >
            {row.map((cell, cellIndex) => (
              <Text
                key={`${rowIndex}-${cellIndex}-${cell}`}
                style={[styles.tableCell, { color: theme.colors.neutral[800], width: tableColumnWidth(table) }]}
              >
                {cell}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function tableColumnWidth(table: LessonTable): number {
  return table.headers.length >= 4 ? 160 : table.headers.length === 3 ? 200 : 240;
}

function ContrastCard({
  title,
  items,
  tone,
}: {
  title: string;
  items: LessonInline[][];
  tone: 'serve' | 'avoid';
}) {
  const theme = useTheme();
  const isServe = tone === 'serve';

  return (
    <View
      style={[
        styles.contrastCard,
        {
          backgroundColor: isServe ? theme.colors.accentRamp[100] : theme.colors.neutral[100],
          borderRadius: theme.radius.md,
        },
      ]}
    >
      <View style={styles.contrastHead}>
        <Icon
          glyph={isServe ? Check : X}
          size={16}
          color={isServe ? theme.colors.accent : theme.colors.neutral[700]}
        />
        <Text style={[styles.contrastTitle, { color: theme.colors.text }]}>{title}</Text>
      </View>
      {items.map((item, itemIndex) => (
        <Text
          key={`${tone}-${itemIndex}`}
          style={[styles.contrastItem, { color: theme.colors.neutral[800] }]}
        >
          <InlineText inlines={item} />
        </Text>
      ))}
    </View>
  );
}

function InlineText({ inlines }: { inlines: LessonInline[] }) {
  return (
    <>
      {inlines.map((part, index) => (
        <Text key={`${part.text}-${index}`} style={part.strong ? styles.strong : undefined}>
          {part.text}
        </Text>
      ))}
    </>
  );
}

function stripRulePrefix(inlines: LessonInline[]): LessonInline[] {
  if (inlines.length === 0) return inlines;
  const [first, ...rest] = inlines;
  return [{ ...first, text: first.text.replace(/^Regla(\s+práctica)?:\s*/i, '') }, ...rest];
}

const styles = StyleSheet.create({
  paper: {
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 28,
    gap: 20,
  },
  paragraph: {
    fontFamily: READABLE_FONT,
    fontSize: 17,
    lineHeight: 28,
  },
  lead: {
    fontSize: 19,
    lineHeight: 30,
    fontWeight: '500',
  },
  slideParagraph: {
    fontSize: 26,
    lineHeight: 36,
    fontWeight: '600',
  },
  strong: {
    fontWeight: '700',
  },
  listBlock: {
    gap: 10,
  },
  listHeading: {
    fontFamily: READABLE_FONT,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 2,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bullet: {
    width: 7,
    height: 7,
    marginTop: 10,
    flexShrink: 0,
  },
  stepIndex: {
    width: 22,
    height: 22,
    marginTop: 3,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepIndexLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  listItem: {
    fontFamily: READABLE_FONT,
    flex: 1,
    fontSize: 16,
    lineHeight: 26,
  },
  contrast: {
    gap: 12,
  },
  contrastWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  contrastCard: {
    flex: 1,
    padding: 16,
    gap: 10,
  },
  contrastHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contrastTitle: {
    fontFamily: READABLE_FONT,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  contrastItem: {
    fontFamily: READABLE_FONT,
    fontSize: 15,
    lineHeight: 24,
    paddingLeft: 24,
  },
  quote: {
    borderLeftWidth: 3,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  quoteText: {
    fontFamily: READABLE_FONT,
    fontSize: 16,
    lineHeight: 26,
  },
  rule: {
    padding: 16,
    gap: 8,
  },
  ruleHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleKicker: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  ruleBody: {
    fontFamily: READABLE_FONT,
    fontSize: 16,
    lineHeight: 26,
  },
  promptResult: {
    gap: 10,
  },
  resultBridge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  resultBridgeLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  sheet: {
    gap: 8,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderBottomWidth: 1,
  },
  sheetNumber: {
    fontFamily: READABLE_FONT,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
    minWidth: 22,
  },
  sheetCopy: {
    flex: 1,
    gap: 4,
  },
  sheetPrompt: {
    fontFamily: READABLE_FONT,
    fontSize: 16,
    lineHeight: 24,
  },
  sheetAnswer: {
    fontFamily: READABLE_FONT,
    fontSize: 13,
    lineHeight: 20,
  },
  examplePair: {
    gap: 12,
  },
  examplePairWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  example: {
    flex: 1,
    borderWidth: 1,
    overflow: 'hidden',
  },
  exampleHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  exampleHeadCopy: {
    flex: 1,
    gap: 2,
  },
  exampleKicker: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0,
    textTransform: 'none',
  },
  exampleTitle: {
    fontFamily: READABLE_FONT,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  exampleBody: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 16,
  },
  readingPassage: {
    fontFamily: READABLE_FONT,
    fontSize: 16,
    lineHeight: 26,
    padding: 14,
    borderRadius: 8,
  },
  exampleText: {
    fontFamily: READABLE_FONT,
    fontSize: 16,
    lineHeight: 26,
  },
  promptText: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    fontSize: 14,
    lineHeight: 22,
  },
  table: {
    minWidth: '100%',
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  tableHeader: {
    fontFamily: READABLE_FONT,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tableCell: {
    fontFamily: READABLE_FONT,
    fontSize: 14,
    lineHeight: 22,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
});
