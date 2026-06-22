import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'smoke',
    environment: 'node',
    include: ['smoke-tests/**/*.smoke.test.ts'],
    testTimeout: 75_000,
  },
});
