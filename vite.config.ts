import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import react from '@vitejs/plugin-react'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    electron([
      {
        // Main-process entry file of the Electron App.
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              external: ['@coooookies/windows-smtc-monitor'],
            },
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        oncomplete(options) {
          options.reload()
        },
      },
      {
        entry: 'electron/smtc-worker.ts',
        vite: {
          build: {
            rollupOptions: {
              external: ['@coooookies/windows-smtc-monitor'],
            },
          },
        },
      },
    ]),
    renderer(),
  ],
})
