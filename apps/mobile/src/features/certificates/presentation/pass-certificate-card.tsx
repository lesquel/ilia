import { Link } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { INSTITUTE_SHORT_NAME } from '@/core/brand';
import { ApiError } from '@/core/errors/api-error';
import { useTheme } from '@/core/theme';
import { useSession } from '@/features/auth';
import { useEntitlements } from '@/features/billing';
import {
  useEligibility,
  useIssueCertificate,
  useMyCertificates,
} from '@/features/certificates/application/use-certificates';
import {
  CERTIFICATE_PROOF,
  PLAN_BLOCKS_CERTIFICATE,
} from '@/features/certificates/domain/copy';

/**
 * The verification code, offered at the moment the practice counts.
 *
 * The course page already has a panel. This one lives on the result so a
 * teacher who just passed does not have to go hunting for the code.
 */
export function PassCertificateCard({
  slug,
  courseTitle,
}: {
  slug: string;
  courseTitle: string;
}) {
  const theme = useTheme();
  const { user } = useSession();
  const { eligibility, isLoading } = useEligibility(slug);
  const { certificates } = useMyCertificates();
  const { entitlements } = useEntitlements();
  const issue = useIssueCertificate(slug);

  const existing = certificates.find((certificate) => certificate.courseTitle === courseTitle);
  const canIssue = entitlements === null || entitlements.canIssueCertificates;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.accent,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <View style={styles.kickerRow}>
        <View style={[styles.signal, { backgroundColor: theme.colors.accent }]} />
        <Text style={[styles.kicker, { color: theme.colors.accent }]}>
          Instituto {INSTITUTE_SHORT_NAME}
        </Text>
      </View>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        {existing || eligibility?.met ? `Pasaste ${courseTitle}` : 'La práctica ya cuenta'}
      </Text>
      {user ? (
        <Text style={[styles.holder, { color: theme.colors.neutral[700] }]}>{user.fullName}</Text>
      ) : null}
      <Text style={[styles.lede, { color: theme.colors.neutral[600] }]}>
        {CERTIFICATE_PROOF} La evidencia es tu pedido y la hoja que salió.
      </Text>

      {existing ? (
        <>
          <Text selectable style={[styles.code, { color: theme.colors.text }]}>
            {existing.code}
          </Text>
          <Link href="/certificates" style={[styles.link, { color: theme.colors.accent }]}>
            Ver tus certificados
          </Link>
        </>
      ) : isLoading ? (
        <ActivityIndicator color={theme.colors.accent} />
      ) : eligibility && !eligibility.met ? (
        eligibility.missing.map((item) => (
          <Text key={item} style={[styles.missing, { color: theme.colors.neutral[700] }]}>
            {item}
          </Text>
        ))
      ) : !canIssue ? (
        <>
          <Text style={[styles.missing, { color: theme.colors.neutral[700] }]}>
            {PLAN_BLOCKS_CERTIFICATE}
          </Text>
          <Link href="/plans" style={[styles.link, { color: theme.colors.accent }]}>
            Ver planes
          </Link>
        </>
      ) : (
        <>
          {issue.isError ? (
            <Text style={[styles.missing, { color: theme.colors.accentRamp[700] }]}>
              {issue.error instanceof ApiError && issue.error.code === 'criteria_not_met'
                ? 'Todavía falta algo en el curso.'
                : 'No pudimos emitir el certificado. Prueba de nuevo.'}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={issue.isPending}
            onPress={() => issue.mutate()}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: theme.colors.text,
                borderRadius: theme.radius.md,
                opacity: issue.isPending ? 0.6 : pressed ? 0.85 : 1,
              },
            ]}
          >
            {issue.isPending ? (
              <ActivityIndicator color="#f2f2f3" />
            ) : (
              <Text style={styles.buttonLabel}>Emitir el certificado</Text>
            )}
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 22, gap: 8 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  signal: { width: 8, height: 8 },
  kicker: { fontSize: 13, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5, lineHeight: 28 },
  holder: { fontSize: 16 },
  lede: { fontSize: 14, lineHeight: 21 },
  code: { fontSize: 20, fontWeight: '700', letterSpacing: 2, marginTop: 4 },
  link: { fontSize: 14, fontWeight: '600' },
  missing: { fontSize: 14, lineHeight: 21 },
  button: {
    marginTop: 6,
    paddingVertical: 13.6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonLabel: { color: '#f2f2f3', fontSize: 15, fontWeight: '600' },
});
