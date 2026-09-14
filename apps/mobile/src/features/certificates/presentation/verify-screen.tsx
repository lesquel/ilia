import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { BrandMark } from '@/core/ui/brand-mark';
import { LoadingState } from '@/core/ui/state-view';
import { useVerification } from '@/features/certificates/application/use-certificates';
import { formatIssueDate } from '@/features/certificates/domain/entities';

/**
 * Public certificate verification.
 *
 * **No account needed.** A school, the Alcaldía or an employer types a code and
 * gets an answer — that is the whole reason the certification is worth anything
 * (PRD §8). It is also why the page shows a name, a course and a date, and
 * nothing else.
 */
export function VerifyScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string }>();

  const [typed, setTyped] = useState(code ?? '');
  const { verification, isLoading, error } = useVerification(code ?? '');

  const search = () => {
    const cleaned = typed.trim().toUpperCase();
    if (cleaned) router.replace(`/verify/${encodeURIComponent(cleaned)}`);
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={styles.content}
    >
      <BrandMark variant="monogram" height={40} />

      <Text style={[styles.title, { color: theme.colors.text }]}>Verificar un certificado</Text>
      <Text style={[styles.subtitle, { color: theme.colors.neutral[600] }]}>
        Escribe el código que aparece en el certificado. No hace falta tener cuenta.
      </Text>

      <View style={styles.searchRow}>
        <TextInput
          value={typed}
          onChangeText={setTyped}
          onSubmitEditing={search}
          returnKeyType="search"
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="ABCD-2345-EFGH"
          placeholderTextColor={theme.colors.neutral[500]}
          accessibilityLabel="Código del certificado"
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.neutral[100],
              borderColor: theme.colors.divider,
              borderRadius: theme.radius.md,
              color: theme.colors.text,
            },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          onPress={search}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: theme.colors.accent,
              borderRadius: theme.radius.md,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={styles.buttonLabel}>Verificar</Text>
        </Pressable>
      </View>

      {code && isLoading ? <LoadingState label="Buscando el certificado…" /> : null}

      {code && error ? (
        <View
          style={[
            styles.result,
            { borderColor: theme.colors.divider, borderRadius: theme.radius.lg },
          ]}
        >
          <Text style={[styles.verdict, { color: theme.colors.text }]}>
            No encontramos ningún certificado con ese código
          </Text>
          <Text style={[styles.detail, { color: theme.colors.neutral[600] }]}>
            Revisa que esté completo y bien escrito.
          </Text>
        </View>
      ) : null}

      {verification ? (
        <View
          style={[
            styles.result,
            {
              borderColor: verification.valid ? theme.colors.accent : theme.colors.divider,
              borderRadius: theme.radius.lg,
              backgroundColor: verification.valid
                ? theme.colors.accentRamp[100]
                : theme.colors.neutral[100],
            },
          ]}
        >
          <Text
            style={[
              styles.verdict,
              {
                color: verification.valid
                  ? theme.colors.accentRamp[800]
                  : theme.colors.text,
              },
            ]}
          >
            {verification.valid ? '✓ Certificado válido' : '✕ Certificado revocado'}
          </Text>

          <Text style={[styles.holder, { color: theme.colors.text }]}>
            {verification.holderName}
          </Text>
          <Text style={[styles.course, { color: theme.colors.neutral[700] }]}>
            {verification.courseTitle}
          </Text>
          {verification.issuedAt ? (
            <Text style={[styles.detail, { color: theme.colors.neutral[600] }]}>
              Emitido el {formatIssueDate(verification.issuedAt)}
            </Text>
          ) : null}

          {/* Why it was revoked is part of the answer: "revoked" with no reason
              leaves the holder assumed guilty of something unspecified. */}
          {!verification.valid && verification.revokedReason ? (
            <Text style={[styles.detail, { color: theme.colors.neutral[700] }]}>
              Motivo: {verification.revokedReason}
            </Text>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20.4,
    maxWidth: 620,
    width: '100%',
    alignSelf: 'center',
    gap: 10.2,
    paddingTop: 40,
  },
  title: { fontSize: 30, fontWeight: '600' },
  subtitle: { fontSize: 15, lineHeight: 22, marginBottom: 6.8 },
  searchRow: { flexDirection: 'row', gap: 6.8, flexWrap: 'wrap' },
  input: {
    flexGrow: 1,
    minWidth: 200,
    borderWidth: 1,
    paddingHorizontal: 13.6,
    paddingVertical: 13.6,
    fontSize: 17,
    letterSpacing: 1,
  },
  button: {
    paddingHorizontal: 20.4,
    paddingVertical: 13.6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonLabel: { color: '#f2f2f3', fontSize: 16, fontWeight: '600' },
  result: { borderWidth: 1, padding: 20.4, gap: 6.8, marginTop: 13.6 },
  verdict: { fontSize: 18, fontWeight: '600' },
  holder: { fontSize: 24, fontWeight: '600', marginTop: 6.8 },
  course: { fontSize: 16 },
  detail: { fontSize: 13, lineHeight: 20 },
});
