import { useEffect, useRef, useState } from 'react';
import { Image, type ImageSource } from 'expo-image';
import { Pressable, StyleSheet } from 'react-native';

export const MASCOT_NAME = 'Lía';

export type MascotMood =
  | 'explain'
  | 'write'
  | 'think'
  | 'show'
  | 'talk'
  | 'done'
  | 'listen';

const MASCOT_POSE: Record<MascotMood, ImageSource> = {
  explain: require('../../../assets/mascot/lia-explain.png'),
  write: require('../../../assets/mascot/lia-write.png'),
  think: require('../../../assets/mascot/lia-think.png'),
  show: require('../../../assets/mascot/lia-show.png'),
  talk: require('../../../assets/mascot/lia-talk.png'),
  done: require('../../../assets/mascot/lia-done.png'),
  listen: require('../../../assets/mascot/lia-listen.png'),
};

/** One calm raise, then she settles. Not a loop. */
const TALK_CYCLE: ImageSource[] = [
  require('../../../assets/mascot/lia-done.png'),
  require('../../../assets/mascot/lia-talk-2.png'),
  require('../../../assets/mascot/lia-talk-3.png'),
  require('../../../assets/mascot/lia-talk-4.png'),
];

const POSE_ASPECT_RATIO = 0.78;
const TALK_FRAME_MS = 200;

/**
 * Lía stays Lía. The course costume lives on the catalog cover, not here.
 */
export function MascotGuide({
  line,
  lineKey,
  speakingMood = 'talk',
  doneMood = 'done',
  holdMood,
  size = 132,
  onFinishedSpeaking,
}: {
  line: string;
  lineKey: string;
  speakingMood?: MascotMood;
  doneMood?: MascotMood;
  holdMood?: MascotMood;
  size?: number;
  onFinishedSpeaking?: (finishedKey: string) => void;
}) {
  const talkFrameIndex = useTalkOnce(lineKey, Boolean(holdMood) || speakingMood === 'write');
  const hasFinishedTalking = talkFrameIndex >= TALK_CYCLE.length - 1;
  const poseSource = holdMood
    ? MASCOT_POSE[holdMood]
    : speakingMood === 'write'
      ? MASCOT_POSE.write
      : hasFinishedTalking
        ? MASCOT_POSE[doneMood]
        : TALK_CYCLE[talkFrameIndex];

  const announcedKey = useRef<string | null>(null);
  useEffect(() => {
    if (!hasFinishedTalking && !holdMood && speakingMood !== 'write') {
      announcedKey.current = null;
      return;
    }
    if (announcedKey.current === lineKey) return;
    announcedKey.current = lineKey;
    onFinishedSpeaking?.(lineKey);
  }, [hasFinishedTalking, holdMood, speakingMood, lineKey, onFinishedSpeaking]);

  return (
    <Pressable
      accessibilityRole="image"
      accessibilityLabel={`${MASCOT_NAME}. ${line}`}
      style={styles.sticker}
    >
      <Image
        source={poseSource}
        style={{ width: size * POSE_ASPECT_RATIO, height: size }}
        contentFit="contain"
        accessibilityIgnoresInvertColors
      />
    </Pressable>
  );
}

function useTalkOnce(lineKey: string, shouldHoldStill: boolean): number {
  const [frameIndex, setFrameIndex] = useState(shouldHoldStill ? TALK_CYCLE.length - 1 : 0);

  useEffect(() => {
    if (shouldHoldStill) {
      setFrameIndex(TALK_CYCLE.length - 1);
      return;
    }
    setFrameIndex(0);
    const intervalId = setInterval(() => {
      setFrameIndex((current) => {
        if (current >= TALK_CYCLE.length - 1) return current;
        return current + 1;
      });
    }, TALK_FRAME_MS);
    return () => clearInterval(intervalId);
  }, [lineKey, shouldHoldStill]);

  return frameIndex;
}

const styles = StyleSheet.create({
  sticker: {
    backgroundColor: 'transparent',
  },
});
