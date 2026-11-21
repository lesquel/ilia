import { Copy, Share2 } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Platform, Share, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { OutlineButton, PrimaryButton, SubCard } from '@/core/ui/surface';
import { formatIssueDate, type Certificate } from '@/features/certificates/domain/entities';
import { env } from '@/core/config/env';
import { shareMessage, verificationUrl } from '@/features/certificates/domain/share';

import { CertificateQr } from './certificate-qr';

/**
 * Where the verification link points. The configured web address wins; a web
 * page can fall back to its own origin; a phone without the setting has none.
 */
export function publicOrigin(): string | undefined {
  if (env.webBaseUrl) return env.webBaseUrl;
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin;
  return undefined;
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** A card the holder can show or send: the certificate, its code and a QR to the check page. */
export function ShareCertificateCard({ certificate }: { certificate: Certificate }) {
  const theme = useTheme();
  const [notice, setNotice] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const url = verificationUrl(publicOrigin() ?? '', certificate.code);
  const message = shareMessage(certificate, url);
  const issued = formatIssueDate(certificate.issuedAt);
  const isWeb = Platform.OS === 'web';
  const canCopy = isWeb && typeof navigator !== 'undefined' && Boolean(navigator.clipboard);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function announce(text: string) {
    setNotice(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(null), 3000);
  }

  async function copyLink() {
    announce((await copyToClipboard(url)) ? 'Enlace copiado' : 'No se pudo copiar el enlace');
  }

  async function share() {
    if (!isWeb) {
      // iOS shows `url` as a link; Android only reads `message`, which carries it too.
      await Share.share({ message, url, title: 'Certificado ILIA' }).catch(() => undefined);
      return;
    }
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Certificado ILIA', text: message, url });
        return;
      } catch (error) {
        // Closing the share sheet is a choice, not a failure.
        if (error instanceof Error && error.name === 'AbortError') return;
      }
    }
    await copyLink();
  }

  return (
    <SubCard style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
      <View style={styles.body}>
        <View style={styles.qr}>
          <CertificateQr value={url} />
        </View>
        <View style={styles.text}>
          <Text style={[styles.course, { color: theme.colors.text }]}>{certificate.courseTitle}</Text>
          <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>{certificate.holderName}</Text>
          {issued ? (
            <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>Emitido el {issued}</Text>
          ) : null}
          <Text selectable style={[styles.code, { color: theme.colors.text }]}>
            {certificate.code}
          </Text>
          <Text style={[styles.hint, { color: theme.colors.neutral[600] }]}>
            Quien escanee el código verá si tu certificado es válido.
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="Compartir" glyph={Share2} onPress={() => void share()} />
        {canCopy ? (
          <OutlineButton label="Copiar enlace" glyph={Copy} onPress={() => void copyLink()} />
        ) : null}
      </View>
      {notice ? (
        <Text accessibilityLiveRegion="polite" style={[styles.hint, { color: theme.colors.text }]}>
          {notice}
        </Text>
      ) : null}
    </SubCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 13.6, borderWidth: 1 },
  body: { flexDirection: 'row', flexWrap: 'wrap', gap: 13.6, alignItems: 'center' },
  qr: { padding: 3.4, backgroundColor: '#ffffff', borderRadius: 8 },
  text: { flex: 1, minWidth: 160, gap: 3.4 },
  course: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
  meta: { fontSize: 14, lineHeight: 20 },
  code: { fontSize: 18, fontWeight: '700', letterSpacing: 1.6, marginTop: 3.4 },
  hint: { fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10.2 },
});
