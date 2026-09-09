import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { ProgressBar } from '@/core/ui/progress-bar';
import { LoadingState } from '@/core/ui/state-view';
import { useSession } from '@/features/auth';
import { useEntitlements, usePlans } from '@/features/billing/application/use-billing';
import {
  formatPrice,
  formatQuota,
  levelsLabel,
  type Plan,
} from '@/features/billing/domain/entities';

export function PlansScreen() {
  const theme = useTheme();
  const { isAuthenticated } = useSession();
  const { plans, isLoading } = usePlans();
  const { entitlements } = useEntitlements({ enabled: isAuthenticated });

  if (isLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        <LoadingState label="Cargando los planes…" />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: theme.colors.text }]}>Planes</Text>

      {entitlements ? (
        <View
          style={[
            styles.current,
            {
              backgroundColor: theme.colors.accentRamp[100],
              borderColor: theme.colors.accent,
              borderRadius: theme.radius.md,
            },
          ]}
        >
          <Text style={[styles.currentTitle, { color: theme.colors.accentRamp[800] }]}>
            Tu plan: {entitlements.plan.name}
          </Text>

          {entitlements.evaluationsRemaining === null ? (
            <Text style={[styles.meta, { color: theme.colors.accentRamp[800] }]}>
              Evaluaciones sin límite.
            </Text>
          ) : (
            <View style={styles.quota}>
              <ProgressBar
                percentage={
                  entitlements.plan.monthlyEvaluations
                    ? (entitlements.evaluationsUsed * 100) /
                      entitlements.plan.monthlyEvaluations
                    : 0
                }
                label={`${entitlements.evaluationsRemaining} de ${entitlements.plan.monthlyEvaluations} evaluaciones disponibles este mes`}
              />
              {/* The renewal date, spelled out. A quota you cannot predict is a
                  quota you ration anxiously. */}
              <Text style={[styles.meta, { color: theme.colors.accentRamp[800] }]}>
                El cupo se renueva el día 1 de cada mes.
              </Text>
            </View>
          )}
        </View>
      ) : null}

      {plans.map((plan) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          isCurrent={entitlements?.plan.code === plan.code}
        />
      ))}

      <Text style={[styles.note, { color: theme.colors.neutral[600] }]}>
        Los cupos y el precio del plan pago todavía están por definir con el equipo. Cuando se
        decidan, cambian sin necesidad de una nueva versión de la app.
      </Text>
    </ScrollView>
  );
}

function PlanCard({ plan, isCurrent }: { plan: Plan; isCurrent: boolean }) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.neutral[100],
          borderColor: isCurrent ? theme.colors.accent : theme.colors.divider,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <Text style={[styles.planName, { color: theme.colors.text }]}>{plan.name}</Text>
      <Text style={[styles.price, { color: theme.colors.accentRamp[700] }]}>
        {formatPrice(plan.priceCents)}
      </Text>
      <Text style={[styles.description, { color: theme.colors.neutral[700] }]}>
        {plan.description}
      </Text>

      <View style={styles.features}>
        <Feature text={formatQuota(plan.monthlyEvaluations)} included />
        <Feature text={`Rutas: ${levelsLabel(plan.allowedLevels)}`} included />
        <Feature text="Certificado descargable" included={plan.canIssueCertificates} />
        <Feature text="Participar en el foro" included={plan.canPostInForum} />
        <Feature text="Leer el foro" included />
      </View>
    </View>
  );
}

function Feature({ text, included }: { text: string; included: boolean }) {
  const theme = useTheme();

  return (
    <Text
      style={[
        styles.feature,
        { color: included ? theme.colors.text : theme.colors.neutral[500] },
      ]}
    >
      {included ? '✓' : '✕'} {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 40 },
  content: {
    padding: 20.4,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
    gap: 13.6,
    paddingTop: 40,
  },
  title: { fontSize: 32, fontWeight: '600' },
  current: { borderWidth: 1, padding: 20.4, gap: 6.8 },
  currentTitle: { fontSize: 18, fontWeight: '600' },
  quota: { gap: 6.8, marginTop: 3.4 },
  meta: { fontSize: 13, lineHeight: 19 },
  card: { borderWidth: 1, padding: 20.4, gap: 6.8 },
  planName: { fontSize: 22, fontWeight: '600' },
  price: { fontSize: 16, fontWeight: '600' },
  description: { fontSize: 14, lineHeight: 21 },
  features: { gap: 3.4, marginTop: 6.8 },
  feature: { fontSize: 14, lineHeight: 21 },
  note: { fontSize: 12, lineHeight: 18, marginTop: 6.8 },
});
