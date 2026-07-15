import { createServer } from "vite"

import { listenToViteServer } from "./listen-to-vite-server.js"
import type { StartedFrontend } from "./types.js"

/** Start the Vite frontend and proxy application traffic to the backend. */
export async function startViteFrontend(
  /** Vite project root containing the UI source. */
  uiRoot: string,
  /** Loopback URL of the Beads backend. */
  backendUrl: string,
  /** Preferred Vite port, when supplied by the developer. */
  requestedPort?: number,
): Promise<StartedFrontend> {
  const server = await createServer({
    root: uiRoot,
    server: {
      host: "127.0.0.1",
      port: requestedPort ?? 0,
      strictPort: requestedPort !== undefined,
      proxy: {
        "/api": {
          target: backendUrl,
          ws: true,
        },
      },
    },
  })

  await listenToViteServer(server)
  const url = server.resolvedUrls?.local[0]?.replace(/\/$/, "")
  if (!url) {
    await server.close()
    throw new Error("Vite did not provide a local development URL")
  }

  return {
    close: () => server.close(),
    url,
  }
}
