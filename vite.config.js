import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const reactNativeFsShim = fileURLToPath(
  new URL('./src/shims/react-native-fs.js', import.meta.url),
)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // jsmediatags pulls this in for RN; browser bundle must not resolve the real package
      'react-native-fs': reactNativeFsShim,
    },
  },
  server: {
    proxy: {
      // Bypass CORS for Firebase Storage when fetching MP3 metadata (embedded album art)
      '/storage-proxy': {
        target: 'https://firebasestorage.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/storage-proxy/, ''),
      },
    },
  },
})
