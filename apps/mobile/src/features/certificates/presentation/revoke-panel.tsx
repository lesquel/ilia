import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ApiError } from '@/core/errors/api-error';
import { useTheme } from '@/core/theme';
import {
  useCertificateLookup,
  useRevokeCertificate,
} from '@/features/certificates/application/use-certificates';
import { STATUS_LABELS } from '@/features/certificates/domain/entities';

/**
 * Look up a certificate by code and revoke it (PRD A-04).
 *
 * Deliberately two steps. The admin sees whose certificate it is, for which
 * course, and its current status before invalidating it — revoking straight
 * from a typed code would make a single mistyped character enough to void a
 * stranger's credential.
 */
export function RevokePanel() {
  const theme = useTheme();
  const lookup = useCertificateLookup();
  const revoke = useRevokeCertificate();

  const [code, setCode] = useState('');
  const [reason, setReason] = useState('');

  const found = revoke.data ?? lookup.data ?? null;
  const alreadyRevoked = found?.status === 'revoked';

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.colors.neutral[100],
      borderColor: theme.colors.divider,
      color: theme.colors.text,
      borderRadius: theme.radius.sm,
    },
  ];

  const search = () => {
    if (!code.trim()) return;
    revoke.reset();
    lookup.mutate(code.trim());
  };

  return (
    <View style={styles.block}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Certificados</Text>
      <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>
        Buscá por código de verificación para revisar o anular un certificado. La anulación queda
        auditada y el certificado deja de validar.
      </Text>

      <View style={styles.searchRow}>
        <TextInput
          style={[...inputStyle, styles.grow]}
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          placeholder="ABCD-EFGH-JKMN"
          placeholderTextColor={theme.colors.neutral[500]}
          onSubmitEditing={search}
          returnKeyType="search"
          accessibilityLabel="Código de verificación"
        />
        <Pressable
          accessibilityRole="button"
          disabled={!code.trim() || lookup.isPending}
          onPress={search}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: theme.colors.accent,
              borderRadius: theme.radius.sm,
              opacity: !code.trim() ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}
        >
          {lookup.isPending ? (
            <ActivityIndicator size="small" color="#f2f2f3" />
          ) : (
            <Text style={styles.buttonLabel}>Buscar</Text>
          )}
        </Pressable>
      </View>

      {lookup.isError ? (
        <Text style={[styles.error, { color: theme.colors.accentRamp[700] }]} accessibilityRole="alert">
          {lookup.error instanceof ApiError && lookup.error.status === 404
            ? 'No encontramos ningún certificado con ese código.'
            : 'No pudimos buscar el certificado.'}
        </Text>
      ) : null}

      {found ? (
        <View
          style={[
            styles.card,
            { borderColor: theme.colors.divider, borderRadius: theme.radius.md },
          ]}
        >
          <Text style={[styles.holder, { color: theme.colors.text }]}>{found.holderName}</Text>
          <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>
            {found.courseTitle} · {found.code} · {STATUS_LABELS[found.status]}
          </Text>

          {alreadyRevoked ? (
            <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>
              Este certificado ya está anulado.
            </Text>
          ) : (
            <>
              <TextInput
                style={inputStyle}
                value={reason}
                onChangeText={setReason}
                maxLength={500}
                placeholder="Motivo de la anulación"
                placeholderTextColor={theme.colors.neutral[500]}
                accessibilityLabel="Motivo de la anulación"
              />
              {/* The reason reaches the person who checks the certificate: the
                  public verification shows it, so "revoked" never leaves the
                  holder assumed guilty of something unspecified. */}
              <Text style={[styles.meta, { color: theme.colors.neutral[600] }]}>
                El motivo se muestra a quien verifique el certificado.
              </Text>

              {revoke.isError ? (
                <Text
                  style={[styles.error, { color: theme.colors.accentRamp[700] }]}
                  accessibilityRole="alert"
                >
                  No pudimos anular el certificado.
                </Text>
              ) : null}

              <Pressable
                accessibilityRole="button"
                disabled={!reason.trim() || revoke.isPending}
                onPress={() =>
                  revoke.mutate({ certificateId: found.id, reason: reason.trim() })
                }
                style={({ pressed }) => [
                  styles.button,
                  styles.danger,
                  {
                    backgroundColor: theme.colors.accentRamp[700],
                    borderRadius: theme.radius.sm,
                    opacity: !reason.trim() ? 0.5 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                {revoke.isPending ? (
                  <ActivityIndicator size="small" color="#f2f2f3" />
                ) : (
                  <Text style={styles.buttonLabel}>Anular certificado</Text>
                )}
              </Pressable>
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 6.8, marginTop: 20.4 },
  sectionTitle: { fontSize: 20, fontWeight: '600' },
  meta: { fontSize: 12, lineHeight: 18 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 6.8, marginTop: 6.8 },
  grow: { flex: 1 },
  input: { borderWidth: 1, paddingHorizontal: 10.2, paddingVertical: 10.2, fontSize: 15 },
  card: { borderWidth: 1, padding: 13.6, gap: 6.8, marginTop: 10.2 },
  holder: { fontSize: 16, fontWeight: '600' },
  error: { fontSize: 13, marginTop: 6.8 },
  button: {
    paddingVertical: 10.2,
    paddingHorizontal: 20.4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  danger: { alignSelf: 'flex-start', marginTop: 3.4 },
  buttonLabel: { color: '#f2f2f3', fontSize: 14, fontWeight: '600' },
});
