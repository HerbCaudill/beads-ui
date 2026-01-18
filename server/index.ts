import { createServer, type Server } from "node:http"
import { createApp } from "./app.js"
import { printServerUrl } from "./cli/daemon.js"
import { getConfig, type ServerConfig } from "./config.js"
import { resolveDbPath } from "./db.js"
import { debug, enableAllDebug } from "./logging.js"
import { registerWorkspace, watchRegistry } from "./registry-watcher.js"
import { watchDb } from "./watcher.js"
import { attachWsServer } from "./ws.js"

if (process.argv.includes("--debug") || process.argv.includes("-d")) {
  enableAllDebug()
}

// Parse --host and --port from argv and set env vars before getConfig()
for (let i = 0; i < process.argv.length; i++) {
  if (process.argv[i] === "--host" && process.argv[i + 1]) {
    process.env.HOST = process.argv[++i]
  }
  if (process.argv[i] === "--port" && process.argv[i + 1]) {
    process.env.PORT = process.argv[++i]
  }
}

const log = debug("server")

/**
 * Find an available port starting from the given port.
 *
 * @param host - The host to bind to.
 * @param start_port - The port to try first.
 * @param max_attempts - Maximum number of ports to try.
 * @returns Promise resolving to the available port.
 */
async function findAvailablePort(
  host: string,
  start_port: number,
  max_attempts = 10,
): Promise<number> {
  for (let attempt = 0; attempt < max_attempts; attempt++) {
    const port = start_port + attempt
    const available = await checkPortAvailable(host, port)
    if (available) {
      return port
    }
    log("port %d in use, trying %d", port, port + 1)
  }
  throw new Error(
    `No available port found after ${max_attempts} attempts starting from ${start_port}`,
  )
}

/**
 * Check if a port is available by attempting to listen on it briefly.
 *
 * @param host - The host to bind to.
 * @param port - The port to check.
 * @returns Promise resolving to true if available, false if in use.
 */
function checkPortAvailable(host: string, port: number): Promise<boolean> {
  return new Promise(resolve => {
    const test_server = createServer()
    test_server.once("error", () => {
      resolve(false)
    })
    test_server.listen(port, host, () => {
      test_server.close(() => {
        resolve(true)
      })
    })
  })
}

/**
 * Start the server with all components.
 *
 * @param config - The server configuration.
 */
async function startServer(config: ServerConfig): Promise<void> {
  const app = createApp(config)
  const server = createServer(app)

  // Register the initial workspace (from cwd) so it appears in the workspace picker
  // even without the beads daemon running
  const db_info = resolveDbPath({ cwd: config.root_dir })
  if (db_info.exists) {
    registerWorkspace({ path: config.root_dir, database: db_info.path })
  }

  // Watch the active beads DB and schedule subscription refresh for active lists
  const db_watcher = watchDb(config.root_dir, () => {
    // Schedule subscription list refresh run for active subscriptions
    log("db change detected → schedule refresh")
    scheduleListRefresh()
    // v2: all updates flow via subscription push envelopes only
  })

  const { scheduleListRefresh } = attachWsServer(server, {
    path: "/ws",
    heartbeat_ms: 30000,
    // Coalesce DB change bursts into one refresh run
    refresh_debounce_ms: 75,
    root_dir: config.root_dir,
    watcher: db_watcher,
  })

  // Watch the global registry for workspace changes (e.g., when user starts
  // bd daemon in a different project). This enables automatic workspace switching.
  watchRegistry(
    entries => {
      log("registry changed: %d entries", entries.length)
      // Find if there's a newer workspace that matches our initial root
      // For now, we just log the change - users can switch via set-workspace
      // Future: could auto-switch if a workspace was started in a parent/child dir
    },
    { debounce_ms: 500 },
  )

  server.on("error", err => {
    log("server error %o", err)
    process.exitCode = 1
  })

  server.listen(config.port, config.host, () => {
    printServerUrl()
  })
}

// Main entry point
;(async () => {
  try {
    const config = getConfig()
    // Find an available port
    const available_port = await findAvailablePort(config.host, config.port)
    if (available_port !== config.port) {
      // Update process.env so getConfig() returns correct values everywhere
      process.env.PORT = String(available_port)
      config.port = available_port
      config.url = `http://${config.host}:${available_port}`
    }
    await startServer(config)
  } catch (err) {
    log("startup error %o", err)
    process.exitCode = 1
  }
})()
