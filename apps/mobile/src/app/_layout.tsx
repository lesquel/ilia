import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { createQueryClient } from '@/core/api/query-client';
import { palette } from '@/core/theme';
import { installAuthTokenProvider } from '@/features/auth';

// Composition root. Runs once, before the first render, not on every mount.
installAuthTokenProvider();

export default function RootLayout() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? palette.dark : palette.light;

  const queryClient = useMemo(() => createQueryClient(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      />
    </QueryClientProvider>
  );
}
