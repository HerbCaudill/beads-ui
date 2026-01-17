import type { SpawnOptions } from "node:child_process"
import { spawn } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { getConfig } from "../config.js"
import { resolveDbPath } from "../db.js"

/**
 * Options for starting the daemon.
 */
export interface StartDaemonOptions {
  is_debug?: boolean | undefined
  host?: string | undefined
  port?: number | undefined
}

/**
 * Result of starting the daemon.
 */
export interface StartDaemonResult {
  pid: number
}

/**
 * Resolve the runtime directory used for PID and log files.
 * Prefers `BDUI_RUNTIME_DIR`, then `$XDG_RUNTIME_DIR/beads-ui`,
 * and finally `os.tmpdir()/beads-ui`.
 */
export function getRuntimeDir(): string {
  const override_dir = process.env.BDUI_RUNTIME_DIR
  if (override_dir && override_dir.length > 0) {
    return ensureDir(override_dir)
  }

  const xdg_dir = process.env.XDG_RUNTIME_DIR
  if (xdg_dir && xdg_dir.length > 0) {
    return ensureDir(path.join(xdg_dir, "beads-ui"))
  }

  return ensureDir(path.join(os.tmpdir(), "beads-ui"))
}

/**
 * Ensure a directory exists with safe permissions and return its path.
 */
function ensureDir(dir_path: string): string {
  try {
    fs.mkdirSync(dir_path, { recursive: true, mode: 0o700 })
  } catch {
    // Best-effort; permission errors will surface on file ops later.
  }
  return dir_path
}

export function getPidFilePath(): string {
  const runtime_dir = getRuntimeDir()
  return path.join(runtime_dir, "server.pid")
}

export function getLogFilePath(): string {
  const runtime_dir = getRuntimeDir()
  return path.join(runtime_dir, "daemon.log")
}

/**
 * Read PID from the PID file if present.
 */
export function readPidFile(): number | null {
  const pid_file = getPidFilePath()
  try {
    const text = fs.readFileSync(pid_file, "utf8")
    const pid_value = Number.parseInt(text.trim(), 10)
    if (Number.isFinite(pid_value) && pid_value > 0) {
      return pid_value
    }
  } catch {
    // ignore missing or unreadable
  }
  return null
}

export function writePidFile(pid: number): void {
  const pid_file = getPidFilePath()
  try {
    fs.writeFileSync(pid_file, String(pid) + "\n", { encoding: "utf8" })
  } catch {
    // ignore write errors; daemon still runs but management degrades
  }
}

export function removePidFile(): void {
  const pid_file = getPidFilePath()
  try {
    fs.unlinkSync(pid_file)
  } catch {
    // ignore
  }
}

/**
 * Check whether a process is running.
 */
export function isProcessRunning(pid: number): boolean {
  try {
    if (pid <= 0) {
      return false
    }
    process.kill(pid, 0)
    return true
  } catch (err) {
    const code = (err as { code?: string }).code
    if (code === "ESRCH") {
      return false
    }
    // EPERM or other errors imply the process likely exists but is not killable
    return true
  }
}

/**
 * Compute the absolute path to the server entry file.
 */
export function getServerEntryPath(): string {
  const here = fileURLToPath(new URL(import.meta.url))
  const cli_dir = path.dirname(here)
  const server_entry = path.resolve(cli_dir, "..", "index.js")
  return server_entry
}

/**
 * Spawn the server as a detached daemon, redirecting stdio to the log file.
 * Writes the PID file upon success.
 */
export function startDaemon(options: StartDaemonOptions = {}): StartDaemonResult | null {
  const server_entry = getServerEntryPath()
  const log_file = getLogFilePath()

  // Open the log file for appending; reuse for both stdout and stderr
  let log_fd: number
  try {
    log_fd = fs.openSync(log_file, "a")
    if (options.is_debug) {
      console.debug("log file  ", log_file)
    }
  } catch {
    // If log cannot be opened, fallback to ignoring stdio
    log_fd = -1
  }

  const spawn_env: Record<string, string | undefined> = { ...process.env }
  if (options.host) {
    spawn_env.HOST = options.host
  }
  if (options.port) {
    spawn_env.PORT = String(options.port)
  }

  const opts: SpawnOptions = {
    detached: true,
    env: spawn_env,
    stdio: log_fd >= 0 ? ["ignore", log_fd, log_fd] : "ignore",
    windowsHide: true,
  }

  try {
    const child = spawn(process.execPath, [server_entry], opts)
    // Detach fully from the parent
    child.unref()
    const child_pid = typeof child.pid === "number" ? child.pid : -1
    if (child_pid > 0) {
      if (options.is_debug) {
        console.debug("starting  ", child_pid)
      }
      writePidFile(child_pid)
      return { pid: child_pid }
    }
    return null
  } catch (err) {
    console.error("start error", err)
    // Log startup error to log file for traceability
    try {
      const message = new Date().toISOString() + " start error: " + String(err) + "\n"
      fs.appendFileSync(log_file, message, "utf8")
    } catch {
      // ignore
    }
    return null
  }
}

/**
 * Send SIGTERM then (optionally) SIGKILL to stop a process and wait for exit.
 */
export async function terminateProcess(pid: number, timeout_ms: number): Promise<boolean> {
  try {
    process.kill(pid, "SIGTERM")
  } catch (err) {
    const code = (err as { code?: string }).code
    if (code === "ESRCH") {
      return true
    }
    // On EPERM or others, continue to wait/poll
  }

  const start_time = Date.now()
  // Poll until process no longer exists or timeout
  while (Date.now() - start_time < timeout_ms) {
    if (!isProcessRunning(pid)) {
      return true
    }
    await sleep(100)
  }

  // Fallback to SIGKILL
  try {
    process.kill(pid, "SIGKILL")
  } catch {
    // ignore
  }

  // Give a brief moment after SIGKILL
  await sleep(50)
  return !isProcessRunning(pid)
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, ms)
  })
}

/**
 * Print the server URL derived from current config.
 */
export function printServerUrl(): void {
  // Resolve from the caller's working directory by default
  const resolved_db = resolveDbPath()
  console.log(
    `beads db   ${resolved_db.path} (${resolved_db.source}${resolved_db.exists ? "" : ", missing"})`,
  )

  const { url } = getConfig()
  console.log(`beads ui   listening on ${url}`)
}
