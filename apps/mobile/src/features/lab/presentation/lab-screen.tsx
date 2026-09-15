import { Link, useLocalSearchParams, useRouter } from 'expo-router';
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
  useWindowDimensions,
} from 'react-native';

import { INSTITUTE_SHORT_NAME } from '@/core/brand';
import { ApiError } from '@/core/errors/api-error';
import { breakpoint, useTheme } from '@/core/theme';
import { MascotGuide } from '@/core/ui/mascot-guide';
import { ErrorState, LoadingState } from '@/core/ui/state-view';
import { useEntitlements } from '@/features/billing';
import { useDraft } from '@/features/lab/application/use-draft';
import { useActivity, useSubmitPrompt } from '@/features/lab/application/use-lab';
import { MAX_PROMPT_CHARS, canSubmit } from '@/features/lab/domain/entities';
import { liaMarginNotes } from '@/features/lab/domain/margin-notes';
import { AttemptHistory } from '@/features/lab/presentation/attempt-history';

function messageFor(error: unknown): string {
  if (!(error instanceof ApiError)) return 'No pudimos enviar tu prompt.';

  switch (error.code) {
    case 'submission_in_flight':
      return 'Ese intento ya se está evaluando. Espera unos segundos.';
    case 'no_attempts_left':
      return 'Ya usaste todos los intentos de esta actividad.';
    case 'evaluation_quota_exceeded':
      return 'Se te acabaron las lecturas de este mes. El cupo se renueva el día 1.';
    case 'prompt_too_long':
      return `El prompt no puede superar los ${MAX_PROMPT_CHARS} caracteres.`;
    case 'empty_prompt':
      return 'Escribe un prompt antes de enviar.';
    case 'network_error':
      return 'No pudimos conectarnos. Revisa tu conexión.';
    default:
      return 'No pudimos enviar tu prompt.';
  }
}

function draftHint(status: 'idle' | 'saving' | 'saved', restored: boolean): string {
  if (status === 'saving') return 'Guardando…';
  if (restored && status === 'saved') return 'Recuperamos el borrador';
  if (status === 'saved') return 'Borrador guardado';
  return '';
}

