import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { EmptyState, ErrorState, LoadingState } from '@/core/ui/state-view';
import { useAuditLog } from '@/features/admin/application/use-admin';
import {
  ACTION_LABELS,
  AUDIT_VISIBLE_ROWS,
  auditFooter,
  type AuditEntry,
} from '@/features/admin/domain/entities';
import {
  Card,
  HeaderCell,
  ListHeader,
  ListRow,
  Tag,
  useIsWide,
} from '@/features/admin/presentation/ui';

export function AuditPanel() {
  const theme = useTheme();
  const { entries, total, isLoading, error, refetch } = useAuditLog();
  const visible = entries.slice(0, AUDIT_VISIBLE_ROWS);
  const footer = auditFooter(visible.length, total);

  return (
    <Card
      title="Auditoría"
      hint="Registro de acciones sensibles. Solo se agrega: nada de aquí se puede editar."
    >
      {isLoading ? <LoadingState label="Cargando auditoría…" /> : null}
      {error ? <ErrorState error={error} onRetry={() => void refetch()} /> : null}
      {!isLoading && !error && entries.length === 0 ? (
        <EmptyState title="Todavía no hay acciones registradas" />
      ) : null}

      {entries.length > 0 ? (
        <View>
          <ListHeader>
            <HeaderCell label="Acción" style={styles.actionCell} />
            <HeaderCell label="Detalle" style={styles.detailCell} />
            <HeaderCell label="Cuándo" style={styles.whenCell} />
          </ListHeader>
          {visible.map((entry) => (
            <AuditRow key={entry.id} entry={entry} />
          ))}
        </View>
      ) : null}

      {footer ? (
        <Text style={[styles.meta, { color: theme.colors.neutral[800] }]}>{footer}</Text>
      ) : null}
    </Card>
  );
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const theme = useTheme();
  const isWide = useIsWide();
  const muted = theme.colors.neutral[800];
  const when = formatAuditWhen(entry.occurredAt);

  return (
    <ListRow>
      <View style={[styles.action, isWide ? styles.actionCell : undefined]}>
        <Tag label={ACTION_LABELS[entry.action] ?? entry.action} tone="accent" filled />
        <Text style={[styles.meta, { color: muted }]} numberOfLines={1}>
          {entry.actorName}
        </Text>
      </View>
      {/* The detail is the raw record: two lines keep a long id or hash from
          pushing the rest of the log off the screen. */}
      <Text
        style={[styles.detail, { color: muted }, isWide ? styles.detailCell : undefined]}
        numberOfLines={2}
      >
        {JSON.stringify(entry.detail)}
      </Text>
      {when || isWide ? (
        <Text style={[styles.meta, { color: muted }, isWide ? styles.whenCell : undefined]}>
          {when ?? '—'}
        </Text>
      ) : null}
    </ListRow>
  );
}

function formatAuditWhen(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' });
}

const styles = StyleSheet.create({
  meta: { fontSize: 13, lineHeight: 19 },
  action: { gap: 6.8, minWidth: 0 },
  detail: { fontSize: 12, lineHeight: 18 },
  actionCell: { width: 240 },
  detailCell: { flex: 1, minWidth: 0 },
  whenCell: { width: 160 },
});
