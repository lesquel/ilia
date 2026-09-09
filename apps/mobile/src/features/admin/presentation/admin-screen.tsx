import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ApiError } from '@/core/errors/api-error';
import { useTheme } from '@/core/theme';
import { EmptyState, ErrorState, LoadingState } from '@/core/ui/state-view';
import {
  useAuditLog,
  useChangeRole,
  useManagedUsers,
  useOverview,
  useUsage,
} from '@/features/admin/application/use-admin';
import {
  ACTION_LABELS,
  ROLE_LABELS,
  formatTokens,
  type ManagedUser,
} from '@/features/admin/domain/entities';
import { ROLES, type Role } from '@/features/auth/domain/entities';

/**
 * The admin dashboard (PRD A-01 … A-03).
 *
 * Dense on purpose: these are tabular questions — how many, who, how much — and
 * the TRD (§4.5) is explicit that admin lists should not be phone components
 * stretched wide.
 */
export function AdminScreen() {
  const theme = useTheme();
  const { overview, isLoading, error } = useOverview();
  const { report } = useUsage(30);

  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const { users } = useManagedUsers(submitted);
  const { entries } = useAuditLog();

  if (error) {
    const denied = error instanceof ApiError && error.status === 403;

    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        {denied ? (
          <EmptyState
            title="Esta sección es para administradores"
            hint="Si deberías tener acceso, pedile a otro administrador que te cambie el rol."
          />
        ) : (
          <ErrorState error={error} />
        )}
      </View>
    );
  }

  if (isLoading || !overview) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        <LoadingState label="Cargando el panel…" />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: theme.colors.text }]}>Administración</Text>

      <View style={styles.metrics}>
        <Metric label="Docentes" value={overview.students} />
        <Metric label="Instructores" value={overview.instructors} />
        <Metric label="Cursos publicados" value={overview.coursesPublished} />
        <Metric label="Borradores" value={overview.coursesDraft} />
        <Metric label="Inscripciones" value={overview.enrollments} />
        <Metric label="Entregas" value={overview.submissions} />
        <Metric label="Certificados" value={overview.certificatesIssued} />
        <Metric label="Revocados" value={overview.certificatesRevoked} />
      </View>

      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Consumo de LLM · últimos 30 días
      </Text>

      {report ? (
        <View
          style={[
            styles.panel,
            { borderColor: theme.colors.divider, borderRadius: theme.radius.md },
          ]}
        >
          <Text style={[styles.big, { color: theme.colors.text }]}>
            {formatTokens(report.totals.totalTokens)} tokens
          </Text>
          <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>
            {formatTokens(report.totals.inputTokens)} de entrada ·{' '}
            {formatTokens(report.totals.outputTokens)} de salida ·{' '}
            {report.totals.evaluations} evaluaciones
          </Text>

          {/* A zero that means "no prices configured" must never read as a zero
              that means "free". */}
          {report.totals.pricesConfigured ? (
            <Text style={[styles.cost, { color: theme.colors.accentRamp[800] }]}>
              Costo estimado: USD {report.totals.estimatedCost.toFixed(2)}
            </Text>
          ) : (
            <Text style={[styles.warning, { color: theme.colors.neutral[700] }]}>
              Sin precios configurados: no se puede estimar el costo. Definí
              ILIA_LLM_INPUT_PRICE_PER_MILLION y ILIA_LLM_OUTPUT_PRICE_PER_MILLION cuando se
              elija el proveedor.
            </Text>
          )}

          {report.byUser.length > 0 ? (
            <View style={styles.list}>
              <Text style={[styles.listTitle, { color: theme.colors.neutral[700] }]}>
                Quiénes consumen más
              </Text>
              {report.byUser.slice(0, 10).map((row) => (
                <Text
                  key={row.userId}
                  style={[styles.row, { color: theme.colors.neutral[700] }]}
                >
                  {row.fullName} — {formatTokens(row.totals.totalTokens)} tokens ·{' '}
                  {row.totals.evaluations} evaluaciones
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Usuarios y roles</Text>
      <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>
        Los roles se otorgan, nunca se reclaman: no hay forma de autoasignárselos en ninguna
        parte de la plataforma.
      </Text>

      <TextInput
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={() => setSubmitted(search)}
        returnKeyType="search"
        placeholder="Buscar por nombre o correo"
        placeholderTextColor={theme.colors.neutral[500]}
        accessibilityLabel="Buscar usuario"
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

      {users.map((user) => (
        <UserRow key={user.id} user={user} query={submitted} />
      ))}

      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Auditoría</Text>
      <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>
        Registro de acciones sensibles. Solo se agrega: nada de acá se puede editar.
      </Text>

      {entries.length === 0 ? (
        <Text style={[styles.row, { color: theme.colors.neutral[600] }]}>
          Todavía no hay acciones registradas.
        </Text>
      ) : (
        entries.slice(0, 20).map((entry) => (
          <View
            key={entry.id}
            style={[
              styles.auditRow,
              { borderColor: theme.colors.divider, borderRadius: theme.radius.sm },
            ]}
          >
            <Text style={[styles.auditAction, { color: theme.colors.text }]}>
              {ACTION_LABELS[entry.action] ?? entry.action}
            </Text>
            <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>
              {entry.actorName} · {JSON.stringify(entry.detail)}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.metric,
        {
          backgroundColor: theme.colors.neutral[100],
          borderColor: theme.colors.divider,
          borderRadius: theme.radius.md,
        },
      ]}
    >
      <Text style={[styles.metricValue, { color: theme.colors.text }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: theme.colors.neutral[600] }]}>{label}</Text>
    </View>
  );
}

function UserRow({ user, query }: { user: ManagedUser; query: string }) {
  const theme = useTheme();
  const change = useChangeRole(query);

  const message =
    change.error instanceof ApiError
      ? change.error.code === 'cannot_demote_yourself'
        ? 'No podés cambiar tu propio rol.'
        : change.error.code === 'last_admin'
          ? 'Tiene que quedar al menos un administrador.'
          : 'No pudimos cambiar el rol.'
      : null;

  return (
    <View
      style={[
        styles.userRow,
        { borderColor: theme.colors.divider, borderRadius: theme.radius.md },
      ]}
    >
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: theme.colors.text }]}>{user.fullName}</Text>
        <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>{user.email}</Text>
      </View>

      <View style={styles.roleChips}>
        {ROLES.map((role: Role) => {
          const active = user.role === role;

          return (
            <Pressable
              key={role}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              disabled={active || change.isPending}
              onPress={() => change.mutate({ userId: user.id, role })}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: active ? theme.colors.accent : 'transparent',
                  borderColor: active ? theme.colors.accent : theme.colors.divider,
                  borderRadius: theme.radius.sm,
                  opacity: change.isPending ? 0.5 : pressed ? 0.7 : 1,
                },
              ]}
            >
              {change.isPending && !active ? (
                <ActivityIndicator size="small" color={theme.colors.accent} />
              ) : (
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? '#f2f2f3' : theme.colors.neutral[700] },
                  ]}
                >
                  {ROLE_LABELS[role]}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {message ? (
        <Text style={[styles.warning, { color: theme.colors.accentRamp[700] }]}>{message}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 40 },
  content: {
    padding: 20.4,
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
    gap: 10.2,
  },
  title: { fontSize: 32, fontWeight: '600', marginBottom: 6.8 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10.2 },
  metric: { borderWidth: 1, padding: 13.6, minWidth: 130, flexGrow: 1 },
  metricValue: { fontSize: 26, fontWeight: '600' },
  metricLabel: { fontSize: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '600', marginTop: 20.4 },
  panel: { borderWidth: 1, padding: 20.4, gap: 6.8 },
  big: { fontSize: 26, fontWeight: '600' },
  meta: { fontSize: 13, lineHeight: 19 },
  cost: { fontSize: 16, fontWeight: '600' },
  warning: { fontSize: 13, lineHeight: 19 },
  list: { marginTop: 10.2, gap: 3.4 },
  listTitle: { fontSize: 13, fontWeight: '600' },
  row: { fontSize: 13 },
  input: {
    borderWidth: 1,
    paddingHorizontal: 13.6,
    paddingVertical: 10.2,
    fontSize: 15,
    marginTop: 6.8,
  },
  userRow: { borderWidth: 1, padding: 13.6, gap: 6.8 },
  userInfo: { gap: 3.4 },
  userName: { fontSize: 16, fontWeight: '600' },
  roleChips: { flexDirection: 'row', gap: 6.8, flexWrap: 'wrap' },
  chip: {
    borderWidth: 1,
    paddingVertical: 6.8,
    paddingHorizontal: 13.6,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  auditRow: { borderWidth: 1, padding: 10.2, gap: 3.4 },
  auditAction: { fontSize: 14, fontWeight: '600' },
});
