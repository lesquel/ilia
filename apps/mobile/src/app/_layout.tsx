import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { SafeAreaView } from 'react-native';

import { createQueryClient } from '@/core/api/query-client';
import { ErrorBoundary } from '@/core/ui/error-boundary';
import { palette } from '@/core/theme';
import { AccountBar, installAuthTokenProvider } from '@/features/auth';

// Composition root. Runs once, before the first render, not on every mount.
installAuthTokenProvider();

export default function RootLayout() {
  const colors = palette.light;

  const queryClient = useMemo(() => createQueryClient(), []);

  return (
    // Outside the providers on purpose: if the theme or the query client is
    // what broke, a boundary inside them cannot render anything either.
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        {/* Above the Stack, so it survives navigation. Signing out is the only
            action that must be reachable from every screen. */}
        <AccountBar />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        />
      </SafeAreaView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
