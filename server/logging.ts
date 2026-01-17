/**
 * Debug logger helper for Node server/CLI.
 */
import createDebug from "debug"

/**
 * Create a namespaced logger for Node runtime.
 *
 * @param ns - Module namespace suffix (e.g., 'ws', 'watcher').
 */
export function debug(ns: string): createDebug.Debugger {
  return createDebug(`beads-ui:${ns}`)
}

/**
 * Enable all `beads-ui:*` debug logs at runtime for Node/CLI.
 * Safe to call multiple times.
 */
export function enableAllDebug(): void {
  // `debug` exposes a global enable/disable API.
  // Enabling after loggers are created updates their `.enabled` state.
  createDebug.enable(process.env.DEBUG || "beads-ui:*")
}
