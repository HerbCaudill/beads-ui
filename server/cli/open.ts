import { spawn } from "node:child_process"
import http from "node:http"

/**
 * Command configuration for opening URLs.
 */
interface OpenCommand {
  cmd: string
  args: string[]
}

/**
 * Workspace registration payload.
 */
interface WorkspacePayload {
  path: string
  database: string
}

/**
 * Compute a platform-specific command to open a URL in the default browser.
 */
export function computeOpenCommand(url: string, platform: string): OpenCommand {
  if (platform === "darwin") {
    return { cmd: "open", args: [url] }
  }
  if (platform === "win32") {
    // Use `start` via cmd.exe to open URLs
    return { cmd: "cmd", args: ["/c", "start", "", url] }
  }
  // Assume Linux/other Unix with xdg-open
  return { cmd: "xdg-open", args: [url] }
}

/**
 * Open the given URL in the default browser. Best-effort; resolves true on spawn success.
 */
export async function openUrl(url: string): Promise<boolean> {
  const { cmd, args } = computeOpenCommand(url, process.platform)
  try {
    const child = spawn(cmd, args, {
      stdio: "ignore",
      detached: false,
    })
    // If spawn succeeded and pid is present, consider it a success
    return typeof child.pid === "number" && child.pid > 0
  } catch {
    return false
  }
}

/**
 * Wait until the server at the URL accepts a connection, with a brief retry.
 * Does not throw; returns when either a connection was accepted or timeout elapsed.
 */
export async function waitForServer(url: string, total_timeout_ms: number = 600): Promise<void> {
  const deadline = Date.now() + total_timeout_ms

  // Attempt one GET; if it fails, wait and try once more within the deadline
  const tryOnce = (): Promise<void> =>
    new Promise(resolve => {
      let done = false
      const req = http.get(url, res => {
        // Any response implies the server is accepting connections
        if (!done) {
          done = true
          res.resume()
          resolve(undefined)
        }
      })
      req.on("error", () => {
        if (!done) {
          done = true
          resolve(undefined)
        }
      })
      req.setTimeout(200, () => {
        try {
          req.destroy()
        } catch {
          void 0
        }
        if (!done) {
          done = true
          resolve(undefined)
        }
      })
    })

  await tryOnce()

  if (Date.now() < deadline) {
    const remaining = Math.max(0, deadline - Date.now())
    await sleep(remaining)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Register a workspace with the running server.
 * Makes a POST request to /api/register-workspace.
 */
export async function registerWorkspaceWithServer(
  base_url: string,
  workspace: WorkspacePayload,
): Promise<boolean> {
  return new Promise(resolve => {
    const url = new URL("/api/register-workspace", base_url)
    const body = JSON.stringify(workspace)
    const req = http.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      res => {
        res.resume()
        resolve(res.statusCode === 200)
      },
    )
    req.on("error", () => resolve(false))
    req.setTimeout(2000, () => {
      try {
        req.destroy()
      } catch {
        void 0
      }
      resolve(false)
    })
    req.write(body)
    req.end()
  })
}
