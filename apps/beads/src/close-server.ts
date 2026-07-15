import type { Server } from "node:http"

/** Close a listening server and wait for its resources to be released. */
export async function closeServer(
  /** Server to close. */
  server: Server,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
}
