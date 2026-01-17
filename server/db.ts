import fs from "node:fs"
import os from "node:os"
import path from "node:path"

/**
 * Database resolution options.
 */
export interface ResolveDbOptions {
  /** Working directory to resolve relative paths from. Defaults to process.cwd(). */
  cwd?: string
  /** Environment variables map. Defaults to process.env. */
  env?: Record<string, string | undefined>
  /** Explicit database path provided via --db flag. */
  explicit_db?: string
}

/**
 * Source indicator for how the database path was resolved.
 */
export type DbSource = "flag" | "env" | "nearest" | "home-default"

/**
 * Result of resolving the database path.
 */
export interface ResolveDbResult {
  /** Absolute path to the database file. */
  path: string
  /** How the path was determined. */
  source: DbSource
  /** Whether the file exists on disk. */
  exists: boolean
}

/**
 * Resolve the SQLite DB path used by beads according to precedence:
 * 1) explicit --db flag (provided via options.explicit_db)
 * 2) BEADS_DB environment variable
 * 3) nearest ".beads/*.db" by walking up from cwd
 * 4) "~/.beads/default.db" fallback
 *
 * Returns a normalized absolute path and a `source` indicator. Existence is
 * returned via the `exists` boolean.
 */
export function resolveDbPath(options: ResolveDbOptions = {}): ResolveDbResult {
  const cwd = options.cwd ? path.resolve(options.cwd) : process.cwd()
  const env = options.env ?? process.env

  // 1) explicit flag
  if (options.explicit_db && options.explicit_db.length > 0) {
    const p = absFrom(options.explicit_db, cwd)
    return { path: p, source: "flag", exists: fileExists(p) }
  }

  // 2) BEADS_DB env
  if (env.BEADS_DB && String(env.BEADS_DB).length > 0) {
    const p = absFrom(String(env.BEADS_DB), cwd)
    return { path: p, source: "env", exists: fileExists(p) }
  }

  // 3) nearest .beads/*.db walking up
  const nearest = findNearestBeadsDb(cwd)
  if (nearest) {
    return { path: nearest, source: "nearest", exists: fileExists(nearest) }
  }

  // 4) ~/.beads/default.db
  const home_default = path.join(os.homedir(), ".beads", "default.db")
  return {
    path: home_default,
    source: "home-default",
    exists: fileExists(home_default),
  }
}

/**
 * Find nearest .beads/*.db by walking up from start.
 * First alphabetical .db.
 */
export function findNearestBeadsDb(start: string): string | null {
  let dir = path.resolve(start)
  // Cap iterations to avoid infinite loop in degenerate cases
  for (let i = 0; i < 100; i++) {
    const beads_dir = path.join(dir, ".beads")
    try {
      const entries = fs.readdirSync(beads_dir, { withFileTypes: true })
      const dbs = entries
        .filter(e => e.isFile() && e.name.endsWith(".db"))
        .map(e => e.name)
        .sort()
      const first_db = dbs[0]
      if (first_db) {
        return path.join(beads_dir, first_db)
      }
    } catch {
      // ignore and walk up
    }
    const parent = path.dirname(dir)
    if (parent === dir) {
      break
    }
    dir = parent
  }
  return null
}

/**
 * Resolve possibly relative `p` against `cwd` to an absolute filesystem path.
 */
function absFrom(p: string, cwd: string): string {
  return path.isAbsolute(p) ? path.normalize(p) : path.join(cwd, p)
}

/**
 * Check if a file exists at path `p`.
 */
function fileExists(p: string): boolean {
  try {
    fs.accessSync(p, fs.constants.F_OK)
    return true
  } catch {
    return false
  }
}
