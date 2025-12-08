import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['icon.svg'],
          manifest: {
            name: 'DoorStep - Fundraising Planner',
            short_name: 'DoorStep',
            description: 'Door-to-door fundraising campaign management',
            theme_color: '#2563eb',
            background_color: '#ffffff',
            display: 'standalone',
            start_url: '/',
            icons: [
              {
                src: '/icon.svg',
                sizes: 'any',
                type: 'image/svg+xml',
                purpose: 'any maskable'
              }
            ]
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-cache',
                  expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
                }
              }
            ]
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.NODE_ENV': JSON.stringify(mode),
        'process.env.PUBLIC_URL': JSON.stringify('')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        chunkSizeWarningLimit: 500,
        rollupOptions: {
          output: {
            manualChunks: {
              // Core React bundle (must include lucide-react to avoid initialization issues)
              'vendor-react': ['react', 'react-dom', 'scheduler', 'lucide-react'],
              // Charts - lazy loaded
              'vendor-charts': ['recharts', 'd3-shape', 'd3-scale', 'd3-path', 'd3-array', 'd3-interpolate', 'd3-color', 'd3-format', 'd3-time', 'd3-time-format'],
              // Animation library
              'vendor-motion': ['framer-motion'],
              // AI SDK - lazy loaded
              'vendor-ai': ['@google/genai'],
              // Utilities
              'vendor-utils': ['clsx', 'tailwind-merge'],
            }
          }
        }
      }
    };
});
