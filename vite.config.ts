import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['anchobasto.jpg'],
      manifest: {
        name: 'Truco Argentino',
        short_name: 'Truco',
        description: 'Contador de puntos para Truco Argentino',
        theme_color: '#166534',
        background_color: '#166534',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'anchobasto.jpg',
            sizes: '192x192',
            type: 'image/jpeg'
          },
          {
            src: 'anchobasto.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg}'],
        skipWaiting: true,
        clientsClaim: true
      }
    })
  ],
})
