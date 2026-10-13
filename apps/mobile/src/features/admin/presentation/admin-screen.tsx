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
  useCohorts,
  useCreateCohort,
  useManagedUsers,
  useOverview,
  useUsage,
} from '@/features/admin/application/use-admin';
import {
  ACTION_LABELS,
  ROLE_LABELS,
  cohortListAppearance,
  formatTokens,
  type Cohort,
  type ManagedUser,
} from '@/features/admin/domain/entities';
import { OverviewPanel } from '@/features/admin/presentation/overview-panel';
import { ROLES, type Role } from '@/features/auth/domain/entities';
import { RevokePanel } from '@/features/certificates/presentation/revoke-panel';

/**
 * The admin dashboard (PRD A-01 … A-03).
 *
 * Dense on purpose: these are tabular questions — how many, who, how much — and
 * the TRD (§4.5) is explicit that admin lists should not be phone components
 * stretched wide.
 */
/**
 * `extra` is a composition slot. The certificate panel belongs to the
 * The certificates tab intentionally reuses the certificate feature's safe,
 * two-step revoke flow without changing its API contract.
 */
export function AdminScreen() {
  const theme = useTheme();
  const { overview, isLoading, error, refetch } = useOverview();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  if (error) {
    const denied = error instanceof ApiError && error.status === 403;
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        {denied ? (
          <EmptyState
            title="Esta sección es para administradores"
            hint="Si deberías tener acceso, pídele a otro administrador que te cambie el rol."
          />
        ) : (
          <ErrorState error={error} onRetry={() => void refetch()} />
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
    <ScrollView style={{ backgroundColor: theme.colors.bg }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Administración</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {ADMIN_TABS.map((tab) => {
          const selected = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={tab.label}
              onPress={() => setActiveTab(tab.id)}
              style={({ pressed }) => [
                styles.tab,
                {
                  backgroundColor: selected ? theme.colors.accent : 'transparent',
                  borderColor: selected ? theme.colors.accent : theme.colors.divider,
                  borderRadius: theme.radius.sm,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Text style={[styles.tabLabel, { color: selected ? '#f2f2f3' : theme.colors.text }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {activeTab === 'overview' ? <OverviewPanel overview={overview} /> : null}
      {activeTab === 'users' ? <UsersPanel /> : null}
      {activeTab === 'cohorts' ? <CohortPanel /> : null}
      {activeTab === 'certificates' ? <RevokePanel /> : null}
      {activeTab === 'usage' ? <UsagePanel /> : null}
      {activeTab === 'audit' ? <AuditPanel /> : null}
    </ScrollView>
  );
}

type AdminTab = 'overview' | 'users' | 'cohorts' | 'certificates' | 'usage' | 'audit';
const ADMIN_TABS: { id: AdminTab; label: string }[] = [
  { id: 'overview', label: 'Resumen' },
  { id: 'users', label: 'Usuarios y roles' },
  { id: 'cohorts', label: 'Cohortes' },
  { id: 'certificates', label: 'Certificados' },
  { id: 'usage', label: 'LLM y uso' },
  { id: 'audit', label: 'Auditoría' },
];

function UsagePanel() {
  const theme = useTheme();
  const { report, isLoading, error, refetch } = useUsage(30);
  return (
    <View style={styles.panelBlock}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Consumo de LLM · últimos 30 días</Text>
      {isLoading ? <LoadingState label="Cargando uso de LLM…" /> : null}
      {error ? <ErrorState error={error} onRetry={() => void refetch()} /> : null}
      {!isLoading && !error && !report ? <EmptyState title="No hay datos de uso" /> : null}
      {report ? (
        <View style={[styles.panel, { borderColor: theme.colors.divider, borderRadius: theme.radius.md }]}>
          <Text style={[styles.big, { color: theme.colors.text }]}>{formatTokens(report.totals.totalTokens)} tokens</Text>
          <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>
            {formatTokens(report.totals.inputTokens)} de entrada · {formatTokens(report.totals.outputTokens)} de salida · {report.totals.evaluations} evaluaciones
          </Text>
          {report.totals.pricesConfigured ? (
            <Text style={[styles.cost, { color: theme.colors.accentRamp[800] }]}>Costo estimado: USD {report.totals.estimatedCost.toFixed(2)}</Text>
          ) : (
            <Text style={[styles.warning, { color: theme.colors.neutral[700] }]}>Sin precios configurados: no se puede estimar el costo.</Text>
          )}
          {report.byUser.length > 0 ? <View style={styles.list}>
            <Text style={[styles.listTitle, { color: theme.colors.neutral[700] }]}>Quiénes consumen más</Text>
            {report.byUser.slice(0, 10).map((row) => <Text key={row.userId} style={[styles.row, { color: theme.colors.neutral[700] }]}>{row.fullName} — {formatTokens(row.totals.totalTokens)} tokens · {row.totals.evaluations} evaluaciones</Text>)}
          </View> : <Text style={[styles.row, { color: theme.colors.neutral[600] }]}>Todavía no hay consumo registrado.</Text>}
        </View>
      ) : null}
    </View>
  );
}

function UsersPanel() {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [userOffset, setUserOffset] = useState(0);
  const { users, total, isLoading, error, refetch } = useManagedUsers(submitted, userOffset);
  return (
    <View style={styles.panelBlock}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Usuarios y roles</Text>
      <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>Los roles se otorgan, nunca se reclaman: no hay forma de autoasignárselos.</Text>
      <TextInput value={search} onChangeText={setSearch} onSubmitEditing={() => { setUserOffset(0); setSubmitted(search); }} returnKeyType="search" placeholder="Buscar por nombre o correo" placeholderTextColor={theme.colors.neutral[500]} accessibilityLabel="Buscar usuario" style={[styles.input, { backgroundColor: theme.colors.neutral[100], borderColor: theme.colors.divider, borderRadius: theme.radius.md, color: theme.colors.text }]} />
      {isLoading ? <LoadingState label="Cargando usuarios…" /> : null}
      {error ? <ErrorState error={error} onRetry={() => void refetch()} /> : null}
      {!isLoading && !error && users.length === 0 ? <EmptyState title="No encontramos usuarios" hint="Probá con otro nombre o correo." /> : null}
      {users.map((user) => <UserRow key={user.id} user={user} query={submitted} />)}
      {!isLoading && !error && users.length > 0 ? <View style={styles.pager}>
        <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>{`Mostrando ${userOffset + 1}–${userOffset + users.length} de ${total}`}</Text>
        <View style={styles.pagerActions}><Pager label="Anteriores" disabled={userOffset === 0} onPress={() => setUserOffset(Math.max(0, userOffset - PAGE_SIZE))} /><Pager label="Siguientes" disabled={userOffset + users.length >= total} onPress={() => setUserOffset(userOffset + PAGE_SIZE)} /></View>
      </View> : null}
    </View>
  );
}

function AuditPanel() {
  const theme = useTheme();
  const { entries, total, isLoading, error, refetch } = useAuditLog();
  return (
    <View style={styles.panelBlock}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Auditoría</Text>
      <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>Registro de acciones sensibles. Solo se agrega: nada de aquí se puede editar.</Text>
      {isLoading ? <LoadingState label="Cargando auditoría…" /> : null}
      {error ? <ErrorState error={error} onRetry={() => void refetch()} /> : null}
      {!isLoading && !error && entries.length === 0 ? <EmptyState title="Todavía no hay acciones registradas" /> : null}
      {entries.slice(0, 20).map((entry) => <View key={entry.id} style={[styles.auditRow, { borderColor: theme.colors.divider, borderRadius: theme.radius.sm }]}><Text style={[styles.auditAction, { color: theme.colors.text }]}>{ACTION_LABELS[entry.action] ?? entry.action}</Text><Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>{entry.actorName} · {JSON.stringify(entry.detail)}</Text></View>)}
      {entries.length > 0 && total > entries.length ? <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>Mostrando las {entries.length} más recientes de {total}.</Text> : null}
    </View>
  );
}

/** Must match the API's DEFAULT_PAGE_SIZE. */
const PAGE_SIZE = 50;

function CohortPanel() {
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
    <View>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Cohortes</Text>
      <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>
        El código se entrega en la charla. El docente lo escribe al inscribirse; no hace falta
        ponerlo al registrarse.
      </Text>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Nombre de la charla"
        placeholderTextColor={theme.colors.neutral[500]}
        accessibilityLabel="Nombre de la cohorte"
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
      <TextInput
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        placeholder="MANTA-SEP-01"
        placeholderTextColor={theme.colors.neutral[500]}
        accessibilityLabel="Código de la cohorte"
        onSubmitEditing={submit}
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

      <Pressable
        accessibilityRole="button"
        disabled={create.isPending || !name.trim() || !code.trim()}
        onPress={submit}
        style={({ pressed }) => [
          styles.pagerButton,
          {
            alignSelf: 'flex-start',
            marginTop: 6.8,
            borderColor: theme.colors.accent,
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.sm,
            opacity: create.isPending || !name.trim() || !code.trim() ? 0.4 : pressed ? 0.7 : 1,
          },
        ]}
      >
        {create.isPending ? (
          <ActivityIndicator size="small" color="#f2f2f3" />
        ) : (
          <Text style={[styles.pagerLabel, { color: '#f2f2f3' }]}>Crear cohorte</Text>
        )}
      </Pressable>

      {message ? (
        <Text style={[styles.warning, { color: theme.colors.accentRamp[700] }]}>{message}</Text>
      ) : null}

      {list === 'loading' ? (
        <LoadingState label="Cargando cohortes…" />
      ) : list === 'error' ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : list === 'empty' ? (
        <Text style={[styles.row, { color: theme.colors.neutral[600] }]}>
          Todavía no hay cohortes. Creá una para la próxima charla.
        </Text>
      ) : (
        cohorts.map((cohort) => <CohortRow key={cohort.id} cohort={cohort} />)
      )}
    </View>
  );
}

function CohortRow({ cohort }: { cohort: Cohort }) {
  const theme = useTheme();
  const when = formatCohortWhen(cohort.createdAt);

  return (
    <View
      style={[
        styles.userRow,
        { borderColor: theme.colors.divider, borderRadius: theme.radius.md, marginTop: 6.8 },
      ]}
    >
      <Text style={[styles.userName, { color: theme.colors.text }]}>{cohort.code}</Text>
      <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>
        {cohort.name}
        {when ? ` · ${when}` : ''}
      </Text>
    </View>
  );
}

function formatCohortWhen(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('es-EC', { dateStyle: 'medium' });
}

function Pager({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pagerButton,
        {
          borderColor: theme.colors.divider,
          borderRadius: theme.radius.sm,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text style={[styles.pagerLabel, { color: theme.colors.text }]}>{label}</Text>
    </Pressable>
  );
}

function UserRow({ user, query }: { user: ManagedUser; query: string }) {
  const theme = useTheme();
  const change = useChangeRole(query);

  const message =
    change.error instanceof ApiError
      ? change.error.code === 'cannot_demote_yourself'
        ? 'No puedes cambiar tu propio rol.'
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
  tabs: { flexDirection: 'row', gap: 6.8, paddingBottom: 3.4 },
  tab: { borderWidth: 1, minHeight: 44, justifyContent: 'center', paddingHorizontal: 13.6, paddingVertical: 6.8 },
  tabLabel: { fontSize: 13, fontWeight: '600' },
  panelBlock: { gap: 6.8 },
  sectionTitle: { fontSize: 20, fontWeight: '600', marginTop: 20.4 },
  pager: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10.2,
    flexWrap: 'wrap',
    gap: 6.8,
  },
  pagerActions: { flexDirection: 'row', gap: 6.8 },
  pagerButton: { borderWidth: 1, paddingHorizontal: 13.6, paddingVertical: 6.8, minHeight: 36 },
  pagerLabel: { fontSize: 13, fontWeight: '600' },
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
