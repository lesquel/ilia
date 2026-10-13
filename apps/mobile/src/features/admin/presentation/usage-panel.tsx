import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { EmptyState, ErrorState, LoadingState } from '@/core/ui/state-view';
import { useUsage } from '@/features/admin/application/use-admin';
import { formatTokens, type UsageByUser } from '@/features/admin/domain/entities';
import {
  Card,
  EmptyNote,
  HeaderCell,
  ListHeader,
  ListRow,
  useIsWide,
} from '@/features/admin/presentation/ui';

export function UsagePanel() {
  const theme = useTheme();
  const { report, isLoading, error, refetch } = useUsage(30);
  const muted = theme.colors.neutral[800];

  return (
    <View style={styles.panel}>
      <Card title="Consumo de LLM · últimos 30 días">
        {isLoading ? <LoadingState label="Cargando uso de LLM…" /> : null}
        {error ? <ErrorState error={error} onRetry={() => void refetch()} /> : null}
        {!isLoading && !error && !report ? <EmptyState title="No hay datos de uso" /> : null}
        {report ? (
          <View style={styles.totals}>
            <Text style={[styles.big, { color: theme.colors.text }]}>
              {formatTokens(report.totals.totalTokens)} tokens
            </Text>
            <Text style={[styles.meta, { color: muted }]}>
              {formatTokens(report.totals.inputTokens)} de entrada ·{' '}
              {formatTokens(report.totals.outputTokens)} de salida · {report.totals.evaluations}{' '}
              evaluaciones
            </Text>
            {report.totals.pricesConfigured ? (
              <Text style={[styles.cost, { color: theme.colors.accentRamp[800] }]}>
                Costo estimado: USD {report.totals.estimatedCost.toFixed(2)}
              </Text>
            ) : (
              <Text style={[styles.meta, { color: muted }]}>
                Sin precios configurados: no se puede estimar el costo.
              </Text>
            )}
          </View>
        ) : null}
      </Card>

      {report ? (
        <Card title="Quiénes consumen más">
          {report.byUser.length > 0 ? (
            <View>
              <ListHeader>
                <HeaderCell label="Persona" style={styles.whoCell} />
                <HeaderCell label="Tokens" style={styles.numberCell} />
                <HeaderCell label="Evaluaciones" style={styles.numberCell} />
              </ListHeader>
              {report.byUser.slice(0, 10).map((row) => (
                <UsageRow key={row.userId} row={row} />
              ))}
            </View>
          ) : (
            <EmptyNote>Todavía no hay consumo registrado.</EmptyNote>
          )}
        </Card>
      ) : null}
    </View>
  );
}

function UsageRow({ row }: { row: UsageByUser }) {
  const theme = useTheme();
  const isWide = useIsWide();
  const muted = theme.colors.neutral[800];

  return (
    <ListRow>
      <View style={[styles.who, isWide ? styles.whoCell : undefined]}>
        <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
          {row.fullName}
        </Text>
        <Text style={[styles.meta, { color: muted }]} numberOfLines={1}>
          {row.email}
        </Text>
      </View>
      {isWide ? (
        <>
          <Text style={[styles.number, styles.numberCell, { color: theme.colors.text }]}>
            {formatTokens(row.totals.totalTokens)}
          </Text>
          <Text style={[styles.number, styles.numberCell, { color: theme.colors.text }]}>
            {row.totals.evaluations}
          </Text>
        </>
      ) : (
        <Text style={[styles.meta, { color: muted }]}>
          {formatTokens(row.totals.totalTokens)} tokens · {row.totals.evaluations} evaluaciones
        </Text>
      )}
    </ListRow>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 20.4 },
  totals: { gap: 6.8 },
  big: { fontSize: 30, fontWeight: '700', lineHeight: 36, letterSpacing: -0.6 },
  meta: { fontSize: 13, lineHeight: 19 },
  cost: { fontSize: 16, fontWeight: '600' },
  who: { gap: 3.4, minWidth: 0 },
  name: { fontSize: 15, fontWeight: '600' },
  whoCell: { flex: 1, minWidth: 0 },
  numberCell: { width: 130, textAlign: 'right' },
  number: { fontSize: 14, fontWeight: '700' },
});
