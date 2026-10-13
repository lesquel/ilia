import type { Href } from 'expo-router';
import { Award, CalendarDays, ExternalLink, ShieldCheck, UserRound } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { breakpoint, useTheme } from '@/core/theme';
import { EmptyState, ErrorState, LoadingState } from '@/core/ui/state-view';
import { Card, Fact, OutlineLink, ScreenHeader, SubCard, Tag } from '@/core/ui/surface';
import { useSession } from '@/features/auth';
import { useMyCertificates } from '@/features/certificates/application/use-certificates';
import { CERTIFICATE_PROOF } from '@/features/certificates/domain/copy';
import { formatIssueDate, type Certificate } from '@/features/certificates/domain/entities';

const CONTENT_MAX_WIDTH = 960;
const CONTENT_PADDING = 20.4;
const GRID_GAP = 13.6;

export function MyCertificatesScreen() {
  const { width } = useWindowDimensions();
  const { isAuthenticated, isLoading: isCheckingSession } = useSession();
  const { certificates, isLoading, error, refetch } = useMyCertificates();

  if (isCheckingSession) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (!isAuthenticated) {
    return (
      <Screen>
        {/* Carrying the destination, so signing in returns here rather than
            dropping the person on the catalogue. */}
        <EmptyState
          glyph={Award}
          title="Inicia sesión para ver tus certificados"
          hint="Tus certificados quedan guardados en tu cuenta."
          action={{ label: 'Iniciar sesión', href: '/login?next=/certificates' as Href }}
        />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState error={error} onRetry={() => void refetch()} />
      </Screen>
    );
  }

  // Two across when there is room; a lone certificate keeps one column's width
  // instead of stretching over the page.
  const columns = width >= breakpoint.compact ? 2 : 1;
  const contentWidth = Math.min(width, CONTENT_MAX_WIDTH) - CONTENT_PADDING * 2;
  const cardWidth = (contentWidth - GRID_GAP * (columns - 1)) / columns;

  return (
    <Screen>
      <ScreenHeader
        title="Certificados"
        subtitle={CERTIFICATE_PROOF}
        actions={<OutlineLink href="/verify" label="Verificar un certificado" glyph={ShieldCheck} />}
      />

      {isLoading ? (
        <LoadingState label="Cargando tus certificados…" />
      ) : certificates.length === 0 ? (
        <EmptyState
          glyph={Award}
          title="Todavía no tienes certificados"
          hint="Completa las lecciones y aprueba las actividades de un curso para obtener el tuyo."
          action={{ label: 'Explorar cursos', href: '/catalog' }}
        />
      ) : (
        <View style={columns > 1 ? styles.grid : styles.stack}>
          {certificates.map((certificate) => (
            <View key={certificate.id} style={columns > 1 ? { width: cardWidth } : undefined}>
              <CertificateCard certificate={certificate} />
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

function Screen({ children }: { children: ReactNode }) {
  const theme = useTheme();

  return (
    <ScrollView style={{ backgroundColor: theme.colors.bg }} contentContainerStyle={styles.content}>
      {children}
    </ScrollView>
  );
}

function CertificateCard({ certificate }: { certificate: Certificate }) {
  const theme = useTheme();
  const valid = certificate.status === 'valid';

  return (
    <Card style={styles.card}>
      <Tag label={valid ? 'Válido' : 'Revocado'} tone={valid ? 'accent' : 'neutral'} filled={valid} />

      <View style={styles.head}>
        <Text style={[styles.course, { color: theme.colors.text }]}>{certificate.courseTitle}</Text>
        <View style={styles.facts}>
          <Fact glyph={UserRound} label={certificate.holderName} />
          {certificate.issuedAt ? (
            <Fact
              glyph={CalendarDays}
              label={`Emitido el ${formatIssueDate(certificate.issuedAt)}`}
            />
          ) : null}
        </View>
      </View>

      {/* The code is the certificate: it gets the frame and the largest type. */}
      <SubCard style={{ backgroundColor: theme.colors.neutral[100] }}>
        <Text style={[styles.codeLabel, { color: theme.colors.neutral[800] }]}>
          Código de verificación
        </Text>
        <Text selectable style={[styles.code, { color: theme.colors.text }]}>
          {certificate.code}
        </Text>
      </SubCard>

      {/* A real link, so the holder can send it to whoever needs to check. */}
      <View style={styles.actions}>
        <OutlineLink
          href={`/verify/${certificate.code}`}
          label="Ver la página de verificación"
          glyph={ExternalLink}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: CONTENT_PADDING,
    maxWidth: CONTENT_MAX_WIDTH,
    width: '100%',
    alignSelf: 'center',
    gap: 20.4,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: GRID_GAP },
  stack: { gap: GRID_GAP },
  card: { flexGrow: 1 },
  head: { gap: 6.8 },
  course: { fontSize: 20, fontWeight: '700', lineHeight: 26, letterSpacing: -0.2 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 13.6, rowGap: 3.4 },
  codeLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  code: { fontSize: 24, fontWeight: '700', letterSpacing: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10.2 },
});
