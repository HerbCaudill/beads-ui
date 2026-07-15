import type { Server } from "node:http"
import type { AddressInfo } from "node:net"

/** Start an HTTP server on loopback and return its actual port. */
export async function listenOnLoopback(
  /** Server to start. */
  server: Server,
  /** Selected port, including zero for an ephemeral test port. */
  port: number,
): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject)
    server.listen(port, "127.0.0.1", () => {
      server.off("error", reject)
      resolve()
    })
  })
  return (server.address() as AddressInfo).port
}
