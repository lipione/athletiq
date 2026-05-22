import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    conditions: ['athletiq-source', 'node', 'import', 'default'],
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['test/**/*.ts'],
  },
});
