import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Usa terser para minificação mais agressiva (menos bytes = carrega mais rápido)
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2,
      },
    },
    // Arquivos menores que 4KB ficam inline (sem round-trip de rede extra)
    assetsInlineLimit: 4096,
    // CSS em arquivo separado para cache eficiente
    cssCodeSplit: true,
    // Aumenta o limite de aviso de chunk
    chunkSizeWarningLimit: 800,
  },
})

