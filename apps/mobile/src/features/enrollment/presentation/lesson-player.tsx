import { useEventListener } from 'expo';
import { useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView, type SubtitleTrack } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { pauseLessonVideo, seekLessonVideo, selectLessonSubtitle } from './video-playback';
import { cueAt, formatVideoTime, parseWebVtt, type WebVttCue } from './webvtt';

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
  captionsUrl,
  resumePositionSeconds = 0,
  onPositionChange,
}: {
  url: string;
  captionsUrl?: string | null;
  resumePositionSeconds?: number;
  onPositionChange?: (positionSeconds: number) => void;
}) {
  const theme = useTheme();
  const restored = useRef(false);
  // A link that expired or a file that is not there leaves a silent black box;
  // the teacher needs to know it is the video, not their computer.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const lastSaved = useRef(resumePositionSeconds);
  const [isReady, setIsReady] = useState(false);
  const [showResumeChoice, setShowResumeChoice] = useState(resumePositionSeconds > 4);
  const [cues, setCues] = useState<WebVttCue[]>([]);
  const [caption, setCaption] = useState('');
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const nativeSubtitleTrack = useRef<SubtitleTrack | null>(null);

  const player = useVideoPlayer(url, (instance) => {
    // Not autoplaying. A lesson that starts talking the moment the page opens
    // is a lesson a teacher watches in a staffroom by accident.
    instance.loop = false;
    instance.timeUpdateEventInterval = 0.5;
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
    let active = true;
    if (!captionsUrl) {
      return () => { active = false; };
    }

    void fetch(captionsUrl)
      .then((response) => {
        if (!response.ok) throw new Error('Subtitles unavailable');
        return response.text();
      })
      .then((source) => {
        if (active) setCues(parseWebVtt(source));
      })
      .catch(() => {
        if (active) setCues([]);
      });

    return () => { active = false; };
  }, [captionsUrl]);

  const savePosition = (seconds: number, force = false) => {
    const position = Math.max(0, Math.floor(seconds));
    if (position <= 0 || (!force && Math.abs(position - lastSaved.current) < 4)) return;
    lastSaved.current = position;
    onPositionChange?.(position);
  };

  // Expo Web does not emit `sourceLoad`; `statusChange` is its ready signal.
  // Seeking through expo-video's imperative media handle is an external effect.
  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'error') {
      setFailedUrl(url);
      return;
    }
    if (status !== 'readyToPlay') return;
    setIsReady(true);
    if (restored.current) return;
    restored.current = true;
    if (resumePositionSeconds > 0 && player.duration > 0) {
      const hasPlaceToResume = resumePositionSeconds < player.duration - 5;
      seekLessonVideo(player, hasPlaceToResume
        ? Math.min(resumePositionSeconds, Math.max(0, player.duration - 1))
        : 0);
      setShowResumeChoice(hasPlaceToResume);
    }
  });
  useEventListener(player, 'availableSubtitleTracksChange', ({ availableSubtitleTracks }) => {
    if (Platform.OS === 'web') return;
    const track = availableSubtitleTracks.find((item) => item.language.toLowerCase().startsWith('es'))
      ?? availableSubtitleTracks[0]
      ?? null;
    nativeSubtitleTrack.current = track;
    if (captionsEnabled) selectLessonSubtitle(player, track);
  });
  useEventListener(player, 'subtitleTrackChange', ({ subtitleTrack }) => {
    if (Platform.OS !== 'web') setCaptionsEnabled(Boolean(subtitleTrack));
  });
  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    savePosition(currentTime);
    const nextCaption = captionsEnabled ? cueAt(cues, currentTime) : '';
    setCaption((current) => current === nextCaption ? current : nextCaption);
  });
  useEventListener(player, 'playingChange', ({ isPlaying }) => {
    if (!isPlaying) savePosition(player.currentTime, true);
  });
  useEventListener(player, 'playToEnd', () => savePosition(player.currentTime, true));

  if (failedUrl === url) return <LessonPlayerUnavailable />;

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
      {captionsUrl ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={captionsEnabled ? 'Desactivar subtítulos' : 'Activar subtítulos'}
          accessibilityState={{ checked: captionsEnabled }}
          onPress={() => {
            const nextEnabled = !captionsEnabled;
            setCaptionsEnabled(nextEnabled);
            if (Platform.OS !== 'web') {
              selectLessonSubtitle(player, nextEnabled ? nativeSubtitleTrack.current : null);
            }
          }}
          style={styles.captionToggle}
        >
          <Text style={styles.captionToggleLabel}>{captionsEnabled ? 'CC · Subtítulos' : 'CC · Desactivados'}</Text>
        </Pressable>
      ) : null}
      {Platform.OS === 'web' && captionsEnabled && caption && !showResumeChoice ? (
        <View pointerEvents="none" style={styles.captionBox} accessibilityLiveRegion="polite">
          <Text style={styles.captionText}>{caption}</Text>
        </View>
      ) : null}
      {isReady && showResumeChoice ? (
        <View style={styles.resumeOverlay}>
          <Text style={styles.resumeHeading}>Ya habías empezado este video</Text>
          <Text style={styles.resumeCopy}>Te quedaste en {formatVideoTime(resumePositionSeconds)}.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setShowResumeChoice(false);
              player.play();
            }}
            style={({ pressed }) => [styles.resumePrimary, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={styles.resumePrimaryLabel}>Continuar desde {formatVideoTime(resumePositionSeconds)}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              seekLessonVideo(player, 0);
              lastSaved.current = 0;
              onPositionChange?.(0);
              setShowResumeChoice(false);
              player.play();
            }}
            style={({ pressed }) => [styles.resumeSecondary, { opacity: pressed ? 0.75 : 1 }]}
          >
            <Text style={styles.resumeSecondaryLabel}>Volver al inicio</Text>
          </Pressable>
        </View>
      ) : null}
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
    position: 'relative',
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
  captionToggle: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  captionToggleLabel: { color: '#20242a', fontSize: 12, fontWeight: '700' },
  captionBox: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 42,
    alignItems: 'center',
  },
  captionText: {
    maxWidth: '100%',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(20,23,29,0.84)',
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  resumeOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    backgroundColor: 'rgba(20,23,29,0.82)',
    gap: 10,
  },
  resumeHeading: { color: '#ffffff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  resumeCopy: { color: '#ffffff', fontSize: 15, textAlign: 'center' },
  resumePrimary: {
    minHeight: 44,
    maxWidth: 360,
    width: '100%',
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#1b70fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumePrimaryLabel: { color: '#ffffff', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  resumeSecondary: { paddingHorizontal: 14, paddingVertical: 8 },
  resumeSecondaryLabel: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  placeholder: { alignItems: 'center', justifyContent: 'center', padding: 20.4 },
  placeholderText: { fontSize: 14, textAlign: 'center' },
});
