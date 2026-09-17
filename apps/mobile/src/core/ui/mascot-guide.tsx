import { Image, type ImageSource } from 'expo-image';
import { Pressable, StyleSheet } from 'react-native';

import { facingStillForMood, type MascotMood } from './mascot-facing-still';

export const MASCOT_NAME = 'Lía';
export type { MascotMood } from './mascot-facing-still';
export { facingStillForMood } from './mascot-facing-still';

const FACING_STILL: Record<ReturnType<typeof facingStillForMood>, ImageSource> = {
  done: require('../../../assets/mascot/lia-done.png'),
  think: require('../../../assets/mascot/lia-think.png'),
  write: require('../../../assets/mascot/lia-write.png'),
  show: require('../../../assets/mascot/lia-show.png'),
};

const POSE_ASPECT_RATIO = 0.78;

export function stillForMascotMood(mood: MascotMood): ImageSource {
  return FACING_STILL[facingStillForMood(mood)];
}

/**
 * One still. The next still only when the mood changes. No turn, no cycle.
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
  const visibleMood = holdMood ?? speakingMood;

  return (
    <Pressable
      accessibilityRole="image"
      accessibilityLabel={`${MASCOT_NAME}. ${line}`}
      style={styles.sticker}
    >
      <Image
        source={stillForMascotMood(visibleMood)}
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
