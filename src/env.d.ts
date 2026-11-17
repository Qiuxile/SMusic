/// <reference types="vite/client" />

declare module 'virtual:music-manifest' {
  const manifest: import('./types').MusicManifest
  export default manifest
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
