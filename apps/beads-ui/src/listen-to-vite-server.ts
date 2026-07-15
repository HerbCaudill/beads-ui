import type { ViteDevServer } from "vite"

/** Start a Vite server and release it if startup fails. */
export async function listenToViteServer(
  /** Vite development server to start. */
  server: ViteDevServer,
): Promise<void> {
  try {
    await server.listen()
  } catch (cause) {
    await server.close().catch(() => undefined)
    throw cause
  }
}
