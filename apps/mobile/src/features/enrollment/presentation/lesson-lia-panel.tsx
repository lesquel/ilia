import { Image } from 'expo-image';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { MASCOT_NAME, stillForMascotMood, type MascotMood } from '@/core/ui/mascot-guide';
import type { CourseAccent } from '@/features/catalog';

/** Lía's lines stay dark on the pale wash in either theme. */
const BUBBLE_TEXT = '#111318';

/**
 * Lía beside the scene on a wide screen: her face, then what she has said in
 * this scene as chat bubbles in the course's wash. Phones keep the corner
 * figure; there is no room for a second column there.
 */
export function LessonLiaPanel({
  lines,
  mood,
  accent,
}: {
  lines: readonly string[];
  mood: MascotMood;
  accent: CourseAccent;
}) {
  const theme = useTheme();
  const latest = lines.length - 1;

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.divider,
          borderRadius: theme.radius.lg + 4,
        },
      ]}
      accessibilityLabel={`${MASCOT_NAME}, te acompaña en esta lección`}
    >
      <View style={[styles.header, { borderBottomColor: theme.colors.divider }]}>
        <View style={[styles.avatar, { backgroundColor: accent.wash }]}>
          <Image
            source={stillForMascotMood(mood)}
            style={styles.avatarImage}
            contentFit="contain"
            accessibilityIgnoresInvertColors
          />
        </View>
        <View>
          <Text style={[styles.name, { color: theme.colors.text }]}>{MASCOT_NAME}</Text>
          <Text style={[styles.role, { color: theme.colors.neutral[600] }]}>
            Te acompaña en esta lección
          </Text>
        </View>
      </View>
      <ScrollView style={styles.thread} contentContainerStyle={styles.threadInner}>
        {lines.map((line, index) => (
          <Text
            key={`${index}-${line}`}
            style={[styles.bubble, { backgroundColor: accent.wash, color: BUBBLE_TEXT }]}
            accessibilityLiveRegion={index === latest ? 'polite' : undefined}
          >
            {line}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, minHeight: 0, borderWidth: 1, overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  avatarImage: { width: 44, height: 44 },
  name: { fontSize: 15, fontWeight: '700' },
  role: { fontSize: 12 },
  thread: { flex: 1 },
  threadInner: { padding: 20, gap: 12 },
  bubble: {
    alignSelf: 'flex-start',
    maxWidth: 320,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 4,
    overflow: 'hidden',
    fontSize: 14,
    lineHeight: 21,
  },
});
