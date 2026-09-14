import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Image } from 'expo-image';

import { INSTITUTE_FULL_NAME, INSTITUTE_SHORT_NAME } from '@/core/brand';

const monogramInk = require('../../../assets/brand/ilia-monogram-ink.png');
const wordmark = require('../../../assets/brand/ilia-wordmark.png');

const MONOGRAM_ASPECT = 462 / 355;
const WORDMARK_ASPECT = 502 / 83;

/** Official square sits at this fraction of the monogram box. */
const SIGNAL_LEFT = 298 / 462;
const SIGNAL_TOP = 5 / 355;
const SIGNAL_SIZE = 39 / 462;

/**
 * Official mark assembled from its own layers so the name is not printed
 * twice, and the blue square can land instead of arriving already glued on.
 */
export function BrandReveal({
  height = 220,
  showName = true,
}: {
  height?: number;
  showName?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const signalScale = useSharedValue(reduceMotion ? 1 : 0);
  const underlineWidth = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;

    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (cancelled || enabled) return;
      signalScale.value = withDelay(
        420,
        withSequence(
          withTiming(1, { duration: 380, easing: Easing.out(Easing.back(1.4)) }),
          withRepeat(
            withSequence(
              withTiming(1.12, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
              withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
            ),
            -1,
            false,
          ),
        ),
      );
      underlineWidth.value = withDelay(720, withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) }));
    });

    return () => {
      cancelled = true;
    };
  }, [reduceMotion, signalScale, underlineWidth]);

  const monogramWidth = height * MONOGRAM_ASPECT;
  const signal = monogramWidth * SIGNAL_SIZE;

  const signalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: signalScale.value }],
  }));
  const ruleStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: reduceMotion ? 1 : underlineWidth.value }],
  }));

  const mark = (
    <View
      style={[styles.monogramBox, { height, width: monogramWidth }]}
      accessibilityElementsHidden
    >
      <Image source={monogramInk} style={StyleSheet.absoluteFill} contentFit="contain" />
      <Animated.View
        style={[
          styles.signal,
          {
            left: monogramWidth * SIGNAL_LEFT,
            top: height * SIGNAL_TOP,
            width: signal,
            height: signal,
          },
          signalStyle,
        ]}
      />
    </View>
  );

  return (
    <View
      style={[styles.stack, height < 140 ? styles.stackCompact : undefined]}
      accessibilityRole="image"
      accessibilityLabel={`${INSTITUTE_SHORT_NAME}, ${INSTITUTE_FULL_NAME}`}
    >
      {reduceMotion ? (
        mark
      ) : (
        <Animated.View entering={FadeIn.duration(420)}>{mark}</Animated.View>
      )}

      <Image
        source={wordmark}
        style={{ width: monogramWidth, height: monogramWidth / WORDMARK_ASPECT }}
        contentFit="contain"
      />

      <Animated.View style={[styles.rule, { width: monogramWidth * 0.28 }, ruleStyle]} />

      {showName ? (
        <Text style={styles.instituteName} accessibilityRole="text">
          Instituto Latinoamericano{'\n'}de Inteligencia Artificial
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    alignItems: 'center',
    gap: 28,
  },
  stackCompact: {
    gap: 12,
  },
  monogramBox: {
    position: 'relative',
  },
  signal: {
    position: 'absolute',
    backgroundColor: '#1b70fe',
  },
  rule: {
    height: 2,
    backgroundColor: '#1b70fe',
    alignSelf: 'center',
  },
  instituteName: {
    color: '#111111',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    lineHeight: 16,
    textAlign: 'center',
    textTransform: 'uppercase',
    maxWidth: 280,
  },
});
