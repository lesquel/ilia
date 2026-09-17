import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { type CourseCoverCraft } from '@/features/catalog/presentation/course-cover-craft';
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

  return (
    <View style={[styles.cover, { backgroundColor: theme.colors.accentRamp[100] }]}>
      <View
        style={[
          styles.tabletop,
          {
            backgroundColor: theme.colors.bg,
            borderColor: theme.colors.accentRamp[200],
          },
        ]}
        accessibilityElementsHidden
      >
        <View style={[styles.tableEdge, { backgroundColor: theme.colors.accent }]} />
      </View>
      {scene ? (
        <View style={styles.desk} accessibilityElementsHidden>
          <CraftStage craft={scene.craft} />
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

function CraftStage({ craft }: { craft: CourseCoverCraft }) {
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
              borderColor: theme.colors.accentRamp[200],
            },
          ]}
        >
          <View style={[styles.signalSquare, { backgroundColor: theme.colors.accent }]} />
          <View style={[styles.inkLine, { backgroundColor: theme.colors.accentRamp[200] }]} />
          <View
            style={[styles.inkLine, { backgroundColor: theme.colors.accentRamp[200], width: '92%' }]}
          />
          <View
            style={[styles.inkLine, { backgroundColor: theme.colors.accentRamp[200], width: '78%' }]}
          />
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
            { backgroundColor: theme.colors.neutral[300], borderColor: theme.colors.neutral[400] },
          ]}
        />
        <View
          style={[
            styles.chapterLeaf,
            styles.chapterMid,
            { backgroundColor: theme.colors.neutral[100], borderColor: theme.colors.neutral[400] },
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
          <View style={[styles.signalSquare, { backgroundColor: theme.colors.accent }]} />
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

  return (
    <View
      style={[
        styles.rubricSheet,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.accentRamp[200],
        },
      ]}
    >
      <View style={styles.rubricHead}>
        <View style={[styles.signalSquare, { backgroundColor: theme.colors.accent }]} />
        <View
          style={[styles.inkLine, { backgroundColor: theme.colors.accentRamp[200], width: 72 }]}
        />
      </View>
      <RubricRow filled />
      <RubricRow filled />
      <RubricRow filled />
      <RubricRow filled={false} />
    </View>
  );
}

function RubricRow({ filled }: { filled: boolean }) {
  const theme = useTheme();

  return (
    <View style={styles.rubricRow}>
      <View
        style={[
          styles.rubricMark,
          {
            backgroundColor: filled ? theme.colors.accent : theme.colors.neutral[200],
          },
        ]}
      />
      <View
        style={[
          styles.rubricLine,
          {
            backgroundColor: filled ? theme.colors.accentRamp[200] : theme.colors.neutral[300],
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
    width: 168,
    height: 224,
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
});
