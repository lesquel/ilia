import { Check, Quote, ShieldAlert, X } from 'lucide-react-native';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { breakpoint, useTheme } from '@/core/theme';
import { Icon } from '@/core/ui/icon';
import {
  parseLessonBody,
  type LessonBlock,
  type LessonInline,
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

function LessonBlockView({
  block,
  isLead,
  isWide,
}: {
  block: LessonBlock;
  isLead: boolean;
  isWide: boolean;
}) {
  const theme = useTheme();

  switch (block.type) {
    case 'paragraph':
      return (
        <Text
          style={[
            styles.paragraph,
            isLead ? styles.lead : undefined,
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
  }
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
});
