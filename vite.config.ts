import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',

      includeAssets: ['icon.svg'],

      manifest: {
        name: 'ShiftFlow | ระบบจัดกะพรีเมียม',
        short_name: 'ShiftFlow',
        description: 'ระบบจัดการตารางงานและกะพนักงานอัจฉริยะ',
        lang: 'th',
        dir: 'ltr',
        theme_color: '#2f80ff',
        background_color: '#050608',
        display: 'standalone',
        orientation: 'portrait',
        categories: ['business', 'productivity'],
        icons: [
          {
            src: 'icon.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          },
          {
            src: 'icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
