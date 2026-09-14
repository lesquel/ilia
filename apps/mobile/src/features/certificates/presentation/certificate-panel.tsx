import { Link } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/core/errors/api-error';
import { useTheme } from '@/core/theme';
import { useSession } from '@/features/auth';
import { useEntitlements } from '@/features/billing';
import {
  useEligibility,
  useIssueCertificate,
  useMyCertificates,
} from '@/features/certificates/application/use-certificates';

/**
 * The certificate box on a course page.
 *
 * Shows nothing at all until the teacher is enrolled: an empty promise on a
 * course you have not joined is noise, and this screen already has plenty.
 */
export function CertificatePanel({ slug, courseTitle }: { slug: string; courseTitle?: string }) {
  const theme = useTheme();
  const { isAuthenticated } = useSession();
  const { eligibility, isLoading } = useEligibility(slug, { enabled: isAuthenticated });
  const { certificates } = useMyCertificates();
  const { entitlements } = useEntitlements({ enabled: isAuthenticated });
  const issue = useIssueCertificate(slug);

  if (!isAuthenticated || isLoading || !eligibility) return null;

  const existing = certificates.find((item) => item.courseTitle === courseTitle);

  if (existing) {
    return (
      <View
        style={[
          styles.panel,
          {
            borderColor: theme.colors.accent,
            backgroundColor: theme.colors.accentRamp[100],
            borderRadius: theme.radius.md,
          },
        ]}
      >
        <Text style={[styles.title, { color: theme.colors.accentRamp[800] }]}>
          Ya tienes tu certificado 🎓
        </Text>
        <Text selectable style={[styles.code, { color: theme.colors.accentRamp[800] }]}>
          {existing.code}
        </Text>
        <Link href="/certificates" style={[styles.link, { color: theme.colors.accent }]}>
          Ver mis certificados →
        </Link>
      </View>
    );
  }

  if (!eligibility.met) {
    return (
      <View
        style={[styles.panel, { borderColor: theme.colors.divider, borderRadius: theme.radius.md }]}
      >
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Para tu certificado te falta
        </Text>
        {/* The reasons, not just a "no". Telling someone who has been working
            that they are "not eligible" and stopping there is the most
            frustrating thing this product could do. */}
        {eligibility.missing.map((item) => (
          <Text key={item} style={[styles.missing, { color: theme.colors.neutral[700] }]}>
            • {item}
          </Text>
        ))}
      </View>
    );
  }

  // Eligibility is shown to everyone; only the download is gated. A teacher who
  // earned it should know they earned it.
  const canDownload = entitlements === null || entitlements.canIssueCertificates;

  if (!canDownload) {
    return (
      <View
        style={[
          styles.panel,
          {
            borderColor: theme.colors.accent,
            backgroundColor: theme.colors.accentRamp[100],
            borderRadius: theme.radius.md,
          },
        ]}
      >
        <Text style={[styles.title, { color: theme.colors.accentRamp[800] }]}>
          Completaste todo lo que pide este curso 🎉
        </Text>
        <Text style={[styles.missing, { color: theme.colors.accentRamp[800] }]}>
          El certificado descargable no está incluido en tu plan actual.
        </Text>
        <Link href="/plans" style={[styles.link, { color: theme.colors.accent }]}>
          Ver planes →
        </Link>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.panel,
        {
          borderColor: theme.colors.accent,
          backgroundColor: theme.colors.accentRamp[100],
          borderRadius: theme.radius.md,
        },
      ]}
    >
      <Text style={[styles.title, { color: theme.colors.accentRamp[800] }]}>
        Completaste todo lo que pide este curso
      </Text>

      {issue.isError ? (
        <Text style={[styles.missing, { color: theme.colors.accentRamp[800] }]}>
          {issue.error instanceof ApiError && issue.error.code === 'criteria_not_met'
            ? 'Todavía falta algo. Recargá la página para ver qué.'
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
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.md,
            opacity: issue.isPending ? 0.6 : pressed ? 0.85 : 1,
          },
        ]}
      >
        {issue.isPending ? (
          <ActivityIndicator color="#f2f2f3" />
        ) : (
          <Text style={styles.buttonLabel}>Obtener mi certificado</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderWidth: 1, padding: 20.4, gap: 6.8, marginBottom: 13.6 },
  title: { fontSize: 16, fontWeight: '600' },
  missing: { fontSize: 14, lineHeight: 21 },
  code: { fontSize: 20, fontWeight: '600', letterSpacing: 2 },
  link: { fontSize: 14, fontWeight: '600' },
  button: {
    marginTop: 6.8,
    paddingVertical: 13.6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonLabel: { color: '#f2f2f3', fontSize: 16, fontWeight: '600' },
});
