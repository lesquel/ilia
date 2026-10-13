import { Check, X } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon } from '@/core/ui/icon';
import { ProgressBar } from '@/core/ui/progress-bar';
import { LoadingState } from '@/core/ui/state-view';
import { Card, FieldLabel, ScreenHeader, Tag, useIsWide } from '@/core/ui/surface';
import { useSession } from '@/features/auth';
import { useEntitlements, usePlans } from '@/features/billing/application/use-billing';
import {
  formatQuota,
  levelsLabel,
  priceLine,
  type Entitlements,
  type Plan,
} from '@/features/billing/domain/entities';
import { CERTIFICATE_PLAN_FEATURE } from '@/features/certificates/domain/copy';

export function PlansScreen() {
  const theme = useTheme();
  const isWide = useIsWide();
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
      <ScreenHeader title="Planes" />

      {entitlements ? <CurrentPlan entitlements={entitlements} /> : null}

      <View style={isWide ? styles.plansWide : styles.plans}>
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrent={entitlements?.plan.code === plan.code}
          />
        ))}
      </View>

      <Text style={[styles.note, { color: theme.colors.neutral[600] }]}>
        Los cupos y el precio del plan pago todavía están por definir con el equipo. Cuando se
        decidan, cambian sin necesidad de una nueva versión de la app.
      </Text>
    </ScrollView>
  );
}

function CurrentPlan({ entitlements }: { entitlements: Entitlements }) {
  const theme = useTheme();
  const { plan } = entitlements;

  return (
    <Card>
      <View style={styles.currentHead}>
        <Text style={[styles.currentTitle, { color: theme.colors.text }]}>
          Tu plan: {plan.name}
        </Text>
        <Tag label="Plan actual" tone="accent" filled />
      </View>

      {entitlements.evaluationsRemaining === null ? (
        <Text style={[styles.meta, { color: theme.colors.neutral[800] }]}>
          Evaluaciones sin límite.
        </Text>
      ) : (
        <View style={styles.quota}>
          {/* The bar fills with what was spent; the sentence under it says
              what is left, which is the number a teacher plans around. */}
          <FieldLabel>Cupo usado este mes</FieldLabel>
          <ProgressBar
            percentage={
              plan.monthlyEvaluations
                ? (entitlements.evaluationsUsed * 100) / plan.monthlyEvaluations
                : 0
            }
            label={`${entitlements.evaluationsRemaining} de ${plan.monthlyEvaluations} evaluaciones disponibles este mes`}
          />
          {/* The renewal date, spelled out. A quota you cannot predict is a
              quota you ration anxiously. */}
          <Text style={[styles.meta, { color: theme.colors.neutral[800] }]}>
            El cupo se renueva el día 1 de cada mes.
          </Text>
        </View>
      )}
    </Card>
  );
}

function PlanCard({ plan, isCurrent }: { plan: Plan; isCurrent: boolean }) {
  const theme = useTheme();
  const price = priceLine(plan);

  return (
    <Card style={[styles.card, isCurrent ? { borderColor: theme.colors.accent } : undefined]}>
      <View style={styles.planHead}>
        <View style={styles.planName}>
          <Text style={[styles.name, { color: theme.colors.text }]}>{plan.name}</Text>
          {isCurrent ? <Tag label="Tu plan" tone="accent" filled /> : null}
        </View>
        {price ? (
          <Text style={[styles.price, { color: theme.colors.accentRamp[700] }]}>{price}</Text>
        ) : null}
        <Text style={[styles.description, { color: theme.colors.neutral[800] }]}>
          {plan.description}
        </Text>
      </View>

      <View style={[styles.features, { borderTopColor: theme.colors.divider }]}>
        <Feature text={formatQuota(plan.monthlyEvaluations)} included />
        <Feature text={`Rutas: ${levelsLabel(plan.allowedLevels)}`} included />
        <Feature text={CERTIFICATE_PLAN_FEATURE} included={plan.canIssueCertificates} />
        <Feature text="Participar en el foro" included={plan.canPostInForum} />
        <Feature text="Leer el foro" included />
      </View>
    </Card>
  );
}

/** One line of a plan: an icon, the item, and the state said in words. */
function Feature({ text, included }: { text: string; included: boolean }) {
  const theme = useTheme();
  const state = included ? 'Incluido' : 'No incluido';

  return (
    <View style={styles.feature} accessibilityLabel={`${text}: ${state}`}>
      <View style={styles.featureIcon}>
        <Icon
          glyph={included ? Check : X}
          size={16}
          color={included ? theme.colors.accent : theme.colors.neutral[500]}
        />
      </View>
      <Text
        style={[
          styles.featureText,
          { color: included ? theme.colors.text : theme.colors.neutral[600] },
        ]}
      >
        {text}
      </Text>
      <Text
        style={[
          styles.featureState,
          { color: included ? theme.colors.accentRamp[800] : theme.colors.neutral[800] },
        ]}
      >
        {state}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 40 },
  content: {
    padding: 20.4,
    maxWidth: 1080,
    width: '100%',
    alignSelf: 'center',
    gap: 20.4,
  },
  currentHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10.2 },
  currentTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  quota: { gap: 3.4 },
  meta: { fontSize: 13, lineHeight: 19 },
  plans: { gap: 13.6 },
  plansWide: { flexDirection: 'row', alignItems: 'stretch', gap: 13.6 },
  // Equal shares of the row, so two plans read as a comparison.
  card: { flex: 1, minWidth: 0 },
  planHead: { gap: 6.8 },
  planName: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10.2 },
  name: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  price: { fontSize: 16, fontWeight: '600' },
  description: { fontSize: 14, lineHeight: 21 },
  features: { gap: 10.2, paddingTop: 13.6, borderTopWidth: 1 },
  feature: { flexDirection: 'row', alignItems: 'flex-start', gap: 10.2 },
  // Drops the icon onto the first line of text when the item wraps.
  featureIcon: { paddingTop: 2 },
  featureText: { flex: 1, minWidth: 0, fontSize: 14, lineHeight: 20 },
  featureState: { fontSize: 12, fontWeight: '700', lineHeight: 20 },
  note: { fontSize: 12, lineHeight: 18 },
});
