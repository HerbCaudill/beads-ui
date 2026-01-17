/**
 * Client-side list subscription store.
 *
 * Maintains per-subscription state keyed by client-provided `id`.
 * Applies server `list-delta` events per subscription key and exposes simple
 * selectors for rendering.
 */

import type { MessageType } from "../../types/protocol.js"
import type { SubscriptionSpec } from "../../types/list-adapters.js"
import { debug } from "../utils/logging.js"

/**
 * Delta object for subscription updates.
 */
export interface SubscriptionDelta {
  added: string[]
  updated: string[]
  removed: string[]
}

/**
 * Internal subscription entry tracking items for a client.
 */
interface SubscriptionEntry {
  key: string
  itemsById: Map<string, true>
}

/**
 * Transport function signature for sending messages to the server.
 */
export type SubscriptionTransport = (type: MessageType, payload?: unknown) => Promise<unknown>

/**
 * Selectors interface for querying subscription state.
 */
export interface SubscriptionSelectors {
  /** Get an array of item ids for a subscription. */
  getIds: (clientId: string) => string[]
  /** Check if an id exists in a subscription. */
  has: (clientId: string, id: string) => boolean
  /** Count items for a subscription. */
  count: (clientId: string) => number
  /** Return a shallow object copy `{ [id]: true }` for rendering helpers. */
  getItemsById: (clientId: string) => Record<string, true>
}

/**
 * Subscription store interface returned by createSubscriptionStore.
 */
export interface SubscriptionStore {
  /** Subscribe to a list spec with a client-provided id. Returns an unsubscribe function. */
  subscribeList: (clientId: string, spec: SubscriptionSpec) => Promise<() => Promise<void>>
  /** Apply a delta to all client ids mapped to a given key (for testing/diagnostics). */
  _applyDelta: (key: string, delta: SubscriptionDelta) => void
  /** Generate a stable subscription key string from a spec (for testing/diagnostics). */
  _subKeyOf: (spec: SubscriptionSpec) => string
  /** Selectors for querying subscription state. */
  selectors: SubscriptionSelectors
}

/**
 * Generate a stable subscription key string from a spec.
 * Mirrors server `keyOf` implementation (sorted params, URLSearchParams).
 */
export function subKeyOf(spec: SubscriptionSpec): string {
  const type = String(spec.type || "").trim()
  const flat: Record<string, string> = {}
  if (spec.params && typeof spec.params === "object") {
    const keys = Object.keys(spec.params).sort()
    for (const k of keys) {
      const v = spec.params[k]
      flat[k] = String(v)
    }
  }
  const enc = new URLSearchParams(flat).toString()
  return enc.length > 0 ? `${type}?${enc}` : type
}

/**
 * Create a list subscription store.
 *
 * Wiring:
 * - Use `subscribeList` to register a subscription and send the request.
 *
 * Selectors are synchronous and return derived state by client id.
 *
 * @param send - ws send function.
 */
