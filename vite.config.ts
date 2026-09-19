import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  // @ts-expect-error Vite 6 vs Vitest 2 nested Vite 5 plugin types
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/._*'],
  },
});
