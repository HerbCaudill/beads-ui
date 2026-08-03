import { defineConfig } from "@playwright/test"

/** Browser verification for the built standalone package. */
export default defineConfig({
  testDir: "apps/beads-ui/e2e",
  use: { baseURL: "http://127.0.0.1:4173" },
  webServer: [
    {
      command: "pnpm tsx apps/beads-ui/e2e/start-server.ts",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      url: "http://127.0.0.1:4173/api/workspace",
    },
    {
      command: "pnpm --filter @beads/mcp exec vite --host 127.0.0.1 --port 4175 --strictPort",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      url: "http://127.0.0.1:4175/",
    },
  ],
})
