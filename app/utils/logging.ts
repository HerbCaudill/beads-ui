/**
 * Debug logger helper for the browser app.
 */
import createDebug from "debug"

/**
 * Create a namespaced logger.
 *
 * @param ns - Module namespace suffix (e.g., 'ws', 'views:list').
 */
export function debug(ns: string): ReturnType<typeof createDebug> {
  return createDebug(`beads-ui:${ns}`)
}
