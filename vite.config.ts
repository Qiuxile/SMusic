import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import musicManifest from './plugins/music-manifest'

export default defineConfig({
  plugins: [vue(), musicManifest()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
  },
})
