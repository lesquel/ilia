import { Link } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { useLogout, useSession } from '@/features/auth/application/use-auth';

/**
 * Who is signed in, and the way out.
 *
 * On every screen rather than only on the home page. Prompt drafts can carry a
 * teacher's own pupils' names (TRD §11), and logout is what wipes them — so on
 * a shared staffroom computer it must be reachable from wherever the person
 * happens to be when they stand up, not three taps away.
 */
export function AccountBar() {
  const theme = useTheme();
  const { user, isAuthenticated, isLoading } = useSession();
  const logout = useLogout();

  // Nothing to show while the session is still unknown, and nothing to show to
  // a visitor: the login screen already offers the way in.
  if (isLoading || !isAuthenticated || !user) return null;

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: theme.colors.neutral[100], borderBottomColor: theme.colors.divider },
      ]}
    >
      <Link href="/" style={[styles.brand, { color: theme.colors.text }]}>
        ILIA
      </Link>

      <View style={styles.right}>
        <Text style={[styles.name, { color: theme.colors.neutral[600] }]} numberOfLines={1}>
          {user.fullName}
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={logout.isPending}
          onPress={() => logout.mutate()}
          style={({ pressed }) => [styles.action, { opacity: pressed ? 0.6 : 1 }]}
        >
          {logout.isPending ? (
            <ActivityIndicator size="small" color={theme.colors.accent} />
          ) : (
            <Text style={[styles.actionLabel, { color: theme.colors.accent }]}>Cerrar sesión</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20.4,
    paddingVertical: 10.2,
    borderBottomWidth: 1,
  },
  brand: { fontSize: 15, fontWeight: '600', letterSpacing: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 13.6, flexShrink: 1 },
  name: { fontSize: 13, flexShrink: 1 },
  action: { minHeight: 32, justifyContent: 'center' },
  actionLabel: { fontSize: 13, fontWeight: '600' },
});
