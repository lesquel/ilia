import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/core/errors/api-error';
import { useTheme } from '@/core/theme';
import { ErrorState, LoadingState } from '@/core/ui/state-view';
import { useCohorts, useCreateCohort } from '@/features/admin/application/use-admin';
import { cohortListAppearance, type Cohort } from '@/features/admin/domain/entities';
import {
  Card,
  EmptyNote,
  Field,
  FieldLabel,
  HeaderCell,
  ListHeader,
  ListRow,
  PrimaryButton,
  useIsWide,
} from '@/features/admin/presentation/ui';

export function CohortPanel() {
  const theme = useTheme();
  const { cohorts, isLoading, error, isSuccess, refetch } = useCohorts();
  const create = useCreateCohort();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const list = cohortListAppearance({
    isLoading,
    error,
    isSuccess,
    itemCount: cohorts.length,
  });

  const message =
    create.error instanceof ApiError
      ? create.error.code === 'cohort_code_taken'
        ? 'Ese código ya existe. Usá otro para esta charla.'
        : 'No pudimos crear la cohorte.'
      : null;

  function submit() {
    const trimmedName = name.trim();
    const trimmedCode = code.trim();
    if (!trimmedName || !trimmedCode || create.isPending) return;
    create.mutate(
      { name: trimmedName, code: trimmedCode },
      {
        onSuccess: () => {
          setName('');
          setCode('');
        },
      },
    );
  }

  return (
    <View style={styles.panel}>
      <Card
        title="Cohortes"
        hint="El código se entrega en la charla. El docente lo escribe al inscribirse; no hace falta ponerlo al registrarse."
      >
        <View style={styles.form}>
          <View style={styles.formField}>
            <FieldLabel>Nombre de la charla</FieldLabel>
            <Field
              value={name}
              onChangeText={setName}
              placeholder="Nombre de la charla"
              accessibilityLabel="Nombre de la cohorte"
            />
          </View>
          <View style={styles.formField}>
            <FieldLabel>Código</FieldLabel>
            <Field
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              placeholder="MANTA-SEP-01"
              accessibilityLabel="Código de la cohorte"
              onSubmitEditing={submit}
            />
          </View>
        </View>

        <PrimaryButton
          label="Crear cohorte"
          disabled={create.isPending || !name.trim() || !code.trim()}
          busy={create.isPending}
          onPress={submit}
        />

        {message ? (
          <Text style={[styles.meta, { color: theme.colors.accentRamp[700] }]}>{message}</Text>
        ) : null}
      </Card>

      <Card title="Cohortes creadas">
        {list === 'loading' ? (
          <LoadingState label="Cargando cohortes…" />
        ) : list === 'error' ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : list === 'empty' ? (
          <EmptyNote>Todavía no hay cohortes. Creá una para la próxima charla.</EmptyNote>
        ) : (
          <View>
            <ListHeader>
              <HeaderCell label="Código" style={styles.codeCell} />
              <HeaderCell label="Charla" style={styles.nameCell} />
              <HeaderCell label="Creada" style={styles.whenCell} />
            </ListHeader>
            {cohorts.map((cohort) => (
              <CohortRow key={cohort.id} cohort={cohort} />
            ))}
          </View>
        )}
      </Card>
    </View>
  );
}

function CohortRow({ cohort }: { cohort: Cohort }) {
  const theme = useTheme();
  const isWide = useIsWide();
  const when = formatCohortWhen(cohort.createdAt);
  const muted = theme.colors.neutral[800];

  return (
    <ListRow>
      <Text
        style={[styles.code, { color: theme.colors.text }, isWide ? styles.codeCell : undefined]}
        numberOfLines={1}
      >
        {cohort.code}
      </Text>
      <Text style={[styles.meta, { color: muted }, isWide ? styles.nameCell : undefined]} numberOfLines={2}>
        {cohort.name}
      </Text>
      {when || isWide ? (
        <Text style={[styles.meta, { color: muted }, isWide ? styles.whenCell : undefined]}>
          {when ?? '—'}
        </Text>
      ) : null}
    </ListRow>
  );
}

function formatCohortWhen(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('es-EC', { dateStyle: 'medium' });
}

const styles = StyleSheet.create({
  panel: { gap: 20.4 },
  form: { flexDirection: 'row', flexWrap: 'wrap', gap: 13.6 },
  // Side by side when there is room, one per line on a phone.
  formField: { flexGrow: 1, flexBasis: 240 },
  meta: { fontSize: 13, lineHeight: 19 },
  code: { fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  codeCell: { width: 240 },
  nameCell: { flex: 1, minWidth: 0 },
  whenCell: { width: 130 },
});
