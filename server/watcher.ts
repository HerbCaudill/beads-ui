import fs from "node:fs"
import path from "node:path"
import { resolveDbPath } from "./db.js"
import { debug } from "./logging.js"

/**
 * Options for the database file watcher.
 */
export interface WatchDbOptions {
  /** Debounce window in milliseconds. Defaults to 250ms. */
  debounce_ms?: number
  /** Cooldown period after triggering, during which changes are ignored. Defaults to 1000ms. */
  cooldown_ms?: number
  /** Explicit database path (overrides resolution). */
  explicit_db?: string
}

/**
 * Options for rebinding the watcher to a new database path.
 */
export interface RebindOptions {
  /** New root directory for database resolution. */
  root_dir?: string
  /** New explicit database path. */
  explicit_db?: string
}

/**
 * Handle returned by watchDb for controlling the watcher.
 */
export interface WatchDbHandle {
  /** Current resolved database path being watched. */
  readonly path: string
  /** Close the watcher and cancel pending callbacks. */
  close(): void
  /** Re-resolve and reattach watcher when root_dir or explicit_db changes. */
  rebind(opts?: RebindOptions): void
}

/**
 * Watch the resolved beads SQLite DB file and invoke a callback after a debounce window.
 * The DB path is resolved following beads precedence and can be overridden via options.
 *
 * @param root_dir - Project root directory (starting point for resolution).
 * @param onChange - Called when changes are detected.
 * @param options - Watcher configuration options.
 * @returns Handle to control the watcher.
 */
export function watchDb(
  root_dir: string,
  onChange: () => void,
  options: WatchDbOptions = {},
): WatchDbHandle {
  const debounce_ms = options.debounce_ms ?? 250
  const cooldown_ms = options.cooldown_ms ?? 1000
  const log = debug("watcher")

  let timer: ReturnType<typeof setTimeout> | undefined
  let watcher: fs.FSWatcher | undefined
  let cooldown_until = 0
  let current_path = ""
  let current_dir = ""
  let current_file = ""

  /**
   * Schedule the debounced onChange callback.
   */
  const schedule = (): void => {
    if (timer) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      onChange()
      cooldown_until = Date.now() + cooldown_ms
    }, debounce_ms)
    timer.unref()
  }

  /**
   * Attach a watcher to the directory containing the resolved DB path.
   */
  const bind = (base_dir: string, explicit_db: string | undefined): void => {
    const resolved = resolveDbPath(
      explicit_db !== undefined ? { cwd: base_dir, explicit_db } : { cwd: base_dir },
    )
    current_path = resolved.path
    current_dir = path.dirname(current_path)
    current_file = path.basename(current_path)
    if (!resolved.exists) {
      log(
        "resolved DB missing: %s – Hint: set --db, export BEADS_DB, or run `bd init` in your workspace.",
        current_path,
      )
    }

    // (Re)create watcher
    try {
      watcher = fs.watch(current_dir, { persistent: true }, (event_type, filename) => {
        if (filename && String(filename) !== current_file) {
          return
        }
        if (event_type === "change" || event_type === "rename") {
          if (Date.now() < cooldown_until) {
            return
          }
          log("fs %s %s", event_type, filename || "")
          schedule()
        }
      })
    } catch (err) {
      log("unable to watch directory %s %o", current_dir, err)
    }
  }

  // initial bind
  bind(root_dir, options.explicit_db)

  return {
    get path(): string {
      return current_path
    },
    close(): void {
      if (timer) {
        clearTimeout(timer)
        timer = undefined
      }
      watcher?.close()
    },
    rebind(opts: RebindOptions = {}): void {
      const next_root = opts.root_dir ? String(opts.root_dir) : root_dir
      const next_explicit = opts.explicit_db ?? options.explicit_db
      const next_resolved = resolveDbPath(
        next_explicit !== undefined ?
          { cwd: next_root, explicit_db: next_explicit }
        : { cwd: next_root },
      )
      const next_path = next_resolved.path
      if (next_path !== current_path) {
        // swap watcher
        watcher?.close()
        cooldown_until = 0
        bind(next_root, next_explicit)
      }
    },
  }
}
