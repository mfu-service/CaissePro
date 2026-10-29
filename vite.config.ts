import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'sql-js-default-export',
      transform(code, id) {
        if (id.replace(/\\/g, '/').includes('sql.js/dist/sql-wasm')) {
          return `${code}\nexport default initSqlJs;\n`
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/release/**', '**/release-new/**', '**/release-build/**'],
    },
  },
  optimizeDeps: {
    exclude: ['sql.js'],
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('recharts') || id.includes('d3-')) return 'charts'
          if (id.includes('xlsx')) return 'xlsx'
          if (id.includes('react-dom') || id.includes('react-router') || id.includes('/react/')) return 'vendor-react'
          if (id.includes('lucide-react')) return 'icons'
        },
      },
    },
  },
})
