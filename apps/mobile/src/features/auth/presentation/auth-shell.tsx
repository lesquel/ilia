import { Link } from 'expo-router';

import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { INSTITUTE_FULL_NAME } from '@/core/brand';
import { BrandReveal } from '@/core/ui/brand-reveal';
import { breakpoint, useTheme } from '@/core/theme';

/**
 * Login and register share one frame: the official mark lives once, and the
 * form never repeats it. Wide web gets a two-pane stage. A phone gets a
 * compact mark above the fields so the keyboard still has room.
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
        <View style={styles.identityPane}>
          <HomeMark height={200} />
        </View>
      ) : (
        <View style={styles.mobileMark}>
          <HomeMark height={96} />
        </View>
      )}

      <View style={[styles.formPane, isWide ? styles.formPaneWide : undefined]}>{children}</View>
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
  },
});
