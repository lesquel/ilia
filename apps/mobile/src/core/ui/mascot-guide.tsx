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

const IDLE_POSE: ImageSource = require('../../../assets/mascot/lia-done.png');
const WRITE_POSE: ImageSource = require('../../../assets/mascot/lia-write.png');

const POSE_ASPECT_RATIO = 0.78;

function poseSourceFor(holdMood?: MascotMood, speakingMood?: MascotMood): ImageSource {
  if (holdMood === 'write' || holdMood === 'think' || speakingMood === 'write') {
    return WRITE_POSE;
  }
  return IDLE_POSE;
}

/**
 * Two stills only. She does not raise a wing: that steals the lesson.
 */
export function MascotGuide({
  line,
  speakingMood = 'talk',
  holdMood,
  size = 132,
}: {
  line: string;
  lineKey: string;
  speakingMood?: MascotMood;
  doneMood?: MascotMood;
  holdMood?: MascotMood;
  size?: number;
  onFinishedSpeaking?: (finishedKey: string) => void;
}) {
  return (
    <Pressable
      accessibilityRole="image"
      accessibilityLabel={`${MASCOT_NAME}. ${line}`}
      style={styles.sticker}
    >
      <Image
        source={poseSourceFor(holdMood, speakingMood)}
        style={{ width: size * POSE_ASPECT_RATIO, height: size }}
        contentFit="contain"
        accessibilityIgnoresInvertColors
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sticker: {
    backgroundColor: 'transparent',
  },
});
