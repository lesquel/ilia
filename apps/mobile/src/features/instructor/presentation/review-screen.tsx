import { Link, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { ApiError } from '@/core/errors/api-error';
import { breakpoint, useTheme } from '@/core/theme';
import { Icon } from '@/core/ui/icon';
import { EmptyState, ErrorState } from '@/core/ui/state-view';
import {
  useOverrideScore,
  useReviewInbox,
} from '@/features/instructor/application/use-instructor';
import { quickReasonAppended, scoreTone } from '@/features/instructor/domain/dashboard';
import type { ReviewItem } from '@/features/instructor/domain/entities';
import { ReviewScreenSkeleton } from '@/features/instructor/presentation/review-screen-skeleton';
import { Field, FieldLabel } from '@/features/instructor/presentation/ui';

/** Reasons an instructor gives often enough to deserve one tap. */
const QUICK_REASONS = [
  'Falta el rol.',
  'Pide el formato.',
  'Buen contexto local.',
  'La nota automática fue muy estricta.',
  'La nota automática fue muy generosa.',
];

/** Wording chosen from the API's stable code, never from its message. */
function overrideMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'No pudimos guardar la corrección.';

  switch (error.code) {
    case 'not_your_course':
      return 'Esa entrega es de un curso que no es tuyo.';
    case 'validation_error':
      return 'Revisa la nota: tiene que estar entre 0 y 100, con una justificación.';
    case 'not_found':
      return 'Esa entrega ya no existe.';
    case 'network_error':
      return 'No pudimos conectarnos. La corrección no se guardó: probá de nuevo.';
    default:
      return 'No pudimos guardar la corrección. La nota quedó como estaba.';
  }
}

/**
 * The review desk (PRD I-03): one submission at a time, in three columns —
 * what the teacher asked, what Lía proposes, and your correction.
 *
 * This screen is the reason the certification can be defended: without a human
 * able to disagree with the machine, the grade is only as trustworthy as the
 * model (TRD §9.3).
 */
export function ReviewScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { items, total, isLoading, error } = useReviewInbox();
  const [selectedId, setSelectedId] = useState<string | null>(id ?? null);
  const [saved, setSaved] = useState<string | null>(null);

  if (error) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        <ErrorState error={error} />
      </View>
    );
  }

  const found = items.findIndex((item) => item.submissionId === selectedId);
  const index = found >= 0 ? found : 0;
  const current = items[index];

  const select = (next: number) => {
    const target = items[next];
    if (target) setSelectedId(target.submissionId);
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Link href="/instructor" style={[styles.link, { color: theme.colors.accentAlt }]}>
          ← Mi aula
        </Link>
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.title,
              { color: theme.colors.ink, fontFamily: theme.typography.display.family },
            ]}
            accessibilityRole="header"
          >
            Corregir una entrega
          </Text>
          {current ? (
            <View style={styles.stepper}>
              <Text style={[styles.meta, { color: theme.colors.neutral[800] }]}>
                Entrega {index + 1} de {items.length}
              </Text>
              <StepButton
                glyph={ChevronLeft}
                label="Entrega anterior"
                disabled={index === 0}
                onPress={() => select(index - 1)}
              />
              <StepButton
                glyph={ChevronRight}
                label="Entrega siguiente"
                disabled={index >= items.length - 1}
                onPress={() => select(index + 1)}
              />
            </View>
          ) : null}
        </View>
        <Text style={[styles.subtitle, { color: theme.colors.neutral[800] }]}>
          Si la nota automática se equivocó, corrígela. Queda registrado quién, cuándo y por qué.
          {/* The count, so a full inbox does not look like a short one. */}
          {total > items.length ? ` Mostrando ${items.length} de ${total}.` : ''}
        </Text>
        {saved ? (
          <Text
            style={[styles.saved, { color: theme.colors.success }]}
            accessibilityRole="alert"
          >
            {saved}
          </Text>
        ) : null}
      </View>

      {isLoading ? (
        <ReviewScreenSkeleton />
      ) : !current ? (
        <EmptyState
          title="Todavía no hay entregas"
          hint="Van a aparecer aquí cuando alguien resuelva una actividad de tus cursos."
        />
      ) : (
        <>
          <Workbench
            key={current.submissionId}
            item={current}
            isLast={index >= items.length - 1}
            onSaved={() => {
              setSaved(`Guardada la corrección de ${current.studentName}.`);
              select(index + 1);
            }}
          />
          <InboxList items={items} selectedId={current.submissionId} onSelect={setSelectedId} />
        </>
      )}
    </ScrollView>
  );
}

