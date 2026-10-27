import { Image, type ImageSource } from 'expo-image';
import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { facingStillForMood, type MascotMood, type MascotMotion } from './mascot-facing-still';

export const MASCOT_NAME = 'Lía';
export type { MascotMood } from './mascot-facing-still';
export type { MascotMotion } from './mascot-facing-still';
export { facingStillForMood } from './mascot-facing-still';

const FACING_STILL: Record<ReturnType<typeof facingStillForMood>, ImageSource> = {
  done: require('../../../assets/mascot/lia-done.png'),
  think: require('../../../assets/mascot/lia-think.png'),
  write: require('../../../assets/mascot/lia-write.png'),
  show: require('../../../assets/mascot/lia-show.png'),
  sad: require('../../../assets/mascot/lia-sad.png'),
  happy: require('../../../assets/mascot/lia-happy.png'),
  angry: require('../../../assets/mascot/lia-angry.png'),
  celebrate: require('../../../assets/mascot/lia-celebrate.png'),
};

const POSE_ASPECT_RATIO = 0.78;

export function stillForMascotMood(mood: MascotMood): ImageSource {
  return FACING_STILL[facingStillForMood(mood)];
}

/** A stable pose with a short, event-driven motion when a scene changes. */
export function MascotGuide({
  line,
  speakingMood = 'talk',
  holdMood,
  size = 132,
  motion = 'none',
  motionKey,
}: {
  line: string;
  lineKey: string;
  speakingMood?: MascotMood;
  doneMood?: MascotMood;
  holdMood?: MascotMood;
  size?: number;
  motion?: MascotMotion;
  motionKey?: string;
  onFinishedSpeaking?: (finishedKey: string) => void;
}) {
  const visibleMood = holdMood ?? speakingMood;
  const reduceMotion = useReducedMotion();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const stopMotion = () => {
      cancelAnimation(x);
      cancelAnimation(y);
      cancelAnimation(rotation);
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };

    stopMotion();
    x.value = 0;
    y.value = 0;
    rotation.value = 0;
    scale.value = 1;
    opacity.value = 1;

    if (reduceMotion || motion === 'none') {
      return stopMotion;
    }

    if (motion === 'celebrate') {
      y.value = withSequence(
        withSpring(-18, { damping: 8, stiffness: 190 }),
        withSpring(0, { damping: 10, stiffness: 180 }),
        withSpring(-11, { damping: 9, stiffness: 180 }),
        withSpring(0, { damping: 11, stiffness: 180 }),
      );
      rotation.value = withSequence(
        withTiming(-8, { duration: 120, easing: Easing.out(Easing.cubic) }),
        withTiming(8, { duration: 150, easing: Easing.inOut(Easing.cubic) }),
        withTiming(-4, { duration: 120, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0, { duration: 140, easing: Easing.out(Easing.cubic) }),
      );
      scale.value = withSequence(
        withSpring(1.07, { damping: 9, stiffness: 180 }),
        withSpring(1, { damping: 12, stiffness: 160 }),
      );
      return stopMotion;
    }

    if (motion === 'shake') {
      x.value = withSequence(
        withTiming(-8, { duration: 65 }),
        withTiming(8, { duration: 75 }),
        withTiming(-5, { duration: 75 }),
        withSpring(0, { damping: 12, stiffness: 180 }),
      );
      rotation.value = withSequence(
        withTiming(-6, { duration: 65 }),
        withTiming(6, { duration: 75 }),
        withTiming(0, { duration: 85 }),
      );
      return stopMotion;
    }

    if (motion === 'write') {
      x.value = withSequence(
        withTiming(-3, { duration: 100, easing: Easing.out(Easing.cubic) }),
        withTiming(3, { duration: 120, easing: Easing.inOut(Easing.cubic) }),
        withSpring(0, { damping: 14, stiffness: 190 }),
      );
      y.value = withSequence(
        withTiming(-2, { duration: 100 }),
        withTiming(1, { duration: 120 }),
        withSpring(0, { damping: 14, stiffness: 190 }),
      );
      return stopMotion;
    }

    if (motion === 'think') {
      rotation.value = withSequence(
        withTiming(5, { duration: 170, easing: Easing.out(Easing.cubic) }),
        withSpring(0, { damping: 13, stiffness: 150 }),
      );
      y.value = withSequence(
        withTiming(-3, { duration: 170, easing: Easing.out(Easing.cubic) }),
        withSpring(0, { damping: 13, stiffness: 150 }),
      );
      return stopMotion;
    }

    if (motion === 'reveal') {
      y.value = withSequence(
        withSpring(-9, { damping: 11, stiffness: 180 }),
        withSpring(0, { damping: 13, stiffness: 170 }),
      );
      scale.value = withSequence(
        withSpring(1.035, { damping: 11, stiffness: 180 }),
        withSpring(1, { damping: 13, stiffness: 170 }),
      );
      return stopMotion;
    }

    if (motion === 'droop') {
      y.value = withSequence(
        withTiming(5, { duration: 190, easing: Easing.out(Easing.cubic) }),
        withTiming(3, { duration: 160, easing: Easing.out(Easing.cubic) }),
      );
      rotation.value = withSequence(
        withTiming(-3, { duration: 190, easing: Easing.out(Easing.cubic) }),
        withTiming(-2, { duration: 160, easing: Easing.out(Easing.cubic) }),
      );
      return stopMotion;
    }

    x.value = motion === 'page-forward' ? 14 : -14;
    opacity.value = 0.55;
    x.value = withSpring(0, { damping: 18, stiffness: 170 });
    opacity.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });

    return stopMotion;
  }, [motion, motionKey, opacity, reduceMotion, rotation, scale, x, y]);

  const motionStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={motion !== 'none' ? motionStyle : undefined}>
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
