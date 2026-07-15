import type { StartedDevelopmentApplication } from "./types.js"

/** Close both development servers when the attached terminal interrupts the process. */
export function installDevelopmentShutdownHandlers(
  /** Running development application to close. */
  application: StartedDevelopmentApplication,
): void {
  let closing = false
  const shutdown = () => {
    if (closing) return
    closing = true
    void application.close().catch((cause: unknown) => {
      console.error(cause instanceof Error ? cause.message : String(cause))
      process.exitCode = 1
    })
  }

  process.once("SIGINT", shutdown)
  process.once("SIGTERM", shutdown)
}
