import { Search, TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { ApiError } from '@/core/errors/api-error';
import { useTheme } from '@/core/theme';
import { Icon } from '@/core/ui/icon';
import {
  useCertificateLookup,
  useRevokeCertificate,
} from '@/features/certificates/application/use-certificates';
import { STATUS_LABELS } from '@/features/certificates/domain/entities';

/**
 * A text input whose border takes the accent while it holds the focus.
 *
 * It mirrors the admin panel's field on purpose and is not imported from
 * there: a feature does not reach into another feature's presentation.
 */
function Field({ onFocus, onBlur, style, ...props }: TextInputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      placeholderTextColor={theme.colors.neutral[500]}
      {...props}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={[
        styles.input,
        {
          backgroundColor: theme.colors.neutral[100],
          borderColor: focused ? theme.colors.accent : theme.colors.divider,
          color: theme.colors.text,
          borderRadius: theme.radius.md,
        },
        style,
      ]}
    />
  );
}

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

  const search = () => {
    if (!code.trim()) return;
    revoke.reset();
    lookup.mutate(code.trim());
  };

  return (
    <View style={styles.block}>
      <View style={styles.head}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]} accessibilityRole="header">Certificados</Text>
        <Text style={[styles.hint, { color: theme.colors.neutral[600] }]}>
          Buscá por código de verificación para revisar o anular un certificado. La anulación queda
          auditada y el certificado deja de validar.
        </Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchField}>
          <View style={styles.searchGlyph}>
            <Icon glyph={Search} size={18} color={theme.colors.neutral[500]} />
          </View>
          <Field
            style={styles.searchInput}
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            placeholder="ABCD-EFGH-JKMN"
            onSubmitEditing={search}
            returnKeyType="search"
            accessibilityLabel="Código de verificación"
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Buscar"
          accessibilityState={{ busy: lookup.isPending }}
          disabled={!code.trim() || lookup.isPending}
          onPress={search}
          style={({ pressed }) => [
            styles.button,
            styles.searchButton,
            {
              backgroundColor: theme.colors.accentButton,
              borderColor: theme.colors.accent,
              borderRadius: theme.radius.md,
              opacity: !code.trim() ? 0.4 : pressed ? 0.7 : 1,
            },
          ]}
        >
          {lookup.isPending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={[styles.buttonLabel, styles.onAccent]}>Buscar</Text>
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
        <View style={[styles.found, { borderTopColor: theme.colors.divider }]}>
          <View style={styles.head}>
            <Text style={[styles.holder, { color: theme.colors.text }]}>{found.holderName}</Text>
            <Text style={[styles.hint, { color: theme.colors.neutral[600] }]}>
              {found.courseTitle} · {found.code} · {STATUS_LABELS[found.status]}
            </Text>
          </View>

          {alreadyRevoked ? (
            <Text style={[styles.hint, { color: theme.colors.neutral[600] }]}>
              Este certificado ya está anulado.
            </Text>
          ) : (
            // The theme has no danger colour, so the step that cannot be undone
            // is told apart by its form: its own frame, a warning mark, and an
            // outlined button instead of the filled one a routine action gets.
            <View
              style={[
                styles.confirm,
                { borderColor: theme.colors.neutral[800], borderRadius: theme.radius.md },
              ]}
            >
              <View style={styles.warning}>
                <Icon glyph={TriangleAlert} size={18} color={theme.colors.text} />
                <Text style={[styles.warningText, { color: theme.colors.text }]}>
                  La anulación queda auditada y el certificado deja de validar.
                </Text>
              </View>

              <View>
                <Text style={[styles.label, { color: theme.colors.neutral[800] }]}>
                  Motivo de la anulación
                </Text>
                <Field
                  value={reason}
                  onChangeText={setReason}
                  maxLength={500}
                  placeholder="Motivo de la anulación"
                  accessibilityLabel="Motivo de la anulación"
                />
              </View>
              {/* The reason reaches the person who checks the certificate: the
                  public verification shows it, so "revoked" never leaves the
                  holder assumed guilty of something unspecified. */}
              <Text style={[styles.hint, { color: theme.colors.neutral[600] }]}>
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
                accessibilityLabel="Anular certificado"
                accessibilityState={{ busy: revoke.isPending }}
                disabled={!reason.trim() || revoke.isPending}
                onPress={() =>
                  revoke.mutate({ certificateId: found.id, reason: reason.trim() })
                }
                style={({ pressed }) => [
                  styles.button,
                  {
                    borderColor: theme.colors.neutral[800],
                    borderRadius: theme.radius.md,
                    opacity: !reason.trim() ? 0.4 : pressed ? 0.7 : 1,
                  },
                ]}
              >
                {revoke.isPending ? (
                  <ActivityIndicator size="small" color={theme.colors.text} />
                ) : (
                  <>
                    <Icon glyph={TriangleAlert} size={16} color={theme.colors.text} />
                    <Text style={[styles.buttonLabel, { color: theme.colors.text }]}>
                      Anular certificado
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // The admin card that holds this panel drops its top padding and leaves the
  // offset to this margin.
  block: { gap: 13.6, marginTop: 20.4 },
  head: { gap: 3.4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  hint: { fontSize: 13, lineHeight: 19 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 3.4 },
  searchRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6.8 },
  searchField: { flexGrow: 1, flexShrink: 1, minWidth: 160, maxWidth: 560, justifyContent: 'center' },
  // A tap on the magnifier still lands on the field under it.
  searchGlyph: { position: 'absolute', left: 13.6, zIndex: 1, pointerEvents: 'none' },
  // Room for the magnifier, which sits over the field's own padding.
  searchInput: { paddingLeft: 13.6 + 18 + 10.2 },
  input: {
    borderWidth: 1,
    paddingHorizontal: 13.6,
    paddingVertical: 10.2,
    fontSize: 15,
    // The field draws its own focus colour; the browser's ring would double it.
    outlineWidth: 0,
  },
  found: { gap: 13.6, paddingTop: 13.6, borderTopWidth: 1 },
  holder: { fontSize: 16, fontWeight: '600' },
  confirm: { borderWidth: 1, padding: 13.6, gap: 10.2 },
  warning: { flexDirection: 'row', alignItems: 'flex-start', gap: 6.8 },
  warningText: { flex: 1, minWidth: 0, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  error: { fontSize: 13 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    gap: 6.8,
    borderWidth: 1,
    paddingVertical: 10.2,
    paddingHorizontal: 13.6,
    minHeight: 44,
  },
  searchButton: { alignSelf: 'center' },
  buttonLabel: { fontSize: 14, fontWeight: '600' },
  onAccent: { color: '#ffffff' },
});
