import react from "@vitejs/plugin-react"
import { resolve } from "node:path"
import { viteSingleFile } from "vite-plugin-singlefile"
import { defineConfig } from "vitest/config"

export default defineConfig({
  root: resolve(import.meta.dirname, "src/app"),
  plugins: [react(), viteSingleFile()],
  test: {
    root: import.meta.dirname,
  },
  build: {
    emptyOutDir: true,
    outDir: resolve(import.meta.dirname, "dist"),
    rollupOptions: {
      input: resolve(import.meta.dirname, "src/app/index.html"),
    },
  },
})