export function LabScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= breakpoint.compact;
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  const id = activityId ?? '';

  const { activity, isLoading, error, refetch } = useActivity(id);
  const submit = useSubmitPrompt(id);
  const { entitlements } = useEntitlements();
  const { text: prompt, setText: setPrompt, status, restored, clear } = useDraft(id);

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

  const quotaLeft = entitlements?.evaluationsRemaining ?? null;
  const outOfQuota = quotaLeft === 0;
  const outOfAttempts = activity.attemptsLeft === 0;
  const ready = canSubmit(activity, prompt) && !outOfQuota && !submit.isPending;
  const remaining = MAX_PROMPT_CHARS - prompt.length;
  const hasStartedWriting = prompt.trim().length > 0;
  const marginNotes = liaMarginNotes(activity.requirements, prompt, activity.checks);
  const missingNote = marginNotes.find((note) => !note.isPresent);

  const send = () => {
    if (!ready) return;
    submit.mutate(prompt.trim(), {
      onSuccess: (submission) => {
        void clear();
        router.push(`/lab/submissions/${submission.id}`);
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.kickerRow}>
          <View style={[styles.signalSquare, { backgroundColor: theme.colors.accent }]} />
          <Text style={[styles.kicker, { color: theme.colors.accent }]}>
            Taller · Instituto {INSTITUTE_SHORT_NAME}
          </Text>
        </View>

        <View style={styles.headingRow}>
          <View style={styles.headingCopy}>
            <Text style={[styles.title, { color: theme.colors.text }]}>{activity.title}</Text>
            <Text style={[styles.lede, { color: theme.colors.neutral[700] }]}>
              Una hoja. Un pedido. El lunes lo fotocopias.
            </Text>
          </View>
          <MascotGuide
            line="Escribes el pedido. Yo lo leo."
            lineKey={`lab-folio-${activity.id}`}
            holdMood="write"
            size={88}
          />
        </View>

        <Text style={[styles.statement, { color: theme.colors.neutral[600] }]}>
          {activity.statement.replace(/\s+/g, ' ').trim()}
        </Text>

        <View style={[styles.folio, isWide ? styles.folioWide : undefined]}>
          <View
            style={[
              styles.paper,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.divider,
                borderRadius: theme.radius.lg,
                ...theme.shadow.md,
              },
            ]}
          >
            <View style={styles.paperHint}>
              <Text style={[styles.hintText, { color: theme.colors.neutral[600] }]}>
                {draftHint(status, restored) || 'Tu pedido'}
              </Text>
              <Text style={[styles.hintText, { color: theme.colors.neutral[600] }]}>
                {activity.attemptsLeft} de {activity.maxAttempts}{' '}
                {activity.maxAttempts === 1 ? 'intento' : 'intentos'}
                {remaining < 200 ? ` · ${remaining} caracteres` : ''}
              </Text>
            </View>
            <TextInput
              value={prompt}
              onChangeText={setPrompt}
              multiline
              textAlignVertical="top"
              maxLength={MAX_PROMPT_CHARS}
              placeholder="Escribe aquí el pedido que le vas a dar a la herramienta…"
              placeholderTextColor={theme.colors.neutral[500]}
              accessibilityLabel="Tu prompt"
              style={[
                styles.editor,
                { color: theme.colors.text },
                Platform.OS === 'web' ? styles.editorWeb : undefined,
              ]}
            />
          </View>

          {marginNotes.length > 0 ? (
            <View
              style={[
                styles.marginSlip,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.divider,
                  borderRadius: theme.radius.md,
                  ...theme.shadow.sm,
                },
                isWide ? styles.marginSlipWide : undefined,
              ]}
              accessibilityRole="list"
              accessibilityLabel="Lía mira esto"
            >
              <Text style={[styles.marginTitle, { color: theme.colors.accentRamp[700] }]}>
                Lía mira esto
              </Text>
              {marginNotes.map((note) => {
                const isMissing = hasStartedWriting && !note.isPresent;
                return (
                  <View
                    key={note.requirement}
                    style={styles.marginRow}
                    accessibilityRole="text"
                    accessibilityLabel={`${note.label}. ${note.requirement}${
                      note.isPresent ? '. Ya está.' : isMissing ? '. Todavía no.' : ''
                    }`}
                  >
                    <View
                      style={[
                        styles.marginMark,
                        {
                          backgroundColor: note.isPresent
                            ? theme.colors.accent
                            : isMissing
                              ? theme.colors.accentRamp[100]
                              : theme.colors.surface,
                          borderColor: note.isPresent || isMissing
                            ? theme.colors.accent
                            : theme.colors.neutral[400],
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.marginLabel,
                        {
                          color: isMissing ? theme.colors.accentRamp[700] : theme.colors.text,
                          fontWeight: note.isPresent || isMissing ? '600' : '400',
                        },
                      ]}
                    >
                      {note.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>

        {submit.isError ? (
          <Text
            style={[styles.error, { color: theme.colors.accentRamp[700] }]}
            accessibilityRole="alert"
          >
            {messageFor(submit.error)}
          </Text>
        ) : null}

        {outOfAttempts ? (
          <Text style={[styles.error, { color: theme.colors.neutral[600] }]}>
            Ya usaste todos los intentos de esta actividad.
          </Text>
        ) : null}

        {outOfQuota && !outOfAttempts ? (
          <View
            style={[
              styles.quotaGate,
              {
                borderColor: theme.colors.divider,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <Text style={[styles.error, { color: theme.colors.text }]}>
              Se te acabaron las lecturas de este mes.
            </Text>
            <Text style={[styles.metaText, { color: theme.colors.neutral[600] }]}>
              El cupo se renueva el día 1. Lo que escribas ahora se guarda como borrador y te
              espera.
            </Text>
            <Link href="/plans" style={[styles.planLink, { color: theme.colors.accent }]}>
              Ver planes
            </Link>
          </View>
        ) : null}

        <View style={styles.foot}>
          <Text style={[styles.metaText, { color: theme.colors.neutral[600] }]}>
            {quotaLeft !== null
              ? `${quotaLeft} ${quotaLeft === 1 ? 'lectura' : 'lecturas'} este mes. `
              : ''}
            {hasStartedWriting && missingNote
              ? `Falta: ${missingNote.label.toLocaleLowerCase()}. `
              : ''}
            La lectura tarda unos segundos. Puedes salir.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={!ready}
            onPress={send}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: theme.colors.text,
                borderRadius: theme.radius.md,
                opacity: !ready ? 0.45 : pressed ? 0.85 : 1,
              },
            ]}
          >
            {submit.isPending ? (
              <ActivityIndicator color="#f2f2f3" />
            ) : (
              <Text style={styles.buttonLabel}>Entregar la hoja</Text>
            )}
          </Pressable>
        </View>

        <AttemptHistory activityId={id} />
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
    maxWidth: 980,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 48,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  signalSquare: {
    width: 8,
    height: 8,
  },
  kicker: {
    fontSize: 13,
    fontWeight: '600',
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 12,
  },
  headingCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  lede: {
    fontSize: 17,
    lineHeight: 24,
  },
  statement: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
    maxWidth: 560,
  },
  folio: {
    gap: 14,
    marginBottom: 16,
  },
  folioWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 0,
  },
  paper: {
    flex: 1,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 18,
    minHeight: 280,
  },
  paperHint: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  hintText: {
    fontSize: 12,
  },
  editor: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 200,
    padding: 0,
    borderWidth: 0,
  },
  editorWeb: {
    outlineStyle: 'none',
  },
  marginSlip: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  marginSlipWide: {
    width: 210,
    marginLeft: -8,
    marginTop: 28,
  },
  marginTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  marginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  marginMark: {
    width: 12,
    height: 12,
    borderWidth: 2,
  },
  marginLabel: {
    fontSize: 14,
  },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
    minWidth: 200,
  },
  error: {
    fontSize: 14,
    marginBottom: 8,
  },
  button: {
    paddingVertical: 13.6,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 180,
  },
  buttonLabel: {
    color: '#f2f2f3',
    fontSize: 15,
    fontWeight: '600',
  },
  quotaGate: {
    borderWidth: 1,
    padding: 13.6,
    gap: 6,
    marginBottom: 12,
  },
  planLink: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
});
