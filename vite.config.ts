import { defineConfig } from 'vite'
import adonisjs from '@adonisjs/vite/client'

export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        verbose: false,
        quietDeps: true,
        silenceDeprecations: ['import'],
      },
    },
  },
  assetsInclude: [
    'node_modules/bootstrap-icons/font/fonts/bootstrap-icons.woff',
    'node_modules/bootstrap-icons/font/fonts/bootstrap-icons.woff2',
  ],
  plugins: [
    adonisjs({
      /**
       * Entrypoints of your application. Each entrypoint will
       * result in a separate bundle.
       */
      entrypoints: ['resources/css/app.scss', 'resources/js/app.ts'],

      /**
       * Paths to watch and reload the browser on file change
       */
      reload: ['resources/views/**/*.edge'],
    }),
  ],
})
