#!/usr/bin/env tsx
/**
 * Development server startup script.
 *
 * Starts the backend server first, waits for it to be ready and captures
 * its port, then starts Vite with the correct proxy configuration.
 *
 * This ensures both servers work even when default ports are in use.
 */
import { spawn, type ChildProcess } from "node:child_process"

const SERVER_READY_PATTERN = /listening on http:\/\/[\d.]+:(\d+)/
const STARTUP_TIMEOUT_MS = 10000

/**
 * Start the backend server and wait for it to be ready.
 *
 * @returns Promise resolving to the server port and process.
 */
async function startServer(): Promise<{ port: number; process: ChildProcess }> {
  return new Promise((resolve, reject) => {
    const args = ["server/index.ts", "--debug"]
    const server_process = spawn("tsx", args, {
      stdio: ["inherit", "pipe", "pipe"],
      env: { ...process.env },
    })

    let resolved = false
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true
        server_process.kill()
        reject(new Error("Server startup timed out"))
      }
    }, STARTUP_TIMEOUT_MS)

    const handleOutput = (data: Buffer): void => {
      const text = data.toString()
      process.stdout.write(`\x1b[34m[server]\x1b[0m ${text}`)

      if (!resolved) {
        const match = SERVER_READY_PATTERN.exec(text)
        if (match && match[1]) {
          resolved = true
          clearTimeout(timeout)
          resolve({ port: parseInt(match[1], 10), process: server_process })
        }
      }
    }

    server_process.stdout?.on("data", handleOutput)
    server_process.stderr?.on("data", (data: Buffer) => {
      const text = data.toString()
      process.stderr.write(`\x1b[34m[server]\x1b[0m ${text}`)

      // Check stderr too for the ready message
      if (!resolved) {
        const match = SERVER_READY_PATTERN.exec(text)
        if (match && match[1]) {
          resolved = true
          clearTimeout(timeout)
          resolve({ port: parseInt(match[1], 10), process: server_process })
        }
      }
    })

    server_process.on("error", err => {
      if (!resolved) {
        resolved = true
        clearTimeout(timeout)
        reject(err)
      }
    })

    server_process.on("exit", code => {
      if (!resolved) {
        resolved = true
        clearTimeout(timeout)
        reject(new Error(`Server exited with code ${code}`))
      }
    })
  })
}

/**
 * Start Vite dev server with the given backend port.
 *
 * @param server_port - The backend server port for proxy configuration.
 * @returns The Vite process.
 */
function startVite(server_port: number): ChildProcess {
  const vite_process = spawn("vite", [], {
    stdio: ["inherit", "pipe", "pipe"],
    env: {
      ...process.env,
      BEADS_SERVER_PORT: String(server_port),
    },
  })

  vite_process.stdout?.on("data", (data: Buffer) => {
    process.stdout.write(`\x1b[32m[vite]\x1b[0m ${data.toString()}`)
  })

  vite_process.stderr?.on("data", (data: Buffer) => {
    process.stderr.write(`\x1b[32m[vite]\x1b[0m ${data.toString()}`)
  })

  return vite_process
}

/**
 * Main entry point.
 */
async function main(): Promise<void> {
  console.log("Starting development servers...")

  try {
    // Start server first and wait for it to be ready
    const { port, process: server_process } = await startServer()
    console.log(`\x1b[34m[dev]\x1b[0m Server ready on port ${port}`)

    // Start Vite with the server port
    const vite_process = startVite(port)
    console.log(`\x1b[32m[dev]\x1b[0m Vite starting with proxy to port ${port}`)

    // Handle process termination
    const cleanup = (): void => {
      console.log("\nShutting down...")
      vite_process.kill()
      server_process.kill()
    }

    process.on("SIGINT", cleanup)
    process.on("SIGTERM", cleanup)

    // Wait for either process to exit
    await Promise.race([
      new Promise<void>(resolve => {
        server_process.on("exit", () => {
          console.log("\x1b[34m[dev]\x1b[0m Server exited")
          vite_process.kill()
          resolve()
        })
      }),
      new Promise<void>(resolve => {
        vite_process.on("exit", () => {
          console.log("\x1b[32m[dev]\x1b[0m Vite exited")
          server_process.kill()
          resolve()
        })
      }),
    ])
  } catch (err) {
    console.error("Failed to start development servers:", err)
    process.exit(1)
  }
}

main()
