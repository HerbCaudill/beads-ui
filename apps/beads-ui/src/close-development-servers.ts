import type { Server } from "node:http"

import { closeServer } from "./close-server.js"
import type { StartedFrontend } from "./types.js"

/** Close frontend and backend resources, even when one cleanup fails. */
export async function closeDevelopmentServers(
  /** Running Vite frontend. */
  frontend: StartedFrontend,
  /** Running Beads backend. */
  backend: Server,
): Promise<void> {
  const [frontendResult, backendResult] = await Promise.allSettled([
    frontend.close(),
    closeServer(backend),
  ])

  if (frontendResult.status === "rejected") throw frontendResult.reason
  if (backendResult.status === "rejected") throw backendResult.reason
}
