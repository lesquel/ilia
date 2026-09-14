import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/core/ui/brand-mark';
import { useTheme } from '@/core/theme';

/**
 * A page that does not exist.
 *
 * expo-router ships a developer default — "Unmatched Route", in English, with a
 * link to the internal sitemap. Useful while building, wrong for a teacher who
 * followed a stale link: it is not in their language and it exposes the shape
 * of the app to anyone who mistypes a URL.
 */
export default function NotFound() {
  const theme = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Página no encontrada' }} />
      <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
        <BrandMark variant="monogram" height={48} />
        <Text style={[styles.title, { color: theme.colors.text }]}>
          No encontramos esta página
        </Text>
        <Text style={[styles.body, { color: theme.colors.neutral[600] }]}>
          El enlace puede estar viejo o mal escrito.
        </Text>

        <Link href="/catalog" style={[styles.link, { color: theme.colors.accent }]}>
          Ir al catálogo →
        </Link>
        <Link href="/" style={[styles.link, { color: theme.colors.neutral[600] }]}>
          Volver al inicio
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20.4, gap: 10.2 },
  title: { fontSize: 24, fontWeight: '600', textAlign: 'center' },
  body: { fontSize: 15, textAlign: 'center', maxWidth: 420, marginBottom: 6.8 },
  link: { fontSize: 15, fontWeight: '600' },
});
