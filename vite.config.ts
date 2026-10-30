import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 38793,
    host: true
  },
  base: process.env.VITE_APP_BASE || '/leetcode-98-validate-binary-search-tree/',
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    setupFiles: './tests/setup.ts',
    coverage: {
      provider: 'v8',
      include: ['src/utils/treeUtils.ts'],
      reporter: ['text', 'html'],
      thresholds: { lines: 60, functions: 60, branches: 50 },
    },
  },
})
