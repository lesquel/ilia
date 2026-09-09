import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ApiError } from '@/core/errors/api-error';
import { useTheme } from '@/core/theme';
import { ErrorState, LoadingState } from '@/core/ui/state-view';
import { useEntitlements } from '@/features/billing';
import { useActivity, useSubmitPrompt } from '@/features/lab/application/use-lab';
import { MAX_PROMPT_CHARS, canSubmit } from '@/features/lab/domain/entities';

function messageFor(error: unknown): string {
  if (!(error instanceof ApiError)) return 'No pudimos enviar tu prompt.';

  switch (error.code) {
    case 'no_attempts_left':
      return 'Ya usaste todos los intentos de esta actividad.';
    case 'evaluation_quota_exceeded':
      return 'Se te acabaron las evaluaciones de este mes. El cupo se renueva el día 1.';
    case 'prompt_too_long':
      return `El prompt no puede superar los ${MAX_PROMPT_CHARS} caracteres.`;
    case 'empty_prompt':
      return 'Escribí un prompt antes de enviar.';
    case 'network_error':
      return 'No pudimos conectarnos. Revisá tu conexión.';
    default:
      return 'No pudimos enviar tu prompt.';
  }
}

export function LabScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  const id = activityId ?? '';

  const { activity, isLoading, error, refetch } = useActivity(id);
  const submit = useSubmitPrompt(id);
  const { entitlements } = useEntitlements();
  const [prompt, setPrompt] = useState('');

  if (isLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        <LoadingState label="Cargando la actividad…" />
      </View>
    );
  }

  if (error || !activity) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        <ErrorState error={error} onRetry={() => void refetch()} />
      </View>
    );
  }

  const ready = canSubmit(activity, prompt) && !submit.isPending;
  const remaining = MAX_PROMPT_CHARS - prompt.length;

  const send = () => {
    if (!ready) return;
    submit.mutate(prompt.trim(), {
      // Straight to the result, which polls until the evaluation lands. The
      // teacher can leave and come back — the submission is server-side.
      onSuccess: (submission) => router.push(`/lab/submissions/${submission.id}`),
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.eyebrow, { color: theme.colors.accentRamp[700] }]}>
          Laboratorio IA
        </Text>
        <Text style={[styles.title, { color: theme.colors.text }]}>{activity.title}</Text>

        <View
          style={[
            styles.statement,
            {
              backgroundColor: theme.colors.neutral[100],
              borderColor: theme.colors.divider,
              borderRadius: theme.radius.md,
            },
          ]}
        >
          <Text style={[styles.statementText, { color: theme.colors.text }]}>
            {activity.statement}
          </Text>
        </View>

        {/* The objective requirements, stated before the teacher writes. Failing
            one because nobody said so is a trick, not a lesson. */}
        {activity.requirements.length > 0 ? (
          <View style={styles.block}>
            <Text style={[styles.blockTitle, { color: theme.colors.text }]}>
              Tu prompt tiene que cumplir
            </Text>
            {activity.requirements.map((requirement) => (
              <Text
                key={requirement}
                style={[styles.requirement, { color: theme.colors.neutral[700] }]}
              >
                • {requirement}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={styles.block}>
          <Text style={[styles.blockTitle, { color: theme.colors.text }]}>Se evalúa</Text>
          {activity.dimensions.map((dimension) => (
            <Text
              key={dimension.key}
              style={[styles.requirement, { color: theme.colors.neutral[700] }]}
            >
              • {dimension.name} — {dimension.description}
            </Text>
          ))}
        </View>

        <Text style={[styles.label, { color: theme.colors.neutral[700] }]}>Tu prompt</Text>

        <TextInput
          value={prompt}
          onChangeText={setPrompt}
          multiline
          textAlignVertical="top"
          maxLength={MAX_PROMPT_CHARS}
          placeholder="Escribí acá el prompt que le vas a dar al modelo…"
          placeholderTextColor={theme.colors.neutral[500]}
          accessibilityLabel="Tu prompt"
          style={[
            styles.editor,
            {
              backgroundColor: theme.colors.neutral[100],
              borderColor: theme.colors.divider,
              borderRadius: theme.radius.md,
              color: theme.colors.text,
            },
          ]}
        />

        <View style={styles.meta}>
          <Text style={[styles.metaText, { color: theme.colors.neutral[600] }]}>
            {activity.attemptsLeft} de {activity.maxAttempts}{' '}
            {activity.maxAttempts === 1 ? 'intento' : 'intentos'} disponibles
            {/* The quota, before the wall. A teacher should see the limit
                coming, not discover it on submit. */}
            {entitlements?.evaluationsRemaining !== null &&
            entitlements?.evaluationsRemaining !== undefined
              ? ` · ${entitlements.evaluationsRemaining} evaluaciones este mes`
              : ''}
          </Text>
          <Text
            style={[
              styles.metaText,
              { color: remaining < 200 ? theme.colors.accentRamp[700] : theme.colors.neutral[600] },
            ]}
          >
            {remaining} caracteres
          </Text>
        </View>

        {submit.isError ? (
          <Text
            style={[styles.error, { color: theme.colors.accentRamp[700] }]}
            accessibilityRole="alert"
          >
            {messageFor(submit.error)}
          </Text>
        ) : null}

        {activity.attemptsLeft === 0 ? (
          <Text style={[styles.error, { color: theme.colors.neutral[600] }]}>
            Ya usaste todos los intentos de esta actividad.
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={!ready}
          onPress={send}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: theme.colors.accent,
              borderRadius: theme.radius.md,
              opacity: !ready ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}
        >
          {submit.isPending ? (
            <ActivityIndicator color="#f2f2f3" />
          ) : (
            <Text style={styles.buttonLabel}>Enviar a evaluación</Text>
          )}
        </Pressable>

        <Text style={[styles.note, { color: theme.colors.neutral[600] }]}>
          La evaluación tarda unos segundos. Podés salir de esta pantalla: tu entrega ya quedó
          guardada.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 20.4,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
    gap: 10.2,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
  },
  statement: {
    borderWidth: 1,
    padding: 13.6,
    marginVertical: 6.8,
  },
  statementText: {
    fontSize: 15,
    lineHeight: 24,
  },
  block: {
    gap: 3.4,
    marginTop: 6.8,
  },
  blockTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3.4,
  },
  requirement: {
    fontSize: 14,
    lineHeight: 21,
  },
  label: {
    fontSize: 13,
    marginTop: 13.6,
  },
  editor: {
    borderWidth: 1,
    padding: 13.6,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 180,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: 12,
  },
  error: {
    fontSize: 14,
  },
  button: {
    paddingVertical: 13.6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: 6.8,
  },
  buttonLabel: {
    color: '#f2f2f3',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    textAlign: 'center',
  },
});
