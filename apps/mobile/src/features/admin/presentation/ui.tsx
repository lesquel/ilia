import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/core/theme';

/**
 * The pieces the admin sections share, so a card, a field and a tag read the
 * same on every tab.
 *
 * They mirror the instructor screens' on purpose and are not imported from
 * there: a feature does not reach into another feature's presentation.
 */

const RESTING_SHADOW = '0 10px 28px rgba(17, 17, 17, 0.06)';

export function Card({
  title,
  hint,
  children,
  style,
}: {
  title?: string;
  hint?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.divider,
          borderRadius: theme.radius.lg,
        },
        Platform.OS === 'web'
          ? ({ boxShadow: RESTING_SHADOW } as unknown as ViewStyle)
          : undefined,
        style,
      ]}
    >
      {title ? (
        <View style={styles.cardHead}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{title}</Text>
          {hint ? (
            <Text style={[styles.cardHint, { color: theme.colors.neutral[600] }]}>{hint}</Text>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 20.4, gap: 13.6 },
  cardHead: { gap: 3.4 },
  cardTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  cardHint: { fontSize: 13, lineHeight: 19 },
});
