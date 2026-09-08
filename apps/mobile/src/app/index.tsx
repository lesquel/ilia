import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';

export default function HomeScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <Text style={[styles.brand, { color: theme.colors.text }]}>
        IL<Text style={{ color: theme.colors.accent }}>IA</Text>
      </Text>
      <Text style={[styles.tagline, { color: theme.colors.neutral[600] }]}>
        Aprende inteligencia artificial haciendo
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6.8,
  },
  brand: {
    fontSize: 56,
    fontWeight: '600',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 15,
  },
});
