import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
  plugins: [react(), VitePWA({ registerType: 'prompt', includeAssets: ['favicon.svg', 'icons/*.png', 'models/*.glb', 'textures/*'],
    manifest: { name: 'Vector Align · Orbital Academy', short_name: 'Vector Align', description: 'Learn the final 100 metres of spacecraft docking.', theme_color: '#101315', background_color: '#101315', display: 'standalone', start_url: '/', icons: [{src:'/icons/icon-192.png',sizes:'192x192',type:'image/png'}, {src:'/icons/icon-512.png',sizes:'512x512',type:'image/png'}, {src:'/icons/maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}] },
    workbox: { globPatterns: ['**/*.{js,css,html,svg,png,glb,jpg,webp}'], maximumFileSizeToCacheInBytes: 15 * 1024 * 1024, navigateFallback: '/index.html', cleanupOutdatedCaches: true }
  })],
  build: { chunkSizeWarningLimit: 1600 },
  test: { include: ['src/**/*.test.ts'] }
} as import('vite').UserConfig);
