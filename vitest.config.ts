import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify('0.1.0') },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    exclude: ['node_modules/**', 'dist/**', 'dist-server/**', 'tests/e2e/**'],
    pool: 'forks',
    maxWorkers: 2,
  },
});
