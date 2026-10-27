import { useEventListener } from 'expo';
import { useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { pauseLessonVideo } from './video-playback';

/** Same measure as the lesson column, so the picture sits in the middle. */
const CENTERED_PLAYER_MAX_WIDTH = 760;

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
export function LessonPlayer({
  url,
  resumePositionSeconds = 0,
  onPositionChange,
}: {
  url: string;
  resumePositionSeconds?: number;
  onPositionChange?: (positionSeconds: number) => void;
}) {
  const theme = useTheme();
  const restored = useRef(false);
  const lastSaved = useRef(resumePositionSeconds);

  const player = useVideoPlayer(url, (instance) => {
    // Not autoplaying. A lesson that starts talking the moment the page opens
    // is a lesson a teacher watches in a staffroom by accident.
    instance.loop = false;
    instance.timeUpdateEventInterval = 5;
  });

  // The stack keeps this screen mounted after «← Curso». Without this the
  // picture is gone and the audio keeps going.
  useFocusEffect(
    useCallback(() => () => pauseLessonVideo(player), [player]),
  );

  useEffect(() => {
    return () => {
      pauseLessonVideo(player);
    };
  }, [player]);

  useEffect(() => {
    restored.current = false;
    lastSaved.current = resumePositionSeconds;
  }, [resumePositionSeconds, url]);

  const savePosition = (seconds: number, force = false) => {
    const position = Math.max(0, Math.floor(seconds));
    if (position <= 0 || (!force && Math.abs(position - lastSaved.current) < 4)) return;
    lastSaved.current = position;
    onPositionChange?.(position);
  };

  // Expo Web does not emit `sourceLoad`; `statusChange` is its ready signal.
  // Seeking through expo-video's imperative media handle is an external effect.
  // eslint-disable-next-line react-hooks/immutability
  useEventListener(player, 'statusChange', ({ status }) => {
    if (status !== 'readyToPlay') return;
    if (restored.current) return;
    restored.current = true;
    if (resumePositionSeconds > 0 && player.duration > 0) {
      // eslint-disable-next-line react-hooks/immutability
      player.currentTime = Math.min(resumePositionSeconds, Math.max(0, player.duration - 1));
    }
  });
  useEventListener(player, 'timeUpdate', ({ currentTime }) => savePosition(currentTime));
  useEventListener(player, 'playingChange', ({ isPlaying }) => {
    if (!isPlaying) savePosition(player.currentTime, true);
  });
  useEventListener(player, 'playToEnd', () => savePosition(player.currentTime, true));

  return (
    <View
      style={[
        styles.frame,
        {
          borderColor: theme.colors.divider,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.neutral[900],
        },
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
        playsInline
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
    // text below does not jump once it does. Capped and centered: a full
    // window width turns a short clip into the whole screen.
    aspectRatio: 16 / 9,
    width: '100%',
    maxWidth: CENTERED_PLAYER_MAX_WIDTH,
    alignSelf: 'center',
    marginVertical: 6.8,
  },
  video: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', justifyContent: 'center', padding: 20.4 },
  placeholderText: { fontSize: 14, textAlign: 'center' },
});
