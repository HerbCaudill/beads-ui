import type { Server } from "node:http"

/** Close the server cleanly when the attached terminal interrupts the process. */
export function installShutdownHandlers(
  /** Listening application server. */
  server: Server,
): void {
  let closing = false
  const shutdown = () => {
    if (closing) return
    closing = true
    server.close((error) => {
      if (error) {
        console.error(error.message)
        process.exitCode = 1
      }
    })
  }
  const removeHandlers = () => {
    process.off("SIGINT", shutdown)
    process.off("SIGTERM", shutdown)
  }

  process.once("SIGINT", shutdown)
  process.once("SIGTERM", shutdown)
  server.once("close", removeHandlers)
}
