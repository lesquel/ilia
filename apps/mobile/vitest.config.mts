import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Unit tests for the domain layer.
 *
 * The domain is pure by design — no React, no React Native, no expo — which is
 * exactly what lets it run here in milliseconds without a native test
 * environment. Anything needing a renderer does not belong in these files.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
