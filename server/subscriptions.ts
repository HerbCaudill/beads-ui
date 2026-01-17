/**
 * Server-side subscription registry for list-like data.
 *
 * Maintains per-subscription entries keyed by a stable string derived from
 * `{ type, params }`. Each entry stores:
 *  - `itemsById`: Map<string, { updated_at: number, closed_at: number|null }>
 *  - `subscribers`: Set<WebSocket>
 *  - `lock`: Promise chain to serialize refresh/update operations per key
 *
 * No TTL eviction; entries are swept when sockets disconnect (and only when
 * that leaves the subscriber set empty).
 */
import type { WebSocket } from "ws"

export interface SubscriptionSpec {
  type: string
  params?: Record<string, string | number | boolean>
}

export interface ItemMeta {
  updated_at: number
  closed_at: number | null
}

export interface Entry {
  itemsById: Map<string, ItemMeta>
  subscribers: Set<WebSocket>
  lock: Promise<void>
}

export interface Delta {
  added: string[]
  updated: string[]
  removed: string[]
}

/**
 * Create a new, empty entry object.
 */
function createEntry(): Entry {
  return {
    itemsById: new Map(),
    subscribers: new Set(),
    lock: Promise.resolve(),
  }
}

/**
 * Generate a stable subscription key string from a spec. Sorts params keys.
 */
export function keyOf(spec: SubscriptionSpec): string {
  const type = String(spec.type || "").trim()
  const flat: Record<string, string> = {}
  if (spec.params && typeof spec.params === "object") {
    const keys = Object.keys(spec.params).sort()
    for (const k of keys) {
      const v = spec.params[k]
      if (v !== undefined) {
        flat[k] = String(v)
      }
    }
  }
  const enc = new URLSearchParams(flat).toString()
  return enc.length > 0 ? `${type}?${enc}` : type
}

/**
 * Compute a delta between previous and next item maps.
 */
export function computeDelta(prev: Map<string, ItemMeta>, next: Map<string, ItemMeta>): Delta {
  const added: string[] = []
  const updated: string[] = []
  const removed: string[] = []

  for (const [id, meta] of next) {
    const p = prev.get(id)
    if (!p) {
      added.push(id)
      continue
    }
    if (p.updated_at !== meta.updated_at || p.closed_at !== meta.closed_at) {
      updated.push(id)
    }
  }
  for (const id of prev.keys()) {
    if (!next.has(id)) {
      removed.push(id)
    }
  }
  return { added, updated, removed }
}

export interface ItemLike {
  id: string
  updated_at: number
  closed_at?: number | null
}

/**
 * Normalize array of issue-like objects into an itemsById map.
 */
export function toItemsMap(items: ItemLike[]): Map<string, ItemMeta> {
  const map: Map<string, ItemMeta> = new Map()
  for (const it of items) {
    if (!it || typeof it.id !== "string") {
      continue
    }
    const updated_at = Number(it.updated_at) || 0
    let closed_at: number | null = null
    if (it.closed_at === null || it.closed_at === undefined) {
      closed_at = null
    } else {
      const n = Number(it.closed_at)
      closed_at = Number.isFinite(n) ? n : null
    }
    map.set(it.id, { updated_at, closed_at })
  }
  return map
}

/**
 * Create a subscription registry with attach/detach and per-key locking.
 */
export class SubscriptionRegistry {
  private _entries: Map<string, Entry> = new Map()

  /**
   * Get an entry by key, or null if missing.
   */
  get(key: string): Entry | null {
    return this._entries.get(key) ?? null
  }

  /**
   * Ensure an entry exists for a spec; returns the key and entry.
   */
  ensure(spec: SubscriptionSpec): { key: string; entry: Entry } {
    const key = keyOf(spec)
    let entry = this._entries.get(key)
    if (!entry) {
      entry = createEntry()
      this._entries.set(key, entry)
    }
    return { key, entry }
  }

  /**
   * Attach a subscriber to a spec. Creates the entry if missing.
   */
  attach(spec: SubscriptionSpec, ws: WebSocket): { key: string; subscribed: true } {
    const { key, entry } = this.ensure(spec)
    entry.subscribers.add(ws)
    return { key, subscribed: true }
  }

  /**
   * Detach a subscriber from the spec. Keeps entry even if empty; eviction
   * is handled by `onDisconnect` sweep.
   */
  detach(spec: SubscriptionSpec, ws: WebSocket): boolean {
    const key = keyOf(spec)
    const entry = this._entries.get(key)
    if (!entry) {
      return false
    }
    return entry.subscribers.delete(ws)
  }

  /**
   * On socket disconnect, remove it from all subscriber sets and evict any
   * entries that become empty as a result of this sweep.
   */
  onDisconnect(ws: WebSocket): void {
    const empties: string[] = []
    for (const [key, entry] of this._entries) {
      entry.subscribers.delete(ws)
      if (entry.subscribers.size === 0) {
        empties.push(key)
      }
    }
    for (const key of empties) {
      this._entries.delete(key)
    }
  }

  /**
   * Serialize a function against a key so only one runs at a time per key.
   */
  async withKeyLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    let entry = this._entries.get(key)
    if (!entry) {
      entry = createEntry()
      this._entries.set(key, entry)
    }
    // Chain onto the existing lock
    const prev = entry.lock
    // Create our own release function and store it locally (not in shared state)
    // to avoid race conditions when multiple operations queue concurrently
    let release: (v?: void) => void = () => {}
    const our_lock = new Promise<void>(resolve => {
      release = resolve
    })
    // Update the entry's lock to our lock so the next operation waits on us
    entry.lock = our_lock
    // Wait for previous operations to finish
    await prev.catch(() => {})
    try {
      const result = await fn()
      return result
    } finally {
      // Release our lock for the next queued operation
      // Use the locally-captured release function, not entry.lockTail
      try {
        release()
      } catch {
        // ignore
      }
    }
  }

  /**
   * Replace items for a key and compute the delta, storing the new map.
   */
  applyNextMap(key: string, next_map: Map<string, ItemMeta>): Delta {
    let entry = this._entries.get(key)
    if (!entry) {
      entry = createEntry()
      this._entries.set(key, entry)
    }
    const prev = entry.itemsById
    const delta = computeDelta(prev, next_map)
    entry.itemsById = new Map(next_map)
    return delta
  }

  /**
   * Convenience: update items from an array of objects with id/updated_at/closed_at.
   */
  applyItems(key: string, items: ItemLike[]): Delta {
    const next_map = toItemsMap(items)
    return this.applyNextMap(key, next_map)
  }

  /**
   * Clear all entries from the registry. Used when switching workspaces.
   * Does not close WebSocket connections; they will re-subscribe on refresh.
   */
  clear(): void {
    this._entries.clear()
  }
}

/**
 * Default singleton registry used by the ws server.
 */
export const registry = new SubscriptionRegistry()
