import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Self-contained build: vite-plugin-singlefile inlines JS/CSS into one
// dist/index.html so the prototype can be shared as a single file and opened
// via file:// — matches the build target in CLAUDE.md.
export default defineConfig({
  // Relative base so the single-file build works from file:// and from a
  // GitHub Pages project subpath alike.
  base: './',
  // Honour an assigned port (e.g. the preview harness sets PORT when 5173 is taken).
  server: { port: Number(process.env.PORT) || 5173 },
  plugins: [vue(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
