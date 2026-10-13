import { Link } from 'expo-router';

import { type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';

import { INSTITUTE_FULL_NAME } from '@/core/brand';
import { BrandReveal } from '@/core/ui/brand-reveal';
import { breakpoint, useTheme } from '@/core/theme';

/**
 * Login and register share one frame: the official mark lives once, and the
 * form never repeats it. Wide web gets a two-pane stage with the form on a
 * sheet of its own. A phone gets a compact mark above the fields, and no
 * sheet, so the keyboard still has room.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= breakpoint.compact;

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: theme.colors.bg, flexDirection: isWide ? 'row' : 'column' },
      ]}
    >
      {isWide ? (
        <View style={[styles.identityPane, { borderRightColor: theme.colors.divider }]}>
          <HomeMark height={200} />
          <Text style={styles.promise}>
            Aprende haciendo. Cada módulo termina en una actividad, no en un cuestionario.
          </Text>
        </View>
      ) : (
        <View style={styles.mobileMark}>
          <HomeMark height={96} />
        </View>
      )}

      <View style={[styles.formPane, isWide ? styles.formPaneWide : undefined]}>
        {isWide ? (
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.divider,
                borderRadius: theme.radius.lg,
              },
              Platform.OS === 'web'
                ? ({ boxShadow: '0 18px 48px rgba(17, 17, 17, 0.08)' } as unknown as ViewStyle)
                : undefined,
            ]}
          >
            <View style={[styles.sheetEdge, { backgroundColor: theme.colors.accent }]} />
            {children}
          </View>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

function HomeMark({ height }: { height: number }) {
  return (
    <Link href="/" asChild>
      <Pressable accessibilityRole="link" accessibilityLabel={`${INSTITUTE_FULL_NAME}, inicio`}>
        <BrandReveal height={height} />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  identityPane: {
    flex: 1,
    minWidth: 360,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40.8,
    gap: 28,
    borderRightWidth: 1,
  },
  // Printed on the white pane next to the mark, so it keeps the mark's ink
  // and does not follow the theme.
  promise: {
    maxWidth: 320,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    color: '#6b6b6b',
  },
  mobileMark: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
  },
  formPane: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    padding: 20.4,
  },
  formPaneWide: {
    minWidth: 360,
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '100%',
    borderWidth: 1,
    paddingHorizontal: 32,
    paddingTop: 36,
    paddingBottom: 32,
    overflow: 'hidden',
  },
  sheetEdge: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 4,
  },
});
