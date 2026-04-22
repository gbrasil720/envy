import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), tailwindcss(), tanstackStart(), viteReact()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  ssr: {
    noExternal: ['@envy/ui', 'lucide-react', 'motion', 'framer-motion', 'motion-dom', 'motion-utils'],
    external: ['react', 'react-dom'],
    resolve: {
      conditions: ['import', 'module', 'default'],
    },
  },
  server: {
    port: 3001,
  },
});
