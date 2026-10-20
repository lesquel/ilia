import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Check, ChevronLeft, ChevronRight, Play, Send } from 'lucide-react-native';

import { breakpoint, useTheme } from '@/core/theme';
import { Icon } from '@/core/ui/icon';
import { MascotGuide, type MascotMood } from '@/core/ui/mascot-guide';
import { examplePlainText, parseLessonBody } from '@/features/enrollment/domain/lesson-body';
import {
  ideaScenePlainText,
  sceneKindLabel,
  scenesFromLesson,
  shouldShowIdeaArt,
  type LessonScene,
} from '@/features/enrollment/domain/lesson-scenes';
import {
  ExampleCard,
  LessonBlockView,
  PromptChat,
} from '@/features/enrollment/presentation/lesson-article';
import { IdeaSceneArt } from '@/features/enrollment/presentation/idea-scene-art';

type LabPhase = 'idle' | 'composing' | 'processing' | 'revealed';

const PROCESS_MS = 1100;

/**
 * A lesson you play: one beat, a fake lab, the next beat.
 * The model is not called. The result is the one the lesson already wrote.
 */
export function LessonStudio({
  body,
  onMarkComplete,
  isCompleted = false,
  isCompletePending = false,
  completeFailed = false,
  nextLessonTitle,
  onOpenNextLesson,
}: {
  body: string;
  onMarkComplete?: () => void;
  isCompleted?: boolean;
  isCompletePending?: boolean;
  completeFailed?: boolean;
  nextLessonTitle?: string;
  onOpenNextLesson?: () => void;
}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= breakpoint.compact;
  const scenes = useMemo(() => scenesFromLesson(parseLessonBody(body)), [body]);

  const [sceneIndex, setSceneIndex] = useState(0);
  const [labPhaseByScene, setLabPhaseByScene] = useState<Record<number, LabPhase>>({});
  const [readAllAtOnce, setReadAllAtOnce] = useState(false);

  const currentScene = scenes[sceneIndex];
  const labPhase = labPhaseByScene[sceneIndex] ?? 'idle';
  const isLastScene = sceneIndex >= scenes.length - 1;
  const lineKey = `${sceneIndex}-${labPhase}`;

  if (scenes.length === 0 || !currentScene) {
    return null;
  }

  if (readAllAtOnce) {
    return (
      <ScrollView
        style={styles.deck}
        contentContainerStyle={styles.readAll}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => setReadAllAtOnce(false)}
          style={({ pressed }) => [styles.textLink, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[styles.textLinkLabel, { color: theme.colors.accentAlt }]}>
            Volver a la lección
          </Text>
        </Pressable>
        {parseLessonBody(body).map((block, index) => (
          <LessonBlockView
            key={`${block.type}-${index}`}
            block={block}
            isLead={index === 0 && block.type === 'paragraph'}
            isWide={isWide}
          />
        ))}
      </ScrollView>
    );
  }

  const goToPrevious = () => {
    if (sceneIndex === 0) return;
    setSceneIndex((current) => current - 1);
  };

  const goToNext = () => {
    if (isLastScene) return;
    setSceneIndex((current) => current + 1);
  };

  const setLabPhase = (phase: LabPhase) => {
    setLabPhaseByScene((current) => ({ ...current, [sceneIndex]: phase }));
  };

  const primary = primaryAction(currentScene, labPhase, isLastScene, isCompleted);

  return (
    <View style={styles.deck}>
      <View style={styles.film}>
        {scenes.map((scene, index) => (
          <View
            key={`${scene.type}-${index}`}
            style={[
              styles.filmBeat,
              {
                backgroundColor:
                  index === sceneIndex ? theme.colors.accent : theme.colors.neutral[300],
                width: index === sceneIndex ? 36 : 18,
              },
            ]}
          />
        ))}
        <Text style={[styles.filmLabel, { color: theme.colors.neutral[600] }]}>
          {sceneKindLabel(currentScene)} · {sceneIndex + 1} / {scenes.length}
        </Text>
      </View>

      <View style={styles.slide}>
        <ScrollView
          style={styles.slideCopy}
          contentContainerStyle={[
            styles.slideCopyInner,
            isWide ? styles.slideCopyInnerWide : undefined,
          ]}
          showsVerticalScrollIndicator={false}
        >
          <FadingStage visible stageKey={lineKey}>
            <SceneStage
              scene={currentScene}
              labPhase={labPhase}
              isWide={isWide}
              sceneIndex={sceneIndex}
            />
          </FadingStage>
        </ScrollView>
        <View style={[styles.presenter, { pointerEvents: 'none' }]}>
          <MascotGuide
            line={mascotLineFor(currentScene, labPhase, sceneIndex)}
            lineKey={lineKey}
            speakingMood={mascotSpeakingMood(currentScene, labPhase)}
            doneMood={mascotDoneMood(currentScene, labPhase)}
            holdMood={labPhase === 'processing' ? 'think' : undefined}
            size={isWide ? 168 : 120}
          />
        </View>
      </View>

      {completeFailed ? (
        <Text
          style={[styles.completeError, { color: theme.colors.accentRamp[700] }]}
          accessibilityRole="alert"
        >
          No pudimos guardar que la completaste. Prueba de nuevo.
        </Text>
      ) : null}

      <View
        style={[
          styles.dock,
          { borderTopColor: theme.colors.divider, backgroundColor: theme.colors.surface },
        ]}
      >
        <View style={[styles.dockActions, isWide ? undefined : styles.dockActionsCompact]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Paso anterior"
          disabled={sceneIndex === 0}
          onPress={goToPrevious}
          style={({ pressed }) => [
            styles.controlGhost,
            {
              borderColor: theme.colors.divider,
              borderRadius: theme.radius.md,
              opacity: sceneIndex === 0 ? 0.4 : pressed ? 0.75 : 1,
            },
          ]}
        >
          <Icon glyph={ChevronLeft} size={18} color={theme.colors.text} />
          <Text style={[styles.controlGhostLabel, { color: theme.colors.text }]}>Atrás</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={primary.label}
          disabled={primary.disabled || (primary.kind === 'complete' && isCompletePending)}
          onPress={() => {
            if (primary.kind === 'write') setLabPhase('composing');
            if (primary.kind === 'send') setLabPhase('processing');
            if (primary.kind === 'next') goToNext();
            if (primary.kind === 'complete') onMarkComplete?.();
          }}
          style={({ pressed }) => [
            styles.controlPrimary,
            isWide ? undefined : styles.controlPrimaryCompact,
            {
              backgroundColor:
                primary.kind === 'complete' && isCompleted
                  ? 'transparent'
                  : theme.colors.accentButton,
              borderColor: theme.colors.accentButton,
              borderRadius: theme.radius.md,
              opacity:
                primary.disabled || isCompletePending ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}
        >
          {primary.kind === 'complete' && isCompletePending ? (
            <ActivityIndicator color={theme.colors.accent} />
          ) : (
            <>
              <Icon
                glyph={primary.icon}
                size={18}
                color={primary.kind === 'complete' && isCompleted ? theme.colors.neutral[600] : '#ffffff'}
              />
              <Text
                style={[
                  styles.controlPrimaryLabel,
                  primary.kind === 'complete' && isCompleted
                    ? { color: theme.colors.neutral[600] }
                    : undefined,
                ]}
              >
                {primary.label}
              </Text>
            </>
          )}
        </Pressable>
        {isCompleted && isLastScene && nextLessonTitle && onOpenNextLesson ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Siguiente lección: ${nextLessonTitle}`}
            onPress={onOpenNextLesson}
            style={({ pressed }) => [
              styles.nextLesson,
              isWide ? undefined : styles.nextLessonCompact,
              {
                backgroundColor: theme.colors.accentButton,
                borderRadius: theme.radius.md,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={styles.nextLessonKicker}>Siguiente lección</Text>
            <View style={styles.nextLessonRow}>
              <Text style={styles.nextLessonTitle} numberOfLines={1}>
                {nextLessonTitle}
              </Text>
              <Icon glyph={ChevronRight} size={16} color="#ffffff" />
            </View>
          </Pressable>
        ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setReadAllAtOnce(true)}
          style={({ pressed }) => [
            styles.readAllLink,
            isWide ? undefined : styles.readAllLinkCompact,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.textLinkLabel, { color: theme.colors.neutral[600] }]}>
            Leer de un tirón
          </Text>
        </Pressable>
      </View>

      <LabProcessor
        sceneIndex={sceneIndex}
        isProcessing={currentScene?.type === 'lab' && labPhase === 'processing'}
        onFinished={(finishedSceneIndex) => {
          setLabPhaseByScene((current) => ({ ...current, [finishedSceneIndex]: 'revealed' }));
        }}
      />
    </View>
  );
}

function mascotSpeakingMood(scene: LessonScene, labPhase: LabPhase): MascotMood {
  if (scene.type === 'lab' && labPhase === 'idle') return 'done';
  if (scene.type === 'lab' && labPhase === 'composing') return 'write';
  if (scene.type === 'lab' && labPhase === 'processing') return 'think';
  if (scene.type === 'lab' && labPhase === 'revealed') return 'show';
  if (scene.type === 'reveal' || scene.type === 'compare') return 'show';
  return 'think';
}

function mascotDoneMood(scene: LessonScene, labPhase: LabPhase): MascotMood {
  if (scene.type === 'lab' && labPhase === 'idle') return 'done';
  if (scene.type === 'lab' && labPhase === 'composing') return 'write';
  if (scene.type === 'lab' && labPhase === 'revealed') return 'show';
  if (scene.type === 'reveal' || scene.type === 'compare') return 'show';
  return 'done';
}

function FadingStage({
  visible,
  stageKey,
  children,
}: {
  visible: boolean;
  stageKey: string;
  children: ReactNode;
}) {
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    opacity.setValue(0);
    if (!visible) return;
    Animated.timing(opacity, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [visible, stageKey, opacity]);

  if (!visible) {
    return <View style={styles.stageWait} />;
  }

  return <Animated.View style={{ opacity, flex: 1 }}>{children}</Animated.View>;
}

function mascotLineFor(scene: LessonScene, labPhase: LabPhase, sceneIndex: number): string {
  if (scene.type === 'lab') {
    if (labPhase === 'idle') return 'Mira el pedido. Pulsa escribir y lo ves entero.';
    if (labPhase === 'composing') return 'Así queda cuando no te ahorras las piezas.';
    if (labPhase === 'processing') return 'Ahora arma la hoja. Tú no tienes que hacer nada.';
    return 'Léelo antes de fotocopiarlo.';
  }
  if (scene.type === 'compare') return 'Uno es el que casi mandas. El otro es el que pegarías.';
  if (scene.type === 'reveal') return 'Esto te lo puedes llevar el lunes.';
  if (sceneIndex === 0) return 'Primero la idea. Después escribimos el pedido.';
  return 'Sigue cuando quieras.';
}

function primaryAction(
  scene: LessonScene | undefined,
  labPhase: LabPhase,
  isLastScene: boolean,
  isCompleted: boolean,
): {
  kind: 'write' | 'send' | 'next' | 'complete';
  label: string;
  icon: typeof Play;
  disabled: boolean;
} {
  if (scene?.type === 'lab' && labPhase === 'idle') {
    return { kind: 'write', label: 'Escribir el pedido', icon: Play, disabled: false };
  }
  if (scene?.type === 'lab' && labPhase === 'composing') {
    return { kind: 'send', label: 'Enviar', icon: Send, disabled: false };
  }
  if (scene?.type === 'lab' && labPhase === 'processing') {
    return { kind: 'send', label: 'Procesando…', icon: Send, disabled: true };
  }
  if (isLastScene) {
    return {
      kind: 'complete',
      label: isCompleted ? 'Ya la terminaste' : 'Listo, la termino',
      icon: Check,
      disabled: isCompleted,
    };
  }
  return { kind: 'next', label: 'Continuar', icon: ChevronRight, disabled: false };
}

function SceneStage({
  scene,
  labPhase,
  isWide,
  sceneIndex,
}: {
  scene: LessonScene;
  labPhase: LabPhase;
  isWide: boolean;
  sceneIndex: number;
}) {
  if (scene.type === 'narrate') {
    const showIdeaArt = shouldShowIdeaArt(scene);
    const copy = (
      <LessonBlockView
        block={scene.block}
        isLead
        isWide={isWide}
        size="slide"
      />
    );

    if (!showIdeaArt) {
      return copy;
    }

    return (
      <View style={[styles.ideaBeat, isWide ? styles.ideaBeatWide : undefined]}>
        <View style={isWide ? styles.ideaArtColumn : undefined}>
          <IdeaSceneArt
            key={sceneIndex}
            plainText={ideaScenePlainText(scene)}
            sceneIndex={sceneIndex}
            compact={!isWide}
          />
        </View>
        <View style={styles.ideaCopy}>{copy}</View>
      </View>
    );
  }

  if (scene.type === 'reveal') {
    return <ExampleCard example={scene.example} />;
  }

  if (scene.type === 'compare') {
    return (
      <View style={[styles.compare, isWide ? styles.compareWide : undefined]}>
        <ExampleCard example={scene.weak} tone="weak" />
        <ExampleCard example={scene.strong} tone="strong" />
      </View>
    );
  }

  return <LabStage scene={scene} labPhase={labPhase} />;
}

function LabStage({
  scene,
  labPhase,
}: {
  scene: Extract<LessonScene, { type: 'lab' }>;
  labPhase: LabPhase;
}) {
  const fullPrompt = examplePlainText(scene.prompt);
  const typedPrompt = useTypedPrompt(fullPrompt, labPhase === 'composing');
  const promptOnScreen = labPhase === 'composing' ? typedPrompt : fullPrompt;

  return (
    <View style={styles.lab}>
      <PromptChat
        prompt={scene.prompt}
        result={scene.result}
        promptText={promptOnScreen}
        phase={labPhase}
        note="Esto no se envía. Es para que veas cómo queda el pedido."
      />
    </View>
  );
}

function useTypedPrompt(fullPrompt: string, isComposing: boolean): string {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (!isComposing) {
      // Reset the simulated typing when the reader leaves this phase.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisibleCount(0);
      return;
    }

    const charactersPerTick = Math.max(1, Math.ceil(fullPrompt.length / 36));
    const intervalId = setInterval(() => {
      setVisibleCount((current) => Math.min(fullPrompt.length, current + charactersPerTick));
    }, 28);

    return () => clearInterval(intervalId);
  }, [fullPrompt, isComposing]);

  return fullPrompt.slice(0, visibleCount);
}

function LabProcessor({
  sceneIndex,
  isProcessing,
  onFinished,
}: {
  sceneIndex: number;
  isProcessing: boolean;
  onFinished: (finishedSceneIndex: number) => void;
}) {
  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    if (!isProcessing) return;
    const timeoutId = setTimeout(() => onFinishedRef.current(sceneIndex), PROCESS_MS);
    return () => clearTimeout(timeoutId);
  }, [isProcessing, sceneIndex]);

  return null;
}

const styles = StyleSheet.create({
  deck: {
    flex: 1,
    minHeight: 0,
  },
  readAll: {
    paddingHorizontal: 40,
    paddingBottom: 40,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
    gap: 16,
  },
  film: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 40,
    paddingTop: 8,
    paddingBottom: 4,
  },
  filmBeat: {
    height: 4,
    borderRadius: 99,
  },
  filmLabel: {
    marginLeft: 8,
    fontSize: 13,
  },
  slide: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
    paddingHorizontal: 28,
    paddingTop: 8,
  },
  slideCopy: {
    flex: 1,
    minHeight: 0,
  },
  slideCopyInner: {
    flexGrow: 1,
    paddingVertical: 8,
    paddingBottom: 88,
  },
  slideCopyInnerWide: {
    paddingRight: 36,
    paddingBottom: 24,
  },
  ideaBeat: {
    flexGrow: 1,
    minHeight: 420,
    gap: 20,
  },
  ideaBeatWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 28,
    paddingRight: 168,
    minHeight: 520,
  },
  ideaArtColumn: {
    flex: 1.15,
    minWidth: 0,
    minHeight: 520,
  },
  ideaCopy: {
    flex: 0.95,
    minWidth: 0,
    justifyContent: 'center',
  },
  presenter: {
    position: 'absolute',
    right: 8,
    bottom: 0,
  },
  stageWait: {
    minHeight: 48,
  },
  completeError: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingBottom: 4,
  },
  dock: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  dockActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  dockActionsCompact: { width: '100%', flexWrap: 'wrap' },
  readAllLink: {
    position: 'absolute',
    right: 24,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  readAllLinkCompact: { position: 'relative', right: undefined, top: undefined, bottom: undefined, marginTop: 8 },
  lab: {
    gap: 14,
  },
  compare: {
    gap: 12,
  },
  compareWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  controls: {
    flexDirection: 'row',
    gap: 10,
  },
  controlGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 14,
    minHeight: 48,
    minWidth: 108,
  },
  controlGhostLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  controlPrimary: {
    flexGrow: 0,
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderWidth: 1,
    paddingHorizontal: 18,
  },
  controlPrimaryCompact: { minWidth: 0, flexGrow: 1, flexShrink: 1 },
  controlPrimaryLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  nextLesson: {
    maxWidth: 260,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 8,
    justifyContent: 'center',
    gap: 2,
  },
  nextLessonCompact: { width: '100%', maxWidth: undefined },
  nextLessonKicker: {
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  nextLessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minWidth: 0,
  },
  nextLessonTitle: {
    flexShrink: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  textLink: {
    alignSelf: 'center',
    paddingVertical: 4,
  },
  textLinkLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
