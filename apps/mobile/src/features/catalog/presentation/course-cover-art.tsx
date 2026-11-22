import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/theme';
import {
  type CourseCoverCraft,
  type CourseCoverTone,
} from '@/features/catalog/presentation/course-cover-craft';
import { coverSceneForCourseSlug } from '@/features/catalog/presentation/course-covers';

/**
 * A desk, not a portrait. Lía is in the middle of the work of that course.
 */
export function CourseCoverArt({
  courseSlug,
  overlay,
}: {
  courseSlug: string;
  overlay?: ReactNode;
}) {
  const theme = useTheme();
  const scene = coverSceneForCourseSlug(courseSlug);
  // A course without its own scene keeps the brand blue.
  const tone: CourseCoverTone = scene?.tone ?? {
    wash: theme.colors.accentRamp[100],
    mid: theme.colors.accentRamp[200],
    ink: theme.colors.accent,
  };

  return (
    // Every cover is the same desk at the same height, so a row of cards lines
    // up. A course without its own scene still gets paper on it: an empty
    // tabletop reads as a broken image.
    <View style={[styles.cover, { backgroundColor: tone.wash }]}>
      <View
        style={[
          styles.tabletop,
          {
            backgroundColor: theme.colors.bg,
            borderColor: tone.mid,
          },
        ]}
        accessibilityElementsHidden
      >
        <View style={[styles.tableEdge, { backgroundColor: tone.ink }]} />
      </View>
      {scene ? null : <BareSheets tone={tone} />}
      {scene ? (
        <View style={styles.desk} accessibilityElementsHidden>
          <CraftStage craft={scene.craft} tone={tone} />
          <Image
            source={scene.still}
            style={styles.lia}
            contentFit="contain"
            accessibilityIgnoresInvertColors
          />
        </View>
      ) : null}
      {overlay ? <View style={styles.overlay}>{overlay}</View> : null}
    </View>
  );
}

/**
 * Paper on the desk and nobody at it: the same sheets the scenes use, without
 * claiming a craft the course was never given.
 */
function BareSheets({ tone }: { tone: CourseCoverTone }) {
  const theme = useTheme();

  return (
    <View style={styles.bareSheets} accessibilityElementsHidden>
      <View
        style={[
          styles.bareSheet,
          styles.bareSheetBack,
          {
            backgroundColor: tone.mid,
            borderColor: tone.mid,
          },
        ]}
      />
      <View
        style={[
          styles.bareSheet,
          styles.bareSheetFront,
          {
            backgroundColor: theme.colors.surface,
            borderColor: tone.mid,
          },
        ]}
      >
        <View style={[styles.signalSquare, { backgroundColor: tone.ink }]} />
        <View style={[styles.inkLine, { backgroundColor: tone.mid }]} />
        <View style={[styles.inkLine, { backgroundColor: tone.mid, width: '82%' }]} />
        <View
          style={[styles.inkLine, { backgroundColor: theme.colors.neutral[300], width: '64%' }]}
        />
      </View>
    </View>
  );
}

