import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      tsconfig: './tsconfig.app.json',
    },
  },
  server: {
    host: '0.0.0.0',
    port: 4100,
    strictPort: true,
    open: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4100,
    strictPort: true,
    open: true,
  },
})
