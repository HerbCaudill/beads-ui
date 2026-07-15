import { getAvailablePort } from "./get-available-port.js"

/** Select a loopback port, preserving an explicit request or failing clearly. */
export async function selectPort(
  /** Port explicitly requested by the user. */
  requestedPort: number | undefined,
  /** Injectable available-port lookup. */
  findPort: FindPort = getAvailablePort,
): Promise<number> {
  const availablePort = await findPort(requestedPort)
  if (requestedPort !== undefined && availablePort !== requestedPort) {
    throw new Error(`Requested port ${requestedPort} is unavailable on 127.0.0.1`)
  }
  return availablePort
}

/** Available-port lookup used by startup. */
type FindPort = (
  /** Preferred port, when one was requested. */
  requestedPort?: number,
) => Promise<number>