function CraftStage({ craft, tone }: { craft: CourseCoverCraft; tone: CourseCoverTone }) {
  const theme = useTheme();

  if (craft === 'writing-prompt') {
    return (
      <View style={styles.promptDesk}>
        <View
          style={[
            styles.promptBack,
            {
              backgroundColor: theme.colors.neutral[200],
              borderColor: theme.colors.neutral[400],
            },
          ]}
        />
        <View
          style={[
            styles.promptSheet,
            {
              backgroundColor: theme.colors.surface,
              borderColor: tone.mid,
            },
          ]}
        >
          <View style={[styles.signalSquare, { backgroundColor: tone.ink }]} />
          <View style={[styles.inkLine, { backgroundColor: tone.mid }]} />
          <View style={[styles.inkLine, { backgroundColor: tone.mid, width: '92%' }]} />
          <View style={[styles.inkLine, { backgroundColor: tone.mid, width: '78%' }]} />
          <View
            style={[styles.inkLine, { backgroundColor: theme.colors.neutral[300], width: '84%' }]}
          />
          <View
            style={[styles.inkLine, { backgroundColor: theme.colors.neutral[300], width: '61%' }]}
          />
          <View
            style={[styles.inkLine, { backgroundColor: theme.colors.neutral[300], width: '40%' }]}
          />
        </View>
      </View>
    );
  }

  if (craft === 'showing-chapter') {
    return (
      <View style={styles.chapterDesk}>
        <View
          style={[
            styles.chapterLeaf,
            styles.chapterBack,
            {
              backgroundColor: theme.colors.neutral[300],
              borderColor: theme.colors.neutral[400],
            },
          ]}
        />
        <View
          style={[
            styles.chapterLeaf,
            styles.chapterMid,
            {
              backgroundColor: theme.colors.neutral[100],
              borderColor: theme.colors.neutral[400],
            },
          ]}
        />
        <View
          style={[
            styles.chapterLeaf,
            styles.chapterFront,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.divider,
            },
          ]}
        >
          <View style={[styles.signalSquare, { backgroundColor: tone.ink }]} />
          <View style={[styles.inkLine, { backgroundColor: theme.colors.neutral[300] }]} />
          <View
            style={[styles.inkLine, { backgroundColor: theme.colors.neutral[300], width: '88%' }]}
          />
          <View
            style={[styles.inkLine, { backgroundColor: theme.colors.neutral[300], width: '70%' }]}
          />
          <View
            style={[styles.inkLine, { backgroundColor: theme.colors.neutral[300], width: '54%' }]}
          />
        </View>
      </View>
    );
  }

  if (craft === 'prompt-before-after') {
    // The vague request crossed out behind, the precise one in front.
    return (
      <View style={styles.pairDesk}>
        <View
          style={[
            styles.pairCard,
            styles.pairBack,
            { backgroundColor: theme.colors.neutral[100], borderColor: theme.colors.neutral[300] },
          ]}
        >
          <View
            style={[styles.inkLine, { backgroundColor: theme.colors.neutral[300], width: '58%' }]}
          />
          <View style={[styles.strike, { backgroundColor: tone.ink }]} />
        </View>
        <View
          style={[
            styles.pairCard,
            styles.pairFront,
            { backgroundColor: theme.colors.surface, borderColor: tone.mid },
          ]}
        >
          <View style={[styles.inkLine, { backgroundColor: tone.mid }]} />
          <View style={[styles.inkLine, { backgroundColor: tone.mid, width: '88%' }]} />
          <View
            style={[styles.inkLine, { backgroundColor: theme.colors.neutral[300], width: '94%' }]}
          />
          <View
            style={[styles.inkLine, { backgroundColor: theme.colors.neutral[300], width: '72%' }]}
          />
          <View
            style={[styles.inkLine, { backgroundColor: theme.colors.neutral[300], width: '80%' }]}
          />
          <View style={[styles.pairTick, { backgroundColor: tone.ink }]} />
        </View>
      </View>
    );
  }

  if (craft === 'notebook-sources') {
    // A bound notebook with its sources tabbed along the top.
    return (
      <View style={styles.notebookDesk}>
        <View style={styles.notebookTabs}>
          <View style={[styles.notebookTab, { backgroundColor: tone.ink }]} />
          <View style={[styles.notebookTab, { backgroundColor: tone.mid }]} />
          <View style={[styles.notebookTab, { backgroundColor: theme.colors.neutral[300] }]} />
        </View>
        <View
          style={[
            styles.notebook,
            { backgroundColor: theme.colors.surface, borderColor: tone.mid },
          ]}
        >
          <View
            style={[styles.notebookSpine, { backgroundColor: tone.wash, borderColor: tone.mid }]}
          >
            {[0, 1, 2, 3, 4].map((ring) => (
              <View key={ring} style={[styles.notebookRing, { backgroundColor: tone.ink }]} />
            ))}
          </View>
          <View style={styles.notebookPage}>
            <View style={[styles.inkLine, { backgroundColor: tone.mid, width: '70%' }]} />
            <View style={[styles.inkLine, { backgroundColor: theme.colors.neutral[300] }]} />
            <View
              style={[styles.inkLine, { backgroundColor: theme.colors.neutral[300], width: '86%' }]}
            />
            <View
              style={[styles.inkLine, { backgroundColor: theme.colors.neutral[300], width: '64%' }]}
            />
            <View
              style={[styles.inkLine, { backgroundColor: theme.colors.neutral[300], width: '78%' }]}
            />
          </View>
        </View>
      </View>
    );
  }

  if (craft === 'chat-exchange') {
    // A teacher's request on the right, the model's reply on the left.
    return (
      <View
        style={[
          styles.chatCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: tone.mid,
          },
        ]}
      >
        <View style={[styles.chatAsk, { backgroundColor: tone.wash }]}>
          <View style={[styles.inkLine, { backgroundColor: tone.mid }]} />
          <View style={[styles.inkLine, { backgroundColor: tone.mid, width: '70%' }]} />
        </View>
        <View style={[styles.chatReply, { backgroundColor: theme.colors.neutral[100] }]}>
          <View style={[styles.signalSquare, { backgroundColor: tone.ink }]} />
          <View style={[styles.inkLine, { backgroundColor: theme.colors.neutral[300] }]} />
          <View
            style={[styles.inkLine, { backgroundColor: theme.colors.neutral[300], width: '86%' }]}
          />
          <View
            style={[styles.inkLine, { backgroundColor: theme.colors.neutral[300], width: '58%' }]}
          />
        </View>
        <View style={[styles.chatInput, { borderColor: tone.mid }]} />
      </View>
    );
  }

  if (craft === 'cited-source') {
    // The source page with the cited sentence marked, and its citation chips.
    return (
      <View
        style={[
          styles.sourcePage,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.divider,
          },
        ]}
      >
        <View style={[styles.inkLine, { backgroundColor: theme.colors.neutral[300] }]} />
        <View
          style={[styles.inkLine, { backgroundColor: theme.colors.neutral[300], width: '90%' }]}
        />
        <View
          style={[
            styles.citedLine,
            {
              backgroundColor: tone.wash,
              borderLeftColor: tone.ink,
            },
          ]}
        >
          <View style={[styles.inkLine, { backgroundColor: tone.mid }]} />
          <View style={[styles.inkLine, { backgroundColor: tone.mid, width: '76%' }]} />
        </View>
        <View
          style={[styles.inkLine, { backgroundColor: theme.colors.neutral[300], width: '82%' }]}
        />
        <View style={styles.citeRow}>
          <View style={[styles.citeChip, { backgroundColor: theme.colors.neutral[200] }]} />
          <View style={[styles.citeChip, { backgroundColor: tone.ink }]} />
        </View>
      </View>
    );
  }

  if (craft === 'quiz-question') {
    // One multiple-choice question with its answer key marked.
    return (
      <View
        style={[
          styles.quizCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: tone.mid,
          },
        ]}
      >
        <View style={[styles.quizTop, { backgroundColor: tone.ink }]} />
        <View
          style={[styles.inkLine, { backgroundColor: theme.colors.neutral[300], width: '88%' }]}
        />
        {[false, true, false, false].map((correct, index) => (
          <View
            key={index}
            style={[styles.quizOption, correct ? { backgroundColor: tone.wash } : null]}
          >
            <View
              style={[
                styles.quizRadio,
                {
                  borderColor: correct ? tone.ink : theme.colors.neutral[400],
                  backgroundColor: correct ? tone.ink : 'transparent',
                },
              ]}
            />
            <View
              style={[
                styles.rubricLine,
                {
                  backgroundColor: correct ? tone.mid : theme.colors.neutral[300],
                },
              ]}
            />
          </View>
        ))}
      </View>
    );
  }

  if (craft === 'three-part-slide') {
    // A projected slide in three bands: topic, main idea, detail.
    const bands = [tone.wash, tone.mid, theme.colors.neutral[200]];
    return (
      <View
        style={[
          styles.slide,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.divider,
          },
        ]}
      >
        {bands.map((band, index) => (
          <View key={index} style={[styles.slideBand, { backgroundColor: band }]}>
            <View style={[styles.slideTitle, { backgroundColor: tone.ink }]} />
            <View
              style={[styles.inkLine, { backgroundColor: theme.colors.surface, width: '72%' }]}
            />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.rubricSheet,
        {
          backgroundColor: theme.colors.surface,
          borderColor: tone.mid,
        },
      ]}
    >
      <View style={styles.rubricHead}>
        <View style={[styles.signalSquare, { backgroundColor: tone.ink }]} />
        <View style={[styles.inkLine, { backgroundColor: tone.mid, width: 72 }]} />
      </View>
      <RubricRow filled tone={tone} />
      <RubricRow filled tone={tone} />
      <RubricRow filled tone={tone} />
      <RubricRow filled={false} tone={tone} />
    </View>
  );
}

