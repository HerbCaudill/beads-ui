import { createServer as createHttpServer, type Server } from "node:http"
import { WebSocketServer } from "ws"

import { broadcastWorkspaceChanged } from "./broadcast-workspace-changed.js"
import { createApp } from "./create-app.js"
import { createChangePoller } from "./create-change-poller.js"
import { getWorkspaceFingerprint } from "./get-workspace-fingerprint.js"
import type { ServerOptions } from "./types.js"

/** Create the same-origin HTTP and WebSocket server for one workspace. */
export function createServer(
  /** Server dependencies and immutable workspace path. */
  options: ServerOptions,
): Server {
  const server = createHttpServer(createApp(options))
  const webSockets = new WebSocketServer({ server, path: "/api/events" })
  const stopPolling = createChangePoller(
    () => getWorkspaceFingerprint(options),
    () => broadcastWorkspaceChanged(webSockets),
    options.pollIntervalMs ?? 1_000,
  )
  const closeHttpServer = server.close.bind(server)

  server.close = (callback) => {
    for (const client of webSockets.clients) client.terminate()
    webSockets.close(() => closeHttpServer(callback))
    return server
  }

  server.once("close", stopPolling)

  return server
}
