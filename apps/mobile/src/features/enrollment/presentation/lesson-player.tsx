import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';

/**
 * The lesson's media.
 *
 * `expo-video` rather than a web-only `<video>` behind a platform split: the
 * native half would be code I could not test on a device, and a guess shipped
 * as a player is worse than one library covering both.
 *
 * The URL is short-lived and comes from the API, which mints it only after
 * checking the enrolment. Nothing here builds a storage path.
 */
export function LessonPlayer({ url }: { url: string }) {
  const theme = useTheme();

  const player = useVideoPlayer(url, (instance) => {
    // Not autoplaying. A lesson that starts talking the moment the page opens
    // is a lesson a teacher watches in a staffroom by accident.
    instance.loop = false;
  });

  return (
    <View
      style={[
        styles.frame,
        { borderColor: theme.colors.divider, borderRadius: theme.radius.md },
      ]}
    >
      <VideoView
        player={player}
        style={styles.video}
        // Both on purpose: the controls are how you rewind the part you missed,
        // and full screen is how you show it on a classroom projector.
        nativeControls
        fullscreenOptions={{ enable: true }}
        contentFit="contain"
      />
    </View>
  );
}

/** Shown when a lesson points at media the storage could not resolve. */
export function LessonPlayerUnavailable() {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.frame,
        styles.placeholder,
        { borderColor: theme.colors.divider, borderRadius: theme.radius.md },
      ]}
    >
      <Text style={[styles.placeholderText, { color: theme.colors.neutral[600] }]}>
        No pudimos cargar el material de esta lección. Prueba recargar la página.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: 1,
    overflow: 'hidden',
    // 16:9, so the frame reserves its space before the video loads and the
    // text below does not jump once it does.
    aspectRatio: 16 / 9,
    width: '100%',
    marginVertical: 6.8,
  },
  video: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', justifyContent: 'center', padding: 20.4 },
  placeholderText: { fontSize: 14, textAlign: 'center' },
});
