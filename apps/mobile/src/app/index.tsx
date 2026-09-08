import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';

export default function HomeScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <Text style={[styles.brand, { color: theme.colors.text }]}>
        IL<Text style={{ color: theme.colors.accent }}>IA</Text>
      </Text>

      <Text style={[styles.tagline, { color: theme.colors.neutral[600] }]}>
        Aprendé inteligencia artificial haciendo
      </Text>

      <View style={styles.actions}>
        {/* The visual styles sit on an inner View, not on the Pressable:
            `asChild` renders the Pressable as an anchor on web and the anchor
            drops the Pressable's own style. */}
        <Link href="/catalog" asChild>
          <Pressable accessibilityRole="link">
            {({ pressed }) => (
              <View
                style={[
                  styles.primary,
                  {
                    backgroundColor: theme.colors.accent,
                    borderRadius: theme.radius.md,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={styles.primaryLabel}>Explorar cursos</Text>
              </View>
            )}
          </Pressable>
        </Link>

        <Link href="/my-courses" asChild>
          <Pressable accessibilityRole="link">
            {({ pressed }) => (
              <View
                style={[
                  styles.secondary,
                  {
                    borderColor: theme.colors.divider,
                    borderRadius: theme.radius.md,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={[styles.secondaryLabel, { color: theme.colors.text }]}>
                  Mis cursos
                </Text>
              </View>
            )}
          </Pressable>
        </Link>

        <Link href="/login" asChild>
          <Pressable accessibilityRole="link">
            {({ pressed }) => (
              <View
                style={[
                  styles.secondary,
                  {
                    borderColor: theme.colors.divider,
                    borderRadius: theme.radius.md,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={[styles.secondaryLabel, { color: theme.colors.text }]}>
                  Iniciar sesión
                </Text>
              </View>
            )}
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20.4,
    gap: 6.8,
  },
  brand: {
    fontSize: 56,
    fontWeight: '600',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 15,
    textAlign: 'center',
  },
  actions: {
    marginTop: 27.2,
    gap: 10.2,
    width: '100%',
    maxWidth: 320,
  },
  primary: {
    paddingVertical: 13.6,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  primaryLabel: {
    color: '#f2f2f3',
    fontSize: 16,
    fontWeight: '600',
  },
  secondary: {
    borderWidth: 1,
    paddingVertical: 13.6,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  secondaryLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
