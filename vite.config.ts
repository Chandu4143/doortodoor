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
                src: 'icon.svg',
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
        chunkSizeWarningLimit: 300,
        rollupOptions: {
          output: {
            manualChunks: (id) => {
              // Vendor chunks - more granular splitting
              if (id.includes('node_modules')) {
                if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
                  return 'vendor-react';
                }
                if (id.includes('recharts')) {
                  return 'vendor-recharts';
                }
                if (id.includes('d3-')) {
                  return 'vendor-d3';
                }
                if (id.includes('framer-motion')) {
                  return 'vendor-motion';
                }
                if (id.includes('lucide-react')) {
                  return 'vendor-icons';
                }
                if (id.includes('clsx') || id.includes('tailwind-merge')) {
                  return 'vendor-utils';
                }
                if (id.includes('@google/genai')) {
                  return 'vendor-ai';
                }
                // Remaining node_modules
                return 'vendor-misc';
              }
              // Corporate module
              if (id.includes('/corporate/')) {
                return 'corporate';
              }
              // Dashboard & analytics
              if (id.includes('Dashboard') || id.includes('GoalTracker') || id.includes('TodaysTasks')) {
                return 'dashboard';
              }
              // Services
              if (id.includes('/services/')) {
                return 'services';
              }
            }
          }
        }
      }
    };
});
