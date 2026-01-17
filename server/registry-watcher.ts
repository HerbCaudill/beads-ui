import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { debug } from "./logging.js"

const log = debug("registry-watcher")

/**
 * Entry stored in the in-memory workspace registry.
 */
export interface InMemoryWorkspaceEntry {
  path: string
  database: string
  pid: number
  version: string
}

/**
 * Entry stored in the file-based registry (~/.beads/registry.json).
 */
export interface RegistryEntry {
  workspace_path: string
  socket_path: string
  database_path: string
  pid: number
  version: string
  started_at: string
}

/**
 * Workspace info returned by getAvailableWorkspaces.
 */
export interface WorkspaceInfo {
  path: string
  database: string
  pid: number
  version: string
}

/**
 * Options for the registry watcher.
 */
export interface WatchRegistryOptions {
  /** Debounce window in milliseconds. Defaults to 500ms. */
  debounce_ms?: number
}

/**
 * Handle returned by watchRegistry for controlling the watcher.
 */
export interface WatchRegistryHandle {
  /** Close the watcher and cancel pending callbacks. */
  close(): void
}

/**
 * In-memory registry of workspaces registered dynamically via the API.
 * These supplement the file-based registry at ~/.beads/registry.json.
 */
const inMemoryWorkspaces = new Map<string, InMemoryWorkspaceEntry>()

/**
 * Register a workspace dynamically (in-memory).
 * This allows `bdui start` to register workspaces when the server is already running.
 *
 * @param workspace - Workspace information to register.
 */
export function registerWorkspace(workspace: { path: string; database: string }): void {
  const normalized = path.resolve(workspace.path)
  log("registering workspace: %s (db: %s)", normalized, workspace.database)
  inMemoryWorkspaces.set(normalized, {
    path: normalized,
    database: workspace.database,
    pid: process.pid,
    version: "dynamic",
  })
}

/**
 * Get all dynamically registered workspaces (in-memory only).
 *
 * @returns Array of in-memory workspace entries.
 */
export function getInMemoryWorkspaces(): InMemoryWorkspaceEntry[] {
  return Array.from(inMemoryWorkspaces.values())
}

/**
 * Get the path to the global beads registry file.
 *
 * @returns Absolute path to ~/.beads/registry.json.
 */
export function getRegistryPath(): string {
  return path.join(os.homedir(), ".beads", "registry.json")
}

/**
 * Read and parse the registry file.
 *
 * @returns Array of registry entries, or empty array if file doesn't exist or is invalid.
 */
export function readRegistry(): RegistryEntry[] {
  const registry_path = getRegistryPath()
  try {
    const content = fs.readFileSync(registry_path, "utf8")
    const data = JSON.parse(content) as unknown
    if (Array.isArray(data)) {
      return data as RegistryEntry[]
    }
    return []
  } catch {
    return []
  }
}

/**
 * Find the registry entry that matches the given root directory.
 * Matches if the root_dir is the same as or a subdirectory of the workspace_path.
 *
 * @param root_dir - Directory to search for.
 * @returns Matching registry entry or null if not found.
 */
export function findWorkspaceEntry(root_dir: string): RegistryEntry | null {
  const entries = readRegistry()
  const normalized = path.resolve(root_dir)

  // First, try exact match
  for (const entry of entries) {
    if (path.resolve(entry.workspace_path) === normalized) {
      return entry
    }
  }

  // Then try to find if root_dir is inside a workspace
  for (const entry of entries) {
    const workspace = path.resolve(entry.workspace_path)
    if (normalized.startsWith(workspace + path.sep)) {
      return entry
    }
  }

  return null
}

/**
 * Get all available workspaces from both the file-based registry and
 * dynamically registered in-memory workspaces.
 *
 * @returns Combined array of workspace info from file and memory.
 */
export function getAvailableWorkspaces(): WorkspaceInfo[] {
  const entries = readRegistry()
  const fileWorkspaces = entries.map(entry => ({
    path: entry.workspace_path,
    database: entry.database_path,
    pid: entry.pid,
    version: entry.version,
  }))

  // Merge in-memory workspaces, avoiding duplicates by path
  const seen = new Set(fileWorkspaces.map(w => path.resolve(w.path)))
  const inMemory = getInMemoryWorkspaces().filter(w => !seen.has(path.resolve(w.path)))

  return [...fileWorkspaces, ...inMemory]
}

/**
 * Watch the global beads registry file and invoke callback when it changes.
 *
 * @param onChange - Callback invoked with updated entries when registry changes.
 * @param options - Watcher configuration options.
 * @returns Handle to close the watcher.
 */
export function watchRegistry(
  onChange: (entries: RegistryEntry[]) => void,
  options: WatchRegistryOptions = {},
): WatchRegistryHandle {
  const debounce_ms = options.debounce_ms ?? 500
  const registry_path = getRegistryPath()
  const registry_dir = path.dirname(registry_path)
  const registry_file = path.basename(registry_path)

  let timer: ReturnType<typeof setTimeout> | undefined
  let watcher: fs.FSWatcher | undefined

  const schedule = (): void => {
    if (timer) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      try {
        const entries = readRegistry()
        onChange(entries)
      } catch (err) {
        log("error reading registry on change: %o", err)
      }
    }, debounce_ms)
    timer.unref?.()
  }

  try {
    // Ensure the directory exists before watching
    if (!fs.existsSync(registry_dir)) {
      log("registry directory does not exist: %s", registry_dir)
      return { close: () => {} }
    }

    watcher = fs.watch(registry_dir, { persistent: true }, (event_type, filename) => {
      if (filename && String(filename) !== registry_file) {
        return
      }
      if (event_type === "change" || event_type === "rename") {
        log("registry %s %s", event_type, filename || "")
        schedule()
      }
    })
  } catch (err) {
    log("unable to watch registry directory: %o", err)
    return { close: () => {} }
  }

  return {
    close(): void {
      if (timer) {
        clearTimeout(timer)
        timer = undefined
      }
      watcher?.close()
    },
  }
}
