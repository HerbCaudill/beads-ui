import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

/**
 * Vite configuration for the React-based frontend.
 *
 * - Uses the `app/` directory as root
 * - Proxies WebSocket connections to the dev server
 */
export default defineConfig({
  root: "app",
  plugins: [react()],
  server: {
    proxy: {
      // Use exact path to avoid catching /ws.ts imports
      "^/ws$": {
        target: "ws://127.0.0.1:3000",
        ws: true,
      },
    },
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
})
