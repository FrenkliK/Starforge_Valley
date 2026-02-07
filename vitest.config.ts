import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'server/tests/**/*.test.ts',
      'shared/tests/**/*.test.ts',
      'client/tests/**/*.test.ts'
    ],
    testTimeout: 20000
  }
});
