import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import {
  BookOpen,
  CalendarDays,
  SearchX,
  ShieldCheck,
  ShieldX,
  type LucideIcon,
} from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { BrandMark } from '@/core/ui/brand-mark';
import { Icon } from '@/core/ui/icon';
import { LoadingState } from '@/core/ui/state-view';
import { Card, Fact, Field, FieldLabel, PrimaryButton, Tag, useIsWide } from '@/core/ui/surface';
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
  const isWide = useIsWide();
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
      // Signed out there is no bar above this page, so on a wide window the
      // form sits in the middle instead of clinging to the top edge.
      contentContainerStyle={[styles.content, isWide ? styles.contentWide : undefined]}
      keyboardShouldPersistTaps="handled"
    >
      <Card style={styles.form}>
        <Link href="/" asChild>
          <Pressable accessibilityRole="link" accessibilityLabel="ILIA, inicio">
            <View style={styles.mark}>
              <BrandMark variant="monogram" height={40} />
            </View>
          </Pressable>
        </Link>

        <View style={styles.intro}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.colors.text }]}>
            Verificar un certificado
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.neutral[600] }]}>
            Escribe el código que aparece en el certificado. No hace falta tener cuenta. No hay PDF.
          </Text>
        </View>

        <View>
          <FieldLabel>Código del certificado</FieldLabel>
          <Field
            value={typed}
            onChangeText={setTyped}
            onSubmitEditing={search}
            returnKeyType="search"
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="ABCD-2345-EFGH"
            accessibilityLabel="Código del certificado"
            style={styles.input}
          />
        </View>

        <PrimaryButton label="Verificar" glyph={ShieldCheck} onPress={search} stretch />
      </Card>

      {code && isLoading ? <LoadingState label="Buscando el certificado…" /> : null}

      {code && error ? (
        <Verdict glyph={SearchX} title="No encontramos ningún certificado con ese código">
          <Text style={[styles.detail, { color: theme.colors.neutral[800] }]}>
            Revisa que esté completo y bien escrito.
          </Text>
        </Verdict>
      ) : null}

      {verification ? (
        <Verdict
          glyph={verification.valid ? ShieldCheck : ShieldX}
          title={verification.valid ? 'Certificado válido' : 'Certificado revocado'}
          valid={verification.valid}
          tag={
            <Tag
              label={verification.valid ? 'Válido' : 'Revocado'}
              tone={verification.valid ? 'accent' : 'neutral'}
              filled={verification.valid}
            />
          }
        >
          <Text style={[styles.holder, { color: theme.colors.text }]}>
            {verification.holderName}
          </Text>
          <View style={styles.facts}>
            <Fact glyph={BookOpen} label={verification.courseTitle} />
            {verification.issuedAt ? (
              <Fact
                glyph={CalendarDays}
                label={`Emitido el ${formatIssueDate(verification.issuedAt)}`}
              />
            ) : null}
          </View>

          {/* Why it was revoked is part of the answer: "revoked" with no reason
              leaves the holder assumed guilty of something unspecified. */}
          {!verification.valid && verification.revokedReason ? (
            <Text style={[styles.detail, { color: theme.colors.neutral[800] }]}>
              Motivo: {verification.revokedReason}
            </Text>
          ) : null}
        </Verdict>
      ) : null}
    </ScrollView>
  );
}

/** The answer to the search: an icon and a sentence first, the details under them. */
function Verdict({
  glyph,
  title,
  valid = false,
  tag,
  children,
}: {
  glyph: LucideIcon;
  title: string;
  valid?: boolean;
  tag?: ReactNode;
  children: ReactNode;
}) {
  const theme = useTheme();
  const ink = valid ? theme.colors.accentAlt : theme.colors.neutral[800];

  return (
    <Card style={valid ? { borderColor: theme.colors.accent } : undefined}>
      <View style={styles.verdictHead} accessibilityRole="alert">
        <View
          style={[
            styles.verdictGlyph,
            {
              backgroundColor: valid ? theme.colors.accentRamp[100] : theme.colors.neutral[200],
              borderRadius: theme.radius.md,
            },
          ]}
        >
          <Icon glyph={glyph} size={22} color={ink} />
        </View>
        <Text style={[styles.verdict, { color: theme.colors.text }]}>{title}</Text>
        {tag}
      </View>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20.4,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    gap: 13.6,
    paddingTop: 27.2,
  },
  contentWide: { flexGrow: 1, justifyContent: 'center', paddingBottom: 54 },
  form: { gap: 20.4 },
  mark: { alignSelf: 'flex-start' },
  intro: { gap: 6.8 },
  title: { fontSize: 30, fontWeight: '700', lineHeight: 36, letterSpacing: -0.6 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  input: { fontSize: 17, letterSpacing: 1, paddingVertical: 13.6 },
  verdictHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10.2 },
  verdictGlyph: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  verdict: { flexShrink: 1, fontSize: 18, fontWeight: '700' },
  holder: { fontSize: 24, fontWeight: '700', lineHeight: 30, letterSpacing: -0.4 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 13.6, rowGap: 3.4 },
  detail: { fontSize: 14, lineHeight: 21 },
});
