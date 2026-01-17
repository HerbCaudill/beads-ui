/**
 * Hash-based router for tabs (issues/epics/board) and deep-linked issue ids.
 */

import { issueHashFor } from "./utils/issue-url.js"
import { debug } from "./utils/logging.js"

/**
 * The view names supported by the router.
 */
export type ViewName = "issues" | "epics" | "board"

/**
 * Minimal interface for the app state store used by the router.
 */
export interface RouterStore {
  getState: () => { selected_id: string | null; view: ViewName }
  setState: (patch: { selected_id?: string | null; view?: ViewName }) => void
}

/**
 * The hash router instance.
 */
export interface HashRouter {
  start: () => void
  stop: () => void
  gotoIssue: (id: string) => void
  gotoView: (view: ViewName) => void
}

/**
 * Parse an application hash and extract the selected issue id.
 * Supports canonical form "#/(issues|epics|board)?issue=<id>" and legacy
 * "#/issue/<id>" which we will rewrite to the canonical form.
 */
export function parseHash(hash: string): string | null {
  const h = String(hash || "")
  // Extract the fragment sans leading '#'
  const frag = h.startsWith("#") ? h.slice(1) : h
  const qIndex = frag.indexOf("?")
  const query = qIndex >= 0 ? frag.slice(qIndex + 1) : ""
  if (query) {
    const params = new URLSearchParams(query)
    const id = params.get("issue")
    if (id) {
      return decodeURIComponent(id)
    }
  }
  // Legacy pattern: #/issue/<id>
  const m = /^\/issue\/([^\s?#]+)/.exec(frag)
  return m?.[1] ? decodeURIComponent(m[1]) : null
}

/**
 * Parse the current view from hash.
 */
export function parseView(hash: string): ViewName {
  const h = String(hash || "")
  if (/^#\/epics(\b|\/|$)/.test(h)) {
    return "epics"
  }
  if (/^#\/board(\b|\/|$)/.test(h)) {
    return "board"
  }
  // Default to issues (also covers #/issues and unknown/empty)
  return "issues"
}

/**
 * Create a hash-based router that syncs URL hash with app state.
 *
 * @param store - The app state store to update on hash changes.
 */
export function createHashRouter(store: RouterStore): HashRouter {
  const log = debug("router")

  const onHashChange = (): void => {
    const hash = window.location.hash || ""
    // Rewrite legacy #/issue/<id> to canonical #/issues?issue=<id>
    const legacyMatch = /^#\/issue\/([^\s?#]+)/.exec(hash)
    if (legacyMatch?.[1]) {
      const id = decodeURIComponent(legacyMatch[1])
      // Update state immediately for consumers expecting sync selection
      store.setState({ selected_id: id, view: "issues" })
      const next = `#/issues?issue=${encodeURIComponent(id)}`
      if (window.location.hash !== next) {
        window.location.hash = next
        return // will trigger handler again
      }
    }
    const id = parseHash(hash)
    const view = parseView(hash)
    log("hash change → view=%s id=%s", view, id)
    store.setState({ selected_id: id, view })
  }

  return {
    start() {
      window.addEventListener("hashchange", onHashChange)
      onHashChange()
    },
    stop() {
      window.removeEventListener("hashchange", onHashChange)
    },
    gotoIssue(id: string) {
      // Keep current view in hash and append issue param via helper
      const s = store.getState()
      const view = s.view || "issues"
      const next = issueHashFor(view, id)
      log("goto issue %s (view=%s)", id, view)
      if (window.location.hash !== next) {
        window.location.hash = next
      } else {
        // Force state update even if hash is the same
        store.setState({ selected_id: id, view })
      }
    },
    gotoView(view: ViewName) {
      const s = store.getState()
      const id = s.selected_id
      const next = id ? issueHashFor(view, id) : `#/${view}`
      log("goto view %s (id=%s)", view, id || "")
      if (window.location.hash !== next) {
        window.location.hash = next
      } else {
        store.setState({ view, selected_id: null })
      }
    },
  }
}
