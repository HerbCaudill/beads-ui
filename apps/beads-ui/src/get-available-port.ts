import getPort from "get-port"

/** Find an available port bound specifically on loopback. */
export async function getAvailablePort(
  /** Preferred port, when the caller requested one. */
  requestedPort?: number,
): Promise<number> {
  return getPort({
    host: "127.0.0.1",
    ...(requestedPort === undefined ? {} : { port: requestedPort }),
  })
}
