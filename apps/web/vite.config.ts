import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  define: {
    'import.meta.env.VITE_SERVER_URL': JSON.stringify(
      process.env.VITE_SERVER_URL
    )
  },
  plugins: [
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart(),
    nitro(),
    viteReact()
  ],
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  ssr: {
    noExternal: [
      '@envy/ui',
      'lucide-react',
      'motion',
      'framer-motion',
      'motion-dom',
      'motion-utils'
    ],
    external: ['react', 'react-dom'],
    resolve: {
      conditions: ['import', 'module', 'default']
    }
  },
  server: {
    port: 3001
  }
})

console.log('BUILD ENV:', process.env)
