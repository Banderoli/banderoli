import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'customs-exposure-engine',
      root: './libs/customs-exposure-engine',
      include: ['src/**/*.test.ts'],
      environment: 'node',
    },
  },
  {
    test: {
      name: 'common',
      root: './libs/common',
      include: ['src/**/*.test.ts'],
      environment: 'node',
    },
  },
  {
    test: {
      name: 'web-client',
      root: './apps/web-client',
      include: ['src/**/*.test.ts'],
      environment: 'node',
    },
  },
]);
