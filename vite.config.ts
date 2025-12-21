import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 38793,
    host: true
  },
  base: '/leetcode-98-validate-binary-search-tree/'
})