export function createSubscriptionStore(send: SubscriptionTransport): SubscriptionStore {
  const log = debug("subs")
  const subs_by_id = new Map<string, SubscriptionEntry>()
  const ids_by_key = new Map<string, Set<string>>()

  /**
   * Apply a delta to all client ids mapped to a given key.
   */
  function applyDelta(key: string, delta: SubscriptionDelta): void {
    log(
      "applyDelta %s +%d ~%d -%d",
      key,
      (delta.added || []).length,
      (delta.updated || []).length,
      (delta.removed || []).length,
    )
    const id_set = ids_by_key.get(key)
    if (!id_set || id_set.size === 0) {
      return
    }
    const added = Array.isArray(delta.added) ? delta.added : []
    const updated = Array.isArray(delta.updated) ? delta.updated : []
    const removed = Array.isArray(delta.removed) ? delta.removed : []

    for (const client_id of Array.from(id_set)) {
      const entry = subs_by_id.get(client_id)
      if (!entry) {
        continue
      }
      const items = entry.itemsById
      for (const id of added) {
        if (typeof id === "string" && id.length > 0) {
          items.set(id, true)
        }
      }
      for (const id of updated) {
        if (typeof id === "string" && id.length > 0) {
          items.set(id, true)
        }
      }
      for (const id of removed) {
        if (typeof id === "string" && id.length > 0) {
          items.delete(id)
        }
      }
    }
  }

  /**
   * Subscribe to a list spec with a client-provided id.
   * Returns an unsubscribe function.
   * Creates an empty items store immediately; server will publish deltas.
   */
  async function subscribeList(
    client_id: string,
    spec: SubscriptionSpec,
  ): Promise<() => Promise<void>> {
    const key = subKeyOf(spec)
    log("subscribe %s key=%s", client_id, key)
    // Initialize local entry immediately to capture early deltas
    if (!subs_by_id.has(client_id)) {
      subs_by_id.set(client_id, { key, itemsById: new Map() })
    } else {
      // Update key mapping if client id is reused for a different spec
      const prev = subs_by_id.get(client_id)
      if (prev && prev.key !== key) {
        const prev_ids = ids_by_key.get(prev.key)
        if (prev_ids) {
          prev_ids.delete(client_id)
          if (prev_ids.size === 0) {
            ids_by_key.delete(prev.key)
          }
        }
        subs_by_id.set(client_id, { key, itemsById: new Map() })
      }
    }
    if (!ids_by_key.has(key)) {
      ids_by_key.set(key, new Set())
    }
    const set = ids_by_key.get(key)
    if (set) {
      set.add(client_id)
    }
    try {
      await send("subscribe-list", {
        id: client_id,
        type: spec.type,
        params: spec.params,
      })
    } catch (err) {
      const entry = subs_by_id.get(client_id) || null
      if (entry) {
        const subscribers = ids_by_key.get(entry.key)
        if (subscribers) {
          subscribers.delete(client_id)
          if (subscribers.size === 0) {
            ids_by_key.delete(entry.key)
          }
        }
      }
      subs_by_id.delete(client_id)
      throw err
    }

    return async () => {
      log("unsubscribe %s key=%s", client_id, key)
      try {
        await send("unsubscribe-list", { id: client_id })
      } catch {
        // ignore transport errors on unsubscribe
      }
      // Cleanup local mappings
      const entry = subs_by_id.get(client_id) || null
      if (entry) {
        const s = ids_by_key.get(entry.key)
        if (s) {
          s.delete(client_id)
          if (s.size === 0) {
            ids_by_key.delete(entry.key)
          }
        }
      }
      subs_by_id.delete(client_id)
    }
  }

  /**
   * Selectors by client id.
   */
  const selectors: SubscriptionSelectors = {
    /**
     * Get an array of item ids for a subscription.
     */
    getIds(client_id: string): string[] {
      const entry = subs_by_id.get(client_id)
      if (!entry) {
        return []
      }
      return Array.from(entry.itemsById.keys())
    },
    /**
     * Check if an id exists in a subscription.
     */
    has(client_id: string, id: string): boolean {
      const entry = subs_by_id.get(client_id)
      if (!entry) {
        return false
      }
      return entry.itemsById.has(id)
    },
    /**
     * Count items for a subscription.
     */
    count(client_id: string): number {
      const entry = subs_by_id.get(client_id)
      return entry ? entry.itemsById.size : 0
    },
    /**
     * Return a shallow object copy `{ [id]: true }` for rendering helpers.
     */
    getItemsById(client_id: string): Record<string, true> {
      const entry = subs_by_id.get(client_id)
      const out: Record<string, true> = {}
      if (!entry) {
        return out
      }
      for (const id of entry.itemsById.keys()) {
        out[id] = true
      }
      return out
    },
  }

  return {
    subscribeList,
    // test/diagnostics helpers
    _applyDelta: applyDelta,
    _subKeyOf: subKeyOf,
    selectors,
  }
}
