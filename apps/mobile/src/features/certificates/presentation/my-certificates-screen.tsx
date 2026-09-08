import { Link } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { EmptyState, ErrorState, LoadingState } from '@/core/ui/state-view';
import { useSession } from '@/features/auth';
import { useMyCertificates } from '@/features/certificates/application/use-certificates';
import { formatIssueDate, type Certificate } from '@/features/certificates/domain/entities';

export function MyCertificatesScreen() {
  const theme = useTheme();
  const { isAuthenticated, isLoading: isCheckingSession } = useSession();
  const { certificates, isLoading, error, refetch } = useMyCertificates();

  if (isCheckingSession) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        <LoadingState />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        <EmptyState
          title="Iniciá sesión para ver tus certificados"
          hint="Tus certificados quedan guardados en tu cuenta."
        />
        <Link href="/login" style={[styles.link, { color: theme.colors.accent }]}>
          Iniciar sesión
        </Link>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        <ErrorState error={error} onRetry={() => void refetch()} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.content}
      data={certificates}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <CertificateCard certificate={item} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Certificados</Text>
          <Text style={[styles.subtitle, { color: theme.colors.neutral[600] }]}>
            Cualquiera puede comprobar que son reales con su código, sin necesidad de cuenta.
          </Text>
        </View>
      }
      ListEmptyComponent={
        isLoading ? (
          <LoadingState label="Cargando tus certificados…" />
        ) : (
          <EmptyState
            title="Todavía no tenés certificados"
            hint="Completá las lecciones y aprobá las actividades de un curso para obtener el tuyo."
          />
        )
      }
    />
  );
}

function CertificateCard({ certificate }: { certificate: Certificate }) {
  const theme = useTheme();
  const valid = certificate.status === 'valid';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: valid ? theme.colors.accentRamp[100] : theme.colors.neutral[100],
          borderColor: theme.colors.divider,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <Text
        style={[
          styles.status,
          { color: valid ? theme.colors.accentRamp[800] : theme.colors.neutral[700] },
        ]}
      >
        {valid ? 'Válido' : 'Revocado'}
      </Text>

      <Text style={[styles.course, { color: theme.colors.text }]}>{certificate.courseTitle}</Text>
      <Text style={[styles.holder, { color: theme.colors.neutral[700] }]}>
        {certificate.holderName}
      </Text>

      {certificate.issuedAt ? (
        <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>
          Emitido el {formatIssueDate(certificate.issuedAt)}
        </Text>
      ) : null}

      <Text style={[styles.codeLabel, { color: theme.colors.neutral[600] }]}>
        Código de verificación
      </Text>
      <Text selectable style={[styles.code, { color: theme.colors.text }]}>
        {certificate.code}
      </Text>

      {/* A real link, so the holder can send it to whoever needs to check. */}
      <Link
        href={`/verify/${certificate.code}`}
        style={[styles.link, { color: theme.colors.accent }]}
      >
        Ver la página de verificación →
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 27.2 },
  content: {
    padding: 20.4,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
    gap: 13.6,
  },
  header: { gap: 6.8, marginBottom: 6.8 },
  title: { fontSize: 32, fontWeight: '600' },
  subtitle: { fontSize: 15, lineHeight: 22 },
  card: { borderWidth: 1, padding: 20.4, gap: 3.4 },
  status: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 3.4,
  },
  course: { fontSize: 20, fontWeight: '600' },
  holder: { fontSize: 15 },
  meta: { fontSize: 13, marginBottom: 6.8 },
  codeLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  code: { fontSize: 22, fontWeight: '600', letterSpacing: 2, marginBottom: 6.8 },
  link: { fontSize: 14, fontWeight: '600' },
});
