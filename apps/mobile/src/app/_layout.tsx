import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { Link, Stack, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { AppState, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { createQueryClient } from '@/core/api/query-client';
import { ErrorBoundary } from '@/core/ui/error-boundary';
import { palette } from '@/core/theme';
import { AccountBar, installAuthTokenProvider } from '@/features/auth';
import '@/core/ui/global-web-styles';

// Composition root. Runs once, before the first render, not on every mount.
installAuthTokenProvider();

export default function RootLayout() {
  const colors = palette.light;
  const queryClient = useMemo(() => createQueryClient(), []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    focusManager.setFocused(AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  return (
    // Outside the providers on purpose: if the theme or the query client is
    // what broke, a boundary inside them cannot render anything either.
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
            {Platform.OS === 'web' ? (
              <Link href={'#main-content' as Href} asChild>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="Saltar al contenido principal"
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: 12,
                    zIndex: 100,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    backgroundColor: colors.text,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '600' }}>
                    Saltar al contenido
                  </Text>
                </Pressable>
              </Link>
            ) : null}
            {/* Above the Stack, so it survives navigation. Signing out is the only
                action that must be reachable from every screen. */}
            <AccountBar />
            <View role="main" nativeID="main-content" tabIndex={-1} style={{ flex: 1 }}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.bg },
                }}
              />
            </View>
          </SafeAreaView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
