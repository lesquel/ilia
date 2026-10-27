import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Check, RotateCcw } from 'lucide-react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { breakpoint, useTheme } from '@/core/theme';
import { Icon } from '@/core/ui/icon';
import { MascotGuide } from '@/core/ui/mascot-guide';
import { quizFeedbackDelay, quizMascotReaction } from '@/features/enrollment/domain/lesson-motion';

interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

interface QuizContent {
  version: 1;
  passPercent: number;
  questions: QuizQuestion[];
}

function parseQuiz(body: string): QuizContent | null {
  try {
    const value = JSON.parse(body) as Partial<QuizContent>;
    if (
      value.version !== 1 ||
      !Array.isArray(value.questions) ||
      value.questions.length < 1 ||
      value.questions.some(
        (item) =>
          typeof item.question !== 'string' ||
          !Array.isArray(item.options) ||
          item.options.length < 2 ||
          !item.options.every((option) => typeof option === 'string') ||
          !Number.isInteger(item.answer) ||
          item.answer < 0 ||
          item.answer >= item.options.length ||
          typeof item.explanation !== 'string',
      )
    ) return null;
    return {
      version: 1,
      passPercent: Math.min(100, Math.max(0, value.passPercent ?? 75)),
      questions: value.questions as QuizQuestion[],
    };
  } catch {
    return null;
  }
}

export function LessonQuiz({
  body,
  onMarkComplete,
  isCompleted = false,
  isCompletePending = false,
  completeFailed = false,
}: {
  body: string;
  onMarkComplete?: () => void;
  isCompleted?: boolean;
  isCompletePending?: boolean;
  completeFailed?: boolean;
}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= breakpoint.compact;
  const quiz = useMemo(() => parseQuiz(body), [body]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  if (!quiz) return <Text style={styles.error}>No se pudo abrir esta comprobación.</Text>;

  const score = quiz.questions.reduce(
    (total, question, index) => total + (answers[index] === question.answer ? 1 : 0),
    0,
  );
  const passed = submitted && (score / quiz.questions.length) * 100 >= quiz.passPercent;
  const mascotReaction = submitted ? quizMascotReaction(passed) : null;
  const canSubmit = Object.keys(answers).length === quiz.questions.length;

  const reset = () => {
    setAnswers({});
    setSubmitted(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={[styles.intro, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider, borderRadius: theme.radius.md }]}>
        <Text style={[styles.kicker, { color: theme.colors.accentAlt }]}>Comprueba lo que entendiste</Text>
        <Text style={[styles.description, { color: theme.colors.neutral[600] }]}>
          Elige una respuesta en cada pregunta. Al final verás una explicación para revisar tus decisiones.
        </Text>
      </View>

      {quiz.questions.map((question, questionIndex) => {
        const selected = answers[questionIndex];
        const showFeedback = submitted;
        return (
          <View key={question.question} style={[styles.questionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider, borderRadius: theme.radius.md }]}>
            <Text style={[styles.questionNumber, { color: theme.colors.accentAlt }]}>
              Pregunta {questionIndex + 1} de {quiz.questions.length}
            </Text>
            <Text style={[styles.question, { color: theme.colors.text }]}>{question.question}</Text>
            <View style={styles.options}>
              {question.options.map((option, optionIndex) => {
                const correct = optionIndex === question.answer;
                const picked = selected === optionIndex;
                let backgroundColor: string = theme.colors.bg;
                let borderColor: string = theme.colors.divider;
                if (showFeedback && correct) {
                  backgroundColor = '#e9f7ef';
                  borderColor = '#23824b';
                } else if (showFeedback && picked) {
                  backgroundColor = '#fff0ed';
                  borderColor = '#b8402c';
                } else if (picked) {
                  backgroundColor = '#eef5ff';
                  borderColor = theme.colors.accent;
                }
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: picked, disabled: submitted }}
                    disabled={submitted}
                    onPress={() => setAnswers((current) => ({ ...current, [questionIndex]: optionIndex }))}
                    style={({ pressed }) => [styles.option, { backgroundColor, borderColor, borderRadius: theme.radius.sm, opacity: pressed ? 0.8 : 1 }]}
                  >
                    <QuizRadioMark selected={picked} selectedColor={theme.colors.accent} idleColor={theme.colors.neutral[400]} />
                    <Text style={[styles.optionText, { color: theme.colors.text }]}>{option}</Text>
                  </Pressable>
                );
              })}
            </View>
            {showFeedback ? (
              <FeedbackReveal delay={quizFeedbackDelay(questionIndex)}>
                <Text style={[styles.feedback, { color: theme.colors.neutral[700] }]}>
                  {selected === question.answer ? 'Correcto. ' : 'Revisa esta idea. '}{question.explanation}
                </Text>
              </FeedbackReveal>
            ) : null}
          </View>
        );
      })}

      {submitted ? (
        <FeedbackReveal delay={220}>
          <View style={styles.resultStage}>
            <View style={[styles.result, isWide ? styles.resultWide : styles.resultCompact, { backgroundColor: passed ? '#e9f7ef' : '#fff8e8', borderRadius: theme.radius.md }]}>
              <Text style={[styles.resultTitle, { color: theme.colors.text }]}>
                {passed ? 'Ya puedes seguir' : 'Repasa y vuelve a intentarlo'}
              </Text>
              <Text style={[styles.resultCopy, { color: theme.colors.neutral[700] }]}>
                Tuviste {score} de {quiz.questions.length} respuestas correctas.
              </Text>
              {passed ? (
                isCompleted ? (
                  <Text style={[styles.saved, { color: theme.colors.neutral[700] }]}>Esta lección ya está marcada como completada.</Text>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    disabled={isCompletePending}
                    onPress={onMarkComplete}
                    style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.colors.accentButton, borderRadius: theme.radius.md, opacity: pressed || isCompletePending ? 0.7 : 1 }]}
                  >
                    {isCompletePending ? <ActivityIndicator color="#fff" /> : <Icon glyph={Check} size={18} color="#fff" />}
                    <Text style={styles.primaryLabel}>{isCompletePending ? 'Guardando…' : 'Marcar como completada'}</Text>
                  </Pressable>
                )
              ) : (
                <Pressable accessibilityRole="button" onPress={reset} style={({ pressed }) => [styles.retryButton, { borderColor: theme.colors.divider, borderRadius: theme.radius.md, opacity: pressed ? 0.7 : 1 }]}>
                  <Icon glyph={RotateCcw} size={17} color={theme.colors.text} />
                  <Text style={[styles.retryLabel, { color: theme.colors.text }]}>Intentarlo otra vez</Text>
                </Pressable>
              )}
              {completeFailed ? <Text style={styles.error}>No pudimos guardar tu avance. Prueba de nuevo.</Text> : null}
            </View>
            {mascotReaction ? (
              <View pointerEvents="none" style={[styles.mascotReaction, isWide ? styles.mascotReactionWide : styles.mascotReactionCompact]}>
                <MascotGuide
                  line="Lía reacciona al resultado de la comprobación."
                  lineKey={`quiz-${passed ? 'passed' : 'retry'}`}
                  speakingMood={mascotReaction.mood}
                  motion={mascotReaction.motion}
                  motionKey={`quiz-${passed ? 'passed' : 'retry'}-${score}`}
                  size={isWide ? 112 : 76}
                />
              </View>
            ) : null}
          </View>
        </FeedbackReveal>
      ) : (
        <Pressable
          accessibilityRole="button"
          disabled={!canSubmit}
          onPress={() => setSubmitted(true)}
          style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.colors.accentButton, borderRadius: theme.radius.md, opacity: !canSubmit || pressed ? 0.55 : 1 }]}
        >
          <Text style={styles.primaryLabel}>{canSubmit ? 'Revisar respuestas' : 'Responde todas las preguntas'}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function QuizRadioMark({ selected, selectedColor, idleColor }: { selected: boolean; selectedColor: string; idleColor: string }) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(selected ? 1 : 0.65);

  useEffect(() => {
    scale.value = reduceMotion ? (selected ? 1 : 0.65) : withSpring(selected ? 1 : 0.65, { damping: 12, stiffness: 230 });
  }, [reduceMotion, scale, selected]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={[styles.radio, { borderColor: selected ? selectedColor : idleColor }]}>
      <Animated.View style={[styles.radioDot, { backgroundColor: selectedColor, opacity: selected ? 1 : 0 }, style]} />
    </View>
  );
}

