import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ApiError } from '@/core/errors/api-error';
import { useTheme } from '@/core/theme';
import { ProgressBar } from '@/core/ui/progress-bar';
import { useSession } from '@/features/auth';
import { canEnrolIn, useEntitlements } from '@/features/billing';
import type { Level } from '@/features/catalog/domain/entities';
import {
  useCourseProgress,
  useEnroll,
} from '@/features/enrollment/application/use-enrollment';
import { callToAction } from '@/features/enrollment/domain/entities';

function messageFor(error: unknown): string {
  if (!(error instanceof ApiError)) return 'No pudimos completar la inscripción.';

  switch (error.code) {
    case 'cohort_not_found':
      return 'Ese código de charla no existe. Revisalo o dejalo vacío.';
    case 'already_enrolled':
      return 'Ya estás inscrito en este curso.';
    case 'plan_level_not_allowed':
      return 'Tu plan no incluye los cursos de este nivel.';
    case 'network_error':
      return 'No pudimos conectarnos. Revisa tu conexión.';
    default:
      return 'No pudimos completar la inscripción.';
  }
}

/**
 * The enrollment box on a course page.
 *
 * Three states, and they are genuinely different: a visitor who has no account,
 * a teacher who has not joined, and a teacher already in the course. Collapsing
 * them into one button is how a person ends up pressing something that does
 * nothing.
 */
export function EnrollPanel({ slug, level }: { slug: string; level?: Level }) {
  const theme = useTheme();
  const { isAuthenticated, isLoading: isCheckingSession } = useSession();

  // Skip the request entirely when nobody is logged in: it would answer 401 and
  // spend a teacher's data to tell us what we already know.
  const { progress, isLoading } = useCourseProgress(slug, { enabled: isAuthenticated });
  const enroll = useEnroll();
  const { entitlements } = useEntitlements({ enabled: isAuthenticated });

  const [cohortCode, setCohortCode] = useState('');

  if (isCheckingSession || (isAuthenticated && isLoading)) {
    return <ActivityIndicator color={theme.colors.accent} style={styles.loader} />;
  }

  if (!isAuthenticated) {
    return (
      <View style={[styles.panel, { borderColor: theme.colors.divider }]}>
        <Text style={[styles.hint, { color: theme.colors.neutral[700] }]}>
          Crea una cuenta para inscribirte y guardar tu progreso.
        </Text>
        <Link href="/login" asChild>
          <Pressable accessibilityRole="link">
            {({ pressed }) => (
              <View
                style={[
                  styles.button,
                  {
                    backgroundColor: theme.colors.accentButton,
                    borderRadius: theme.radius.md,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={styles.buttonLabel}>Iniciar sesión</Text>
              </View>
            )}
          </Pressable>
        </Link>
      </View>
    );
  }

  // The plan gate, explained rather than hit. A teacher who presses a button
  // and gets a 403 learns nothing; one who is told the level is not in their
  // plan knows exactly what to do.
  if (level && !canEnrolIn(entitlements, level)) {
    return (
      <View style={[styles.panel, { borderColor: theme.colors.divider }]}>
        <Text style={[styles.hint, { color: theme.colors.neutral[700] }]}>
          Tu plan actual no incluye los cursos de este nivel.
        </Text>
        <Link href="/plans" asChild>
          <Pressable accessibilityRole="link">
            {({ pressed }) => (
              <View
                style={[
                  styles.button,
                  {
                    backgroundColor: theme.colors.accentButton,
                    borderRadius: theme.radius.md,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={styles.buttonLabel}>Ver planes</Text>
              </View>
            )}
          </Pressable>
        </Link>
      </View>
    );
  }

  if (progress) {
    return (
      <View style={[styles.panel, { borderColor: theme.colors.divider }]}>
        <ProgressBar
          percentage={progress.percentage}
          label={`${progress.completedLessons} de ${progress.totalLessons} lecciones · ${progress.percentage}%`}
        />
        {progress.nextLesson ? (
          <Text style={[styles.hint, { color: theme.colors.neutral[600] }]}>
            Sigue: {progress.nextLesson.moduleTitle} · {progress.nextLesson.lessonTitle}
          </Text>
        ) : progress.isFinished ? (
          <Text style={[styles.hint, { color: theme.colors.accentRamp[700] }]}>
            Completaste el curso 🎉
          </Text>
        ) : (
          <Text style={[styles.hint, { color: theme.colors.neutral[600] }]}>
            Lecciones listas · falta la práctica
          </Text>
        )}
        {progress.isComplete ? null : (
          <Text style={[styles.enrolled, { color: theme.colors.neutral[600] }]}>
            {callToAction(progress)} marcando las lecciones del temario.
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.panel, { borderColor: theme.colors.divider }]}>
      <Text style={[styles.hint, { color: theme.colors.neutral[700] }]}>
        ¿Vienes de una charla presencial? Pon el código para que tu capacitación quede
        registrada.
      </Text>

      <TextInput
        value={cohortCode}
        onChangeText={setCohortCode}
        placeholder="Código de la charla (opcional)"
        placeholderTextColor={theme.colors.neutral[500]}
        autoCapitalize="characters"
        accessibilityLabel="Código de la charla, opcional"
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.neutral[100],
            borderColor: theme.colors.divider,
            borderRadius: theme.radius.md,
            color: theme.colors.text,
          },
        ]}
      />

      {enroll.isError ? (
        <Text
          style={[styles.error, { color: theme.colors.accentRamp[700] }]}
          accessibilityRole="alert"
        >
          {messageFor(enroll.error)}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={enroll.isPending}
        onPress={() =>
          enroll.mutate({ courseSlug: slug, cohortCode: cohortCode.trim() || undefined })
        }
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: theme.colors.accentButton,
            borderRadius: theme.radius.md,
            opacity: enroll.isPending ? 0.6 : pressed ? 0.85 : 1,
          },
        ]}
      >
        {enroll.isPending ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonLabel}>Inscribirme</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: {
    paddingVertical: 20.4,
  },
  // A rule, not a box: the panel sits inside the course card, and a square
  // frame inside a rounded one read as a form pasted on top.
  panel: {
    borderTopWidth: 1,
    paddingTop: 16,
    gap: 10.2,
    marginTop: 8,
  },
  hint: {
    fontSize: 14,
    lineHeight: 20,
  },
  enrolled: {
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 13.6,
    paddingVertical: 10.2,
    fontSize: 16,
  },
  error: {
    fontSize: 14,
  },
  button: {
    paddingVertical: 13.6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
