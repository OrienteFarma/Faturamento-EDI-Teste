import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../backend/dist',
    emptyOutDir: true,
    sourcemap: false, // Desabilita source maps para proteger código
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove todos os console.*
        drop_debugger: true, // Remove debugger
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'] // Garante remoção
      },
      mangle: {
        safari10: true // Ofusca nomes de variáveis
      },
      format: {
        comments: false // Remove comentários
      }
    },
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: undefined // Gera chunks otimizados
      }
    }
  },
  server: {
    port: 5173,
    host: '0.0.0.0', // Permite acesso de outras máquinas na rede
    strictPort: false
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
  }
})
