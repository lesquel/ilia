import { Image, type ImageSource } from 'expo-image';
import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

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
  animated = false,
}: {
  line: string;
  lineKey: string;
  speakingMood?: MascotMood;
  doneMood?: MascotMood;
  holdMood?: MascotMood;
  size?: number;
  animated?: boolean;
  onFinishedSpeaking?: (finishedKey: string) => void;
}) {
  const visibleMood = holdMood ?? speakingMood;
  const reduceMotion = useReducedMotion();
  const bob = useSharedValue(0);

  useEffect(() => {
    if (!animated || reduceMotion) {
      bob.value = 0;
      return;
    }
    bob.value = withRepeat(
      withTiming(-3, { duration: 1450, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => {
      bob.value = 0;
    };
  }, [animated, bob, reduceMotion]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value }],
  }));

  return (
    <Animated.View style={animated ? floatStyle : undefined}>
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sticker: {
    backgroundColor: 'transparent',
  },
});