function StepButton({
  glyph,
  label,
  disabled,
  onPress,
}: {
  glyph: typeof ChevronLeft;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.step,
        {
          borderColor: theme.colors.divider,
          backgroundColor: theme.colors.surface,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <Icon glyph={glyph} size={18} color={theme.colors.text} />
    </Pressable>
  );
}

/** Three columns on a wide screen, one under the other on a phone. */
function Workbench({
  item,
  isLast,
  onSaved,
}: {
  item: ReviewItem;
  isLast: boolean;
  onSaved: () => void;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= breakpoint.medium;

  return (
    <View style={[styles.workbench, wide ? styles.workbenchWide : undefined]}>
      <Column wide={wide} title={`El pedido de ${item.studentName}`}>
        <SubmissionColumn item={item} />
      </Column>
      <Column wide={wide} title="Lo que propone Lía">
        <ProposalColumn item={item} />
      </Column>
      <Column wide={wide} title="Tu corrección">
        <CorrectionColumn item={item} isLast={isLast} onSaved={onSaved} />
      </Column>
    </View>
  );
}

function Column({ wide, title, children }: { wide: boolean; title: string; children: ReactNode }) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.column,
        wide ? styles.columnWide : undefined,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.divider,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <Text
        accessibilityRole="header"
        style={[
          styles.columnTitle,
          { color: theme.colors.ink, fontFamily: theme.typography.displayBold.family },
        ]}
        numberOfLines={2}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function SubmissionColumn({ item }: { item: ReviewItem }) {
  const theme = useTheme();

  return (
    <>
      <Text style={[styles.meta, { color: theme.colors.neutral[800] }]}>
        {item.activityTitle} · intento {item.attempt}
      </Text>
      <View
        style={[
          styles.prompt,
          { backgroundColor: theme.colors.bg, borderRadius: theme.radius.md },
        ]}
      >
        <Text style={[styles.promptText, { color: theme.colors.text }]} selectable>
          {item.prompt}
        </Text>
      </View>
    </>
  );
}

function ProposalColumn({ item }: { item: ReviewItem }) {
  const theme = useTheme();
  const tone = scoreTone({ effectiveTotal: item.total, passed: item.passed });
  const ink =
    tone === 'success'
      ? theme.colors.success
      : tone === 'warning'
        ? theme.colors.warning
        : theme.colors.neutral[800];
  const soft =
    tone === 'success'
      ? theme.colors.successSoft
      : tone === 'warning'
        ? theme.colors.warningSoft
        : theme.colors.neutral[200];

  if (item.total === null) {
    return (
      <Text style={[styles.body, { color: theme.colors.neutral[800] }]}>
        Lía todavía no evaluó esta entrega.
      </Text>
    );
  }

  const proposed = Math.round(item.total);

  return (
    <>
      <View style={[styles.verdict, { backgroundColor: soft, borderRadius: theme.radius.sm }]}>
        <Text style={[styles.verdictText, { color: ink }]}>
          {item.passed ? 'Aprobada' : 'No aprobada'}
        </Text>
      </View>
      <View style={styles.proposed}>
        <Text
          style={[
            styles.proposedValue,
            { color: theme.colors.ink, fontFamily: theme.typography.display.family },
          ]}
        >
          {proposed}
        </Text>
        <Text style={[styles.meta, { color: theme.colors.neutral[800] }]}>/ 100</Text>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={`Nota propuesta por Lía: ${proposed} de 100`}
        accessibilityValue={{ min: 0, max: 100, now: proposed }}
        style={[styles.track, { backgroundColor: theme.colors.neutral[200] }]}
      >
        <View style={[styles.fill, { width: `${proposed}%`, backgroundColor: ink }]} />
      </View>

      {/* The original mark survives an override, so both are shown. */}
      {item.wasOverridden && item.effectiveTotal !== null ? (
        <Text style={[styles.meta, { color: theme.colors.neutral[800] }]}>
          Ya la corregiste: la nota vigente es {Math.round(item.effectiveTotal)}.
        </Text>
      ) : (
        <Text style={[styles.meta, { color: theme.colors.neutral[800] }]}>
          Es la nota automática. Si no la cambias, es la que queda.
        </Text>
      )}
    </>
  );
}

function CorrectionColumn({
  item,
  isLast,
  onSaved,
}: {
  item: ReviewItem;
  isLast: boolean;
  onSaved: () => void;
}) {
  const theme = useTheme();
  const override = useOverrideScore();

  const [score, setScore] = useState(String(Math.round(item.effectiveTotal ?? 0)));
  const [reason, setReason] = useState('');

  const parsed = Number(score);
  const valid =
    score.trim() !== '' &&
    Number.isFinite(parsed) &&
    parsed >= 0 &&
    parsed <= 100 &&
    reason.trim().length > 0;

  return (
    <>
      <View>
        <FieldLabel>Nota final</FieldLabel>
        <Field
          value={score}
          onChangeText={setScore}
          keyboardType="numeric"
          inputMode="numeric"
          accessibilityLabel="Nota corregida"
          placeholder="0 a 100"
        />
        <FieldLabel>Por qué la cambias</FieldLabel>
        <Field
          value={reason}
          onChangeText={setReason}
          multiline
          textAlignVertical="top"
          accessibilityLabel="Justificación de la corrección"
          placeholder="Es obligatorio y queda registrado."
        />
      </View>

      <View style={styles.chips}>
        {QUICK_REASONS.map((quick) => (
          <Pressable
            key={quick}
            accessibilityRole="button"
            accessibilityLabel={`Añadir: ${quick}`}
            onPress={() => setReason((current) => quickReasonAppended(current, quick))}
            style={({ pressed }) => [
              styles.chip,
              {
                borderColor: theme.colors.divider,
                backgroundColor: theme.colors.bg,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text style={[styles.chipLabel, { color: theme.colors.text }]}>+ {quick}</Text>
          </Pressable>
        ))}
      </View>

      {/* A correction that failed silently is the worst outcome here: the
          instructor believes the grade was fixed, and the teacher never
          receives it. */}
      {override.isError ? (
        <Text
          style={[styles.error, { color: theme.colors.accentRamp[700] }]}
          accessibilityRole="alert"
        >
          {overrideMessage(override.error)}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={!valid || override.isPending}
        onPress={() =>
          override.mutate(
            { submissionId: item.submissionId, total: parsed, reason: reason.trim() },
            { onSuccess: onSaved },
          )
        }
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: theme.colors.accentButton,
            borderRadius: theme.radius.md,
            opacity: !valid ? 0.5 : pressed ? 0.85 : 1,
          },
        ]}
      >
        {override.isPending ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonLabel}>{isLast ? 'Guardar' : 'Guardar y siguiente'}</Text>
        )}
      </Pressable>
    </>
  );
}

/** Every loaded submission, so any of them is one tap away. */
function InboxList({
  items,
  selectedId,
  onSelect,
}: {
  items: ReviewItem[];
  selectedId: string;
  onSelect: (submissionId: string) => void;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.inbox,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.divider,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <Text
        accessibilityRole="header"
        style={[
          styles.columnTitle,
          { color: theme.colors.ink, fontFamily: theme.typography.displayBold.family },
        ]}
      >
        Todas las entregas
      </Text>
      {items.map((item) => {
        const active = item.submissionId === selectedId;
        const tone = scoreTone(item);
        const ink =
          tone === 'success'
            ? theme.colors.success
            : tone === 'warning'
              ? theme.colors.warning
              : theme.colors.neutral[800];

        return (
          <Pressable
            key={item.submissionId}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(item.submissionId)}
            style={({ pressed }) => [
              styles.inboxRow,
              {
                borderColor: theme.colors.divider,
                backgroundColor: active ? theme.colors.accentRamp[100] : 'transparent',
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View style={styles.inboxText}>
              <Text style={[styles.inboxName, { color: theme.colors.text }]} numberOfLines={1}>
                {item.studentName}
              </Text>
              <Text
                style={[styles.meta, { color: theme.colors.neutral[800] }]}
                numberOfLines={1}
              >
                {item.activityTitle} · intento {item.attempt}
                {item.wasOverridden ? ' · corregida' : ''}
              </Text>
            </View>
            <Text style={[styles.inboxScore, { color: ink }]}>
              {item.effectiveTotal === null ? 'Sin evaluar' : Math.round(item.effectiveTotal)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 27.2 },
  content: {
    padding: 20.4,
    paddingBottom: 40,
    maxWidth: 1240,
    width: '100%',
    alignSelf: 'center',
    gap: 16,
  },
  header: { gap: 6.8 },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10.2,
  },
  title: { fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  saved: { fontSize: 14, fontWeight: '600' },
  link: { fontSize: 15, fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  step: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { fontSize: 13, lineHeight: 19 },
  body: { fontSize: 15, lineHeight: 22 },
  workbench: { gap: 16 },
  workbenchWide: { flexDirection: 'row', alignItems: 'flex-start' },
  column: { borderWidth: 1, padding: 20.4, gap: 10.2 },
  columnWide: { flex: 1, minWidth: 0 },
  columnTitle: { fontSize: 18, lineHeight: 23, letterSpacing: -0.2 },
  prompt: { padding: 13.6 },
  promptText: { fontSize: 15, lineHeight: 23 },
  verdict: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4 },
  verdictText: { fontSize: 12, fontWeight: '700' },
  proposed: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  proposedValue: { fontSize: 56, lineHeight: 62, letterSpacing: -1.2 },
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6.8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  chipLabel: { fontSize: 13, fontWeight: '600' },
  error: { fontSize: 13 },
  button: {
    paddingVertical: 10.2,
    paddingHorizontal: 20.4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonLabel: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  inbox: { borderWidth: 1, padding: 20.4, gap: 6.8 },
  inboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10.2,
    paddingVertical: 10.2,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderRadius: 8,
  },
  inboxText: { flex: 1, minWidth: 0, gap: 2 },
  inboxName: { fontSize: 15, fontWeight: '600' },
  inboxScore: { fontSize: 15, fontWeight: '700' },
});
