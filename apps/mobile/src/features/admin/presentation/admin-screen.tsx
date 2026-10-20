import type { LucideIcon } from 'lucide-react-native';
import { Award, Cpu, LayoutDashboard, ScrollText, Ticket, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/core/errors/api-error';
import { useTheme } from '@/core/theme';
import { Icon } from '@/core/ui/icon';
import { EmptyState, ErrorState, LoadingState } from '@/core/ui/state-view';
import { useOverview } from '@/features/admin/application/use-admin';
import { AuditPanel } from '@/features/admin/presentation/audit-panel';
import { CohortPanel } from '@/features/admin/presentation/cohort-panel';
import { OverviewPanel } from '@/features/admin/presentation/overview-panel';
import { Card } from '@/features/admin/presentation/ui';
import { UsagePanel } from '@/features/admin/presentation/usage-panel';
import { UsersPanel } from '@/features/admin/presentation/users-panel';
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
      <Text style={[styles.title, { color: theme.colors.text }]} accessibilityRole="header">Administración</Text>
      {/* One row that scrolls sideways on a phone: six tabs wrapped onto three
          lines would push the section itself below the fold. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabStrip}
        contentContainerStyle={styles.tabs}
      >
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
                  backgroundColor: selected ? theme.colors.accentButton : theme.colors.surface,
                  borderColor: selected ? theme.colors.accent : theme.colors.divider,
                  borderRadius: theme.radius.md,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Icon
                glyph={tab.glyph}
                size={16}
                color={selected ? '#ffffff' : theme.colors.accent}
              />
              <Text style={[styles.tabLabel, { color: selected ? '#ffffff' : theme.colors.text }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {activeTab === 'overview' ? <OverviewPanel overview={overview} /> : null}
      {activeTab === 'users' ? <UsersPanel /> : null}
      {activeTab === 'cohorts' ? <CohortPanel /> : null}
      {activeTab === 'certificates' ? (
        <Card style={styles.revokeCard}>
          <RevokePanel />
        </Card>
      ) : null}
      {activeTab === 'usage' ? <UsagePanel /> : null}
      {activeTab === 'audit' ? <AuditPanel /> : null}
    </ScrollView>
  );
}

type AdminTab = 'overview' | 'users' | 'cohorts' | 'certificates' | 'usage' | 'audit';
const ADMIN_TABS: { id: AdminTab; label: string; glyph: LucideIcon }[] = [
  { id: 'overview', label: 'Resumen', glyph: LayoutDashboard },
  { id: 'users', label: 'Usuarios y roles', glyph: Users },
  { id: 'cohorts', label: 'Cohortes', glyph: Ticket },
  { id: 'certificates', label: 'Certificados', glyph: Award },
  { id: 'usage', label: 'LLM y uso', glyph: Cpu },
  { id: 'audit', label: 'Auditoría', glyph: ScrollText },
];

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 40 },
  content: {
    padding: 20.4,
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
    gap: 20.4,
  },
  title: { fontSize: 32, fontWeight: '600' },
  // Without this a horizontal ScrollView stretches to the height of its column.
  tabStrip: { flexGrow: 0 },
  tabs: { flexDirection: 'row', gap: 6.8, paddingBottom: 3.4 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6.8,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: 13.6,
    paddingVertical: 6.8,
  },
  tabLabel: { fontSize: 13, fontWeight: '600' },
  // The revoke panel belongs to the certificates feature and brings its own
  // top margin; the card's padding would add to it.
  revokeCard: { paddingTop: 0 },
});
