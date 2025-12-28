import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // ESM support
    include: ['tests/**/*.test.mjs'],

    // Environment
    environment: 'node',

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['lib/**/*.mjs'],
      exclude: ['node_modules/**', 'tests/**'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90
      }
    },

    // Globals for cleaner test syntax
    globals: true,

    // Reporter
    reporters: ['verbose'],

    // Watch mode options
    watchExclude: ['node_modules/**', '.homeybuild/**']
  }
});
