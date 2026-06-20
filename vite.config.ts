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
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'Mi Recetario Colaborativo',
        short_name: 'Recetario',
        description: 'Tu recetario personal y colaborativo con lista de compras inteligente.',
        theme_color: '#0d9488',
        background_color: '#070b13',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'favicon.svg',
            type: 'image/svg+xml',
            sizes: 'any',
            purpose: 'any'
          },
          {
            src: 'icon-192.png',
            type: 'image/png',
            sizes: '192x192'
          },
          {
            src: 'icon-512.png',
            type: 'image/png',
            sizes: '512x512'
          },
          {
            src: 'icon-192-maskable.png',
            type: 'image/png',
            sizes: '192x192',
            purpose: 'maskable'
          },
          {
            src: 'icon-512-maskable.png',
            type: 'image/png',
            sizes: '512x512',
            purpose: 'maskable'
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
})