function RubricRow({ filled, tone }: { filled: boolean; tone: CourseCoverTone }) {
  const theme = useTheme();

  return (
    <View style={styles.rubricRow}>
      <View
        style={[
          styles.rubricMark,
          {
            backgroundColor: filled ? tone.ink : theme.colors.neutral[200],
          },
        ]}
      />
      <View
        style={[
          styles.rubricLine,
          {
            backgroundColor: filled ? tone.mid : theme.colors.neutral[300],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    minHeight: 268,
    overflow: 'hidden',
    position: 'relative',
  },
  bareSheets: {
    position: 'absolute',
    right: 44,
    bottom: 52,
    width: 150,
    height: 162,
  },
  bareSheet: {
    position: 'absolute',
    width: 128,
    height: 150,
    borderWidth: 1,
    borderRadius: 8,
  },
  bareSheetBack: {
    left: 0,
    top: 6,
    transform: [{ rotate: '-9deg' }],
  },
  bareSheetFront: {
    left: 18,
    top: 0,
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 8,
    transform: [{ rotate: '4deg' }],
  },
  tabletop: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 92,
    borderTopWidth: 1,
  },
  tableEdge: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -2,
    height: 3,
  },
  desk: {
    position: 'absolute',
    left: '18%',
    right: 0,
    bottom: 0,
    top: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  lia: {
    width: 156,
    height: 208,
    marginRight: 4,
    marginBottom: 44,
    zIndex: 2,
  },
  overlay: {
    paddingHorizontal: 20.4,
    paddingVertical: 16,
    zIndex: 3,
  },
  promptDesk: {
    width: 168,
    height: 196,
    marginRight: -36,
    marginBottom: 52,
    zIndex: 1,
  },
  promptBack: {
    position: 'absolute',
    left: 0,
    top: 8,
    width: 118,
    height: 150,
    borderWidth: 1,
    borderRadius: 8,
    transform: [{ rotate: '-11deg' }],
  },
  promptSheet: {
    position: 'absolute',
    left: 22,
    top: 18,
    width: 138,
    height: 168,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 8,
    transform: [{ rotate: '-4deg' }],
  },
  inkLine: {
    height: 6,
    borderRadius: 3,
    width: '100%',
  },
  signalSquare: {
    width: 12,
    height: 12,
    marginBottom: 4,
  },
  chapterDesk: {
    width: 168,
    height: 188,
    marginRight: -28,
    marginBottom: 50,
    zIndex: 1,
  },
  chapterLeaf: {
    position: 'absolute',
    height: 132,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 7,
  },
  chapterBack: {
    top: 0,
    left: 0,
    width: 108,
    transform: [{ rotate: '-14deg' }],
  },
  chapterMid: {
    top: 18,
    left: 36,
    width: 118,
    transform: [{ rotate: '8deg' }],
  },
  chapterFront: {
    top: 42,
    left: 14,
    width: 132,
  },
  rubricSheet: {
    width: 148,
    height: 176,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 10,
    marginRight: -22,
    marginBottom: 54,
    transform: [{ rotate: '3deg' }],
    zIndex: 1,
  },
  rubricHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  rubricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rubricMark: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  rubricLine: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  pairDesk: {
    width: 170,
    height: 196,
    marginRight: -34,
    marginBottom: 50,
  },
  pairCard: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 9,
  },
  pairBack: {
    left: 0,
    top: 0,
    width: 120,
    height: 70,
    justifyContent: 'center',
    transform: [{ rotate: '-7deg' }],
  },
  pairFront: {
    left: 26,
    top: 50,
    width: 140,
    height: 140,
    transform: [{ rotate: '3deg' }],
  },
  strike: {
    position: 'absolute',
    left: 8,
    right: 30,
    top: 33,
    height: 3,
    borderRadius: 2,
  },
  pairTick: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 14,
    height: 14,
  },
  notebookDesk: {
    width: 142,
    height: 184,
    marginRight: -8,
    marginBottom: 50,
    transform: [{ rotate: '-4deg' }],
  },
  notebookTabs: {
    flexDirection: 'row',
    gap: 6,
    paddingLeft: 40,
    marginBottom: -4,
  },
  notebookTab: {
    width: 26,
    height: 18,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  notebook: {
    flex: 1,
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  notebookSpine: {
    width: 26,
    borderRightWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  notebookRing: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notebookPage: {
    flex: 1,
    padding: 12,
    gap: 9,
  },
  chatCard: {
    width: 156,
    height: 180,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 8,
    marginRight: -26,
    marginBottom: 52,
    transform: [{ rotate: '-3deg' }],
    zIndex: 1,
  },
  chatAsk: {
    alignSelf: 'flex-end',
    width: '74%',
    borderRadius: 8,
    padding: 8,
    gap: 6,
  },
  chatReply: {
    alignSelf: 'flex-start',
    width: '86%',
    borderRadius: 8,
    padding: 8,
    gap: 6,
  },
  chatInput: {
    marginTop: 'auto',
    height: 16,
    borderWidth: 1,
    borderRadius: 8,
  },
  sourcePage: {
    width: 142,
    height: 176,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 8,
    marginRight: -24,
    marginBottom: 52,
    transform: [{ rotate: '3deg' }],
    zIndex: 1,
  },
  citedLine: {
    borderLeftWidth: 3,
    borderRadius: 3,
    paddingVertical: 5,
    paddingHorizontal: 6,
    gap: 5,
  },
  citeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  citeChip: {
    width: 18,
    height: 12,
    borderRadius: 6,
  },
  quizCard: {
    width: 146,
    height: 178,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
    marginRight: -22,
    marginBottom: 52,
    transform: [{ rotate: '-2deg' }],
    zIndex: 1,
  },
  quizTop: {
    height: 8,
    marginHorizontal: -12,
    marginBottom: 6,
  },
  quizOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  quizRadio: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  slide: {
    width: 176,
    height: 124,
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    gap: 6,
    marginRight: -30,
    marginBottom: 76,
    transform: [{ rotate: '-2deg' }],
    zIndex: 1,
  },
  slideBand: {
    flex: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    justifyContent: 'center',
    gap: 4,
  },
  slideTitle: {
    width: 34,
    height: 5,
    borderRadius: 3,
  },
});