function FeedbackReveal({ delay, children }: { delay: number; children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const translateY = useSharedValue(reduceMotion ? 0 : 8);

  useEffect(() => {
    cancelAnimation(opacity);
    cancelAnimation(translateY);
    if (reduceMotion) {
      opacity.value = 1;
      translateY.value = 0;
      return;
    }
    opacity.value = 0;
    translateY.value = 8;
    opacity.value = withDelay(delay, withTiming(1, { duration: 230 }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 260 }));
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(translateY);
    };
  }, [delay, opacity, reduceMotion, translateY]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: translateY.value }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  container: { width: '100%', maxWidth: 820, alignSelf: 'center', padding: 24, paddingBottom: 48, gap: 16 },
  intro: { padding: 20, borderWidth: 1, gap: 8 },
  kicker: { fontSize: 15, fontWeight: '700' },
  description: { fontSize: 15, lineHeight: 22 },
  questionCard: { padding: 20, borderWidth: 1, gap: 12 },
  questionNumber: { fontSize: 13, fontWeight: '700' },
  question: { fontSize: 18, fontWeight: '600', lineHeight: 25 },
  options: { gap: 8 },
  option: { minHeight: 48, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  radio: { width: 20, height: 20, borderWidth: 1.5, borderRadius: 99, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 99 },
  optionText: { flex: 1, fontSize: 15, lineHeight: 21 },
  feedback: { fontSize: 14, lineHeight: 21, paddingTop: 4 },
  resultStage: { position: 'relative', width: '100%', paddingBottom: 22, overflow: 'visible' },
  result: { width: '100%', padding: 20, gap: 9 },
  resultWide: { paddingRight: 112, paddingBottom: 52 },
  resultCompact: { paddingRight: 88, paddingBottom: 52 },
  mascotReaction: { position: 'absolute', alignItems: 'center', zIndex: 2 },
  mascotReactionWide: { right: -8, bottom: -6 },
  mascotReactionCompact: { right: -2, bottom: 0 },
  resultTitle: { fontSize: 19, fontWeight: '700' },
  resultCopy: { fontSize: 15 },
  saved: { fontSize: 14 },
  primaryButton: { minHeight: 50, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  primaryLabel: { color: '#fff', fontSize: 15, fontWeight: '700' },
  retryButton: { minHeight: 48, alignSelf: 'flex-start', borderWidth: 1, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  retryLabel: { fontSize: 14, fontWeight: '600' },
  error: { color: '#b8402c', fontSize: 14 },
});
