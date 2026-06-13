import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // МЕНЯЕМ НА /Fuhrpark/, чтобы файлы искались в правильном репозитории на GitHub
  base: '/Fuhrpark/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Fleet Management PWA',
        short_name: 'FleetPWA',
        description: 'Fleet Management Progressive Web App',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ],
        lang: 'de'
      }
    })
  ]
})