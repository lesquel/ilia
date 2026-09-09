import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTheme } from '@/core/theme';
import { EmptyState, ErrorState, LoadingState } from '@/core/ui/state-view';
import {
  useOverrideScore,
  useReviewInbox,
} from '@/features/instructor/application/use-instructor';
import type { ReviewItem } from '@/features/instructor/domain/entities';

/**
 * The review inbox (PRD I-03).
 *
 * This screen is the reason the certification can be defended: without a human
 * able to disagree with the machine, the grade is only as trustworthy as the
 * model (TRD §9.3).
 */
export function ReviewScreen() {
  const theme = useTheme();
  const { items, total, isLoading, error } = useReviewInbox();

  if (error) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        <ErrorState error={error} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(item) => item.submissionId}
      renderItem={({ item }) => <ReviewRow item={item} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Link href="/instructor" style={[styles.link, { color: theme.colors.accent }]}>
            ← Mis cursos
          </Link>
          <Text style={[styles.title, { color: theme.colors.text }]}>Entregas</Text>
          <Text style={[styles.subtitle, { color: theme.colors.neutral[600] }]}>
            Si el evaluador automático se equivocó, corregí la nota. Queda registrado quién,
            cuándo y por qué.
            {/* The count, so a full inbox does not look like a short one. */}
            {total > items.length ? ` Mostrando ${items.length} de ${total}.` : ''}
          </Text>
        </View>
      }
      ListEmptyComponent={
        isLoading ? (
          <LoadingState label="Cargando entregas…" />
        ) : (
          <EmptyState
            title="Todavía no hay entregas"
            hint="Van a aparecer acá cuando alguien resuelva una actividad de tus cursos."
          />
        )
      }
    />
  );
}

function ReviewRow({ item }: { item: ReviewItem }) {
  const theme = useTheme();
  const override = useOverrideScore();

  const [open, setOpen] = useState(false);
  const [score, setScore] = useState(String(Math.round(item.effectiveTotal ?? 0)));
  const [reason, setReason] = useState('');

  const parsed = Number(score);
  const valid =
    Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 && reason.trim().length > 0;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.neutral[100],
          borderColor: theme.colors.divider,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <Text style={[styles.student, { color: theme.colors.text }]}>{item.studentName}</Text>
      <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>
        {item.activityTitle} · intento {item.attempt}
      </Text>

      <Text style={[styles.prompt, { color: theme.colors.neutral[700] }]} numberOfLines={4}>
        {item.prompt}
      </Text>

      <View style={styles.scores}>
        <Text style={[styles.score, { color: theme.colors.text }]}>
          {item.effectiveTotal === null ? 'Sin evaluar' : Math.round(item.effectiveTotal)}
          {item.effectiveTotal !== null ? ' / 100' : ''}
        </Text>
        <Text
          style={[
            styles.verdict,
            { color: item.passed ? theme.colors.accent : theme.colors.neutral[600] },
          ]}
        >
          {item.passed ? 'Aprobada' : 'No aprobada'}
        </Text>
      </View>

      {/* The original mark survives an override, so both are shown. */}
      {item.wasOverridden && item.total !== null ? (
        <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>
          Nota automática original: {Math.round(item.total)}
        </Text>
      ) : null}

      {open ? (
        <View style={styles.composer}>
          <TextInput
            value={score}
            onChangeText={setScore}
            keyboardType="numeric"
            inputMode="numeric"
            accessibilityLabel="Nota corregida"
            placeholder="0 a 100"
            placeholderTextColor={theme.colors.neutral[500]}
            style={[
              styles.input,
              { borderColor: theme.colors.divider, color: theme.colors.text },
            ]}
          />
          <TextInput
            value={reason}
            onChangeText={setReason}
            multiline
            textAlignVertical="top"
            accessibilityLabel="Justificación de la corrección"
            placeholder="Por qué corregís la nota. Es obligatorio y queda registrado."
            placeholderTextColor={theme.colors.neutral[500]}
            style={[
              styles.input,
              styles.textarea,
              { borderColor: theme.colors.divider, color: theme.colors.text },
            ]}
          />
          <View style={styles.actions}>
            <Pressable onPress={() => setOpen(false)} accessibilityRole="button">
              <Text style={[styles.link, { color: theme.colors.neutral[600] }]}>Cancelar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!valid || override.isPending}
              onPress={() =>
                override.mutate(
                  {
                    submissionId: item.submissionId,
                    total: parsed,
                    reason: reason.trim(),
                  },
                  { onSuccess: () => setOpen(false) },
                )
              }
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: theme.colors.accent,
                  borderRadius: theme.radius.md,
                  opacity: !valid ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}
            >
              {override.isPending ? (
                <ActivityIndicator color="#f2f2f3" />
              ) : (
                <Text style={styles.buttonLabel}>Guardar corrección</Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setOpen(true)} accessibilityRole="button">
          <Text style={[styles.link, { color: theme.colors.accent }]}>
            {item.wasOverridden ? 'Corregir de nuevo' : 'Corregir la nota'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 27.2 },
  content: {
    padding: 20.4,
    maxWidth: 860,
    width: '100%',
    alignSelf: 'center',
    gap: 13.6,
  },
  header: { gap: 6.8, marginBottom: 6.8 },
  title: { fontSize: 30, fontWeight: '600' },
  subtitle: { fontSize: 15, lineHeight: 22 },
  link: { fontSize: 15, fontWeight: '600' },
  card: { borderWidth: 1, padding: 20.4, gap: 6.8 },
  student: { fontSize: 18, fontWeight: '600' },
  meta: { fontSize: 13 },
  prompt: { fontSize: 14, lineHeight: 21, marginVertical: 3.4 },
  scores: { flexDirection: 'row', alignItems: 'baseline', gap: 13.6 },
  score: { fontSize: 22, fontWeight: '600' },
  verdict: { fontSize: 14, fontWeight: '600' },
  composer: { gap: 6.8, marginTop: 6.8 },
  input: { borderWidth: 1, paddingHorizontal: 10.2, paddingVertical: 10.2, fontSize: 15 },
  textarea: { minHeight: 80 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 13.6,
  },
  button: {
    paddingVertical: 10.2,
    paddingHorizontal: 20.4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonLabel: { color: '#f2f2f3', fontSize: 15, fontWeight: '600' },
});
