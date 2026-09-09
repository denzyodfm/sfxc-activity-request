import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Only unit tests over lib/ and the CLI scripts. Nothing here touches the
    // database or the network, so `npm test` is safe to run at any time against
    // any checkout.
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // lib/session-token.ts throws unless a secret is present, which is the
    // behaviour we want in production and a nuisance in tests. The tests that
    // care about a missing secret set and clear it themselves.
    env: {
      SESSION_SECRET: 'test-secret-that-is-long-enough-to-pass-validation'
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.')
    }
  }
});
