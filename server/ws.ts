import type { Server } from "node:http"
import type { RawData, WebSocket } from "ws"
import type { MessageType } from "../types/protocol.js"
import type { SubscriptionSpec, ItemLike } from "./subscriptions.js"
import type { FetchListResult } from "./list-adapters.js"
import type { NormalizedIssue } from "../types/issues.js"

import path from "node:path"
import { WebSocketServer } from "ws"
import { isRequest, makeError, makeOk } from "../app/protocol.js"
import { getGitUserName, runBd, runBdJson } from "./bd.js"
import { resolveDbPath } from "./db.js"
import { fetchListForSubscription } from "./list-adapters.js"
import { debug } from "./logging.js"
import { getAvailableWorkspaces } from "./registry-watcher.js"
import { keyOf, registry } from "./subscriptions.js"
import { validateSubscribeListPayload } from "./validators.js"

const log = debug("ws")

/**
 * Debounced refresh scheduling for active list subscriptions.
 * A trailing window coalesces rapid change bursts into a single refresh run.
 */
let REFRESH_TIMER: ReturnType<typeof setTimeout> | null = null
let REFRESH_DEBOUNCE_MS = 75

/**
 * Mutation refresh window gate. When active, watcher-driven list refresh
 * scheduling is suppressed. The gate resolves either when a watcher event
 * arrives (via scheduleListRefresh) or when a timeout elapses, at which
 * point a single refresh pass over all active list subscriptions is run.
 */
export interface MutationGate {
  resolved: boolean
  resolve: (reason: "watcher" | "timeout") => void
  timer: ReturnType<typeof setTimeout>
}

let MUTATION_GATE: MutationGate | null = null

/**
 * Start a mutation window gate if not already active. The gate resolves on the
 * next watcher event or after `timeout_ms`, then triggers a single refresh run
 * across all active list subscriptions. Watcher-driven refresh scheduling is
 * suppressed during the window.
 *
 * Fire-and-forget; callers should not await this.
 *
 * @param timeout_ms - Timeout in milliseconds before auto-resolving the gate.
 */
function triggerMutationRefreshOnce(timeout_ms: number = 500): void {
  if (MUTATION_GATE) {
    return
  }
  let doResolve: (r: "watcher" | "timeout") => void = () => {}
  const p = new Promise<"watcher" | "timeout">(resolve => {
    doResolve = resolve
  })
  MUTATION_GATE = {
    resolved: false,
    resolve: reason => {
      if (!MUTATION_GATE || MUTATION_GATE.resolved) {
        return
      }
      MUTATION_GATE.resolved = true
      try {
        doResolve(reason)
      } catch {
        // ignore resolve errors
      }
    },
    timer: setTimeout(() => {
      try {
        MUTATION_GATE?.resolve("timeout")
      } catch {
        // ignore
      }
    }, timeout_ms),
  }
  MUTATION_GATE.timer.unref?.()

  // After resolution, run a single refresh across active subs and clear gate
  void p.then(async () => {
    log("mutation window resolved → refresh active subs")
    try {
      await refreshAllActiveListSubscriptions()
    } catch {
      // ignore refresh errors
    } finally {
      try {
        if (MUTATION_GATE?.timer) {
          clearTimeout(MUTATION_GATE.timer)
        }
      } catch {
        // ignore
      }
      MUTATION_GATE = null
    }
  })
}

/**
 * Collect unique active list subscription specs across all connected clients.
 */
function collectActiveListSpecs(): SubscriptionSpec[] {
  const specs: SubscriptionSpec[] = []
  const seen: Set<string> = new Set()
  const wss = CURRENT_WSS
  if (!wss) {
    return specs
  }
  for (const ws of wss.clients) {
    if (ws.readyState !== ws.OPEN) {
      continue
    }
    const s = ensureSubs(ws)
    if (!s.list_subs) {
      continue
    }
    for (const { key, spec } of s.list_subs.values()) {
      if (!seen.has(key)) {
        seen.add(key)
        specs.push(spec)
      }
    }
  }
  return specs
}

/**
 * Run refresh for all active list subscription specs and publish deltas.
 */
async function refreshAllActiveListSubscriptions(): Promise<void> {
  const specs = collectActiveListSpecs()
  // Run refreshes concurrently; locking is handled per key in the registry
  await Promise.all(
    specs.map(async spec => {
      try {
        await refreshAndPublish(spec)
      } catch {
        // ignore refresh errors per spec
      }
    }),
  )
}

/**
 * Schedule a coalesced refresh of all active list subscriptions.
 */
export function scheduleListRefresh(): void {
  // Suppress watcher-driven refreshes during an active mutation gate; resolve gate once
  if (MUTATION_GATE) {
    try {
      MUTATION_GATE.resolve("watcher")
    } catch {
      // ignore
    }
    return
  }
  if (REFRESH_TIMER) {
    clearTimeout(REFRESH_TIMER)
  }
  REFRESH_TIMER = setTimeout(() => {
    REFRESH_TIMER = null
    // Fire and forget; callers don't await scheduling
    void refreshAllActiveListSubscriptions()
  }, REFRESH_DEBOUNCE_MS)
  REFRESH_TIMER.unref?.()
}

/**
 * Per-connection subscription state.
 */
export interface ConnectionSubs {
  show_id?: string | null
  list_subs?: Map<string, { key: string; spec: SubscriptionSpec }>
  list_revisions?: Map<string, number>
}

const SUBS: WeakMap<WebSocket, ConnectionSubs> = new WeakMap()

let CURRENT_WSS: WebSocketServer | null = null

/**
 * Current workspace configuration.
 */
export interface WorkspaceConfig {
  root_dir: string
  db_path: string
}

let CURRENT_WORKSPACE: WorkspaceConfig | null = null

/**
 * Reference to the database watcher for rebinding on workspace change.
 */
export interface DbWatcher {
  rebind: (opts?: { root_dir?: string }) => void
  path: string
}

let DB_WATCHER: DbWatcher | null = null

/**
 * Get or initialize the subscription state for a socket.
 *
 * @param ws - The WebSocket connection.
 */
function ensureSubs(ws: WebSocket): ConnectionSubs {
  let s = SUBS.get(ws)
  if (!s) {
    s = {
      show_id: null,
      list_subs: new Map(),
      list_revisions: new Map(),
    }
    SUBS.set(ws, s)
  }
  return s
}

/**
 * Get next monotonically increasing revision for a subscription key on this connection.
 *
 * @param ws - The WebSocket connection.
 * @param key - The subscription key.
 */
function nextListRevision(ws: WebSocket, key: string): number {
  const s = ensureSubs(ws)
  const m = s.list_revisions || new Map<string, number>()
  s.list_revisions = m
  const prev = m.get(key) || 0
  const next = prev + 1
  m.set(key, next)
  return next
}

/**
 * Emit per-subscription envelopes to a specific client id on a socket.
 * Helpers for snapshot / upsert / delete.
 */

/**
 * Emit a subscription snapshot to a client.
 *
 * @param ws - The WebSocket connection.
 * @param client_id - The client subscription ID.
 * @param key - The subscription key.
 * @param issues - Array of issue objects to send.
 */
function emitSubscriptionSnapshot(
  ws: WebSocket,
  client_id: string,
  key: string,
  issues: Array<Record<string, unknown>>,
): void {
  const revision = nextListRevision(ws, key)
  const payload = {
    type: "snapshot" as const,
    id: client_id,
    revision,
    issues,
  }
  const msg = JSON.stringify({
    id: `evt-${Date.now()}`,
    ok: true,
    type: "snapshot" as MessageType,
    payload,
  })
  try {
    ws.send(msg)
  } catch (err) {
    log("emit snapshot send failed key=%s id=%s: %o", key, client_id, err)
  }
}

/**
 * Emit a subscription upsert to a client.
 *
 * @param ws - The WebSocket connection.
 * @param client_id - The client subscription ID.
 * @param key - The subscription key.
 * @param issue - The issue object to send.
 */
function emitSubscriptionUpsert(
  ws: WebSocket,
  client_id: string,
  key: string,
  issue: Record<string, unknown>,
): void {
  const revision = nextListRevision(ws, key)
  const payload = {
    type: "upsert",
    id: client_id,
    revision,
    issue,
  }
  const msg = JSON.stringify({
    id: `evt-${Date.now()}`,
    ok: true,
    type: "upsert" as MessageType,
    payload,
  })
  try {
    ws.send(msg)
  } catch (err) {
    log("emit upsert send failed key=%s id=%s: %o", key, client_id, err)
  }
}

/**
 * Emit a subscription delete to a client.
 *
 * @param ws - The WebSocket connection.
 * @param client_id - The client subscription ID.
 * @param key - The subscription key.
 * @param issue_id - The ID of the deleted issue.
 */
function emitSubscriptionDelete(
  ws: WebSocket,
  client_id: string,
  key: string,
  issue_id: string,
): void {
  const revision = nextListRevision(ws, key)
  const payload = {
    type: "delete",
    id: client_id,
    revision,
    issue_id,
  }
  const msg = JSON.stringify({
    id: `evt-${Date.now()}`,
    ok: true,
    type: "delete" as MessageType,
    payload,
  })
  try {
    ws.send(msg)
  } catch (err) {
    log("emit delete send failed key=%s id=%s: %o", key, client_id, err)
  }
}

// issues-changed removed in v2: detail and lists are pushed via subscriptions

/**
 * Refresh a subscription spec: fetch via adapter, apply to registry and emit
 * per-subscription full-issue envelopes to subscribers. Serialized per key.
 *
 * @param spec - The subscription spec to refresh.
 */
async function refreshAndPublish(spec: SubscriptionSpec): Promise<void> {
  const key = keyOf(spec)
  await registry.withKeyLock(key, async () => {
    const fetch_opts = CURRENT_WORKSPACE?.root_dir ? { cwd: CURRENT_WORKSPACE.root_dir } : {}
    const res = await fetchListForSubscription(spec, fetch_opts)
    if (!res.ok) {
      log("refresh failed for %s: %s %o", key, res.error.message, res.error)
      return
    }
    const items = applyClosedIssuesFilter(spec, res.items)
    const prev_size = registry.get(key)?.itemsById.size || 0
    const delta = registry.applyItems(key, items)
    const entry = registry.get(key)
    if (!entry || entry.subscribers.size === 0) {
      return
    }
    const by_id: Map<string, NormalizedIssue> = new Map()
    for (const it of items) {
      if (it && typeof it.id === "string") {
        by_id.set(it.id, it)
      }
    }
    for (const ws of entry.subscribers) {
      if (ws.readyState !== ws.OPEN) {
        continue
      }
      const s = ensureSubs(ws)
      const subs = s.list_subs || new Map<string, { key: string; spec: SubscriptionSpec }>()
      const client_ids: string[] = []
      for (const [cid, v] of subs.entries()) {
        if (v.key === key) {
          client_ids.push(cid)
        }
      }
      if (client_ids.length === 0) {
        continue
      }
      if (prev_size === 0) {
        for (const cid of client_ids) {
          emitSubscriptionSnapshot(ws, cid, key, items)
        }
        continue
      }
      for (const cid of client_ids) {
        for (const id of [...delta.added, ...delta.updated]) {
          const issue = by_id.get(id)
          if (issue) {
            emitSubscriptionUpsert(ws, cid, key, issue)
          }
        }
        for (const id of delta.removed) {
          emitSubscriptionDelete(ws, cid, key, id)
        }
      }
    }
  })
}

/**
 * Closed issue item with required timestamp fields.
 */
interface ClosedIssueItem {
  id: string
  updated_at: number
  closed_at: number | null
  [key: string]: unknown
}

/**
 * Apply pre-diff filtering for closed-issues lists based on spec.params.since (epoch ms).
 *
 * @param spec - The subscription spec.
 * @param items - Array of issue items.
 */
function applyClosedIssuesFilter(
  spec: SubscriptionSpec,
  items: NormalizedIssue[],
): NormalizedIssue[] {
  if (String(spec.type) !== "closed-issues") {
    return items
  }
  const p = spec.params || {}
  const since = typeof p.since === "number" ? p.since : 0
  if (!Number.isFinite(since) || since <= 0) {
    return items
  }
  const out: NormalizedIssue[] = []
  for (const it of items) {
    const ca = it.closed_at
    if (typeof ca === "number" && Number.isFinite(ca) && ca >= since) {
      out.push(it)
    }
  }
  return out
}

/**
 * Options for attaching the WebSocket server.
 */
export interface AttachWsServerOptions {
  path?: string
  heartbeat_ms?: number
  refresh_debounce_ms?: number
  root_dir?: string
  watcher?: DbWatcher
}

/**
 * Return type for attachWsServer.
 */
export interface WsServerHandle {
  wss: WebSocketServer
  broadcast: (type: MessageType, payload?: unknown) => void
  scheduleListRefresh: () => void
  setWorkspace: (root_dir: string) => { changed: boolean; workspace: WorkspaceConfig }
}

/**
 * Attach a WebSocket server to an existing HTTP server.
 *
 * @param http_server - The HTTP server to attach to.
 * @param options - Configuration options.
 */
export function attachWsServer(
  http_server: Server,
  options: AttachWsServerOptions = {},
): WsServerHandle {
  const ws_path = options.path || "/ws"

  // Initialize workspace state
  const initial_root = options.root_dir || process.cwd()
  const initial_db = resolveDbPath({ cwd: initial_root })
  CURRENT_WORKSPACE = {
    root_dir: initial_root,
    db_path: initial_db.path,
  }

  if (options.watcher) {
    DB_WATCHER = options.watcher
  }
  const heartbeat_ms = options.heartbeat_ms ?? 30000
  if (typeof options.refresh_debounce_ms === "number") {
    const n = options.refresh_debounce_ms
    if (Number.isFinite(n) && n >= 0) {
      REFRESH_DEBOUNCE_MS = n
    }
  }

  const wss = new WebSocketServer({ server: http_server, path: ws_path })
  CURRENT_WSS = wss

  // Heartbeat: track if client answered the last ping
  wss.on("connection", ws => {
    log("client connected")
    // @ts-expect-error add marker property
    ws.isAlive = true

    // Initialize subscription state for this connection
    ensureSubs(ws)

    ws.on("pong", () => {
      // @ts-expect-error marker
      ws.isAlive = true
    })

    ws.on("message", data => {
      handleMessage(ws, data)
    })

    ws.on("close", () => {
      try {
        registry.onDisconnect(ws)
      } catch {
        // ignore cleanup errors
      }
    })
  })

  const interval = setInterval(() => {
    for (const ws of wss.clients) {
      // @ts-expect-error marker
      if (ws.isAlive === false) {
        ws.terminate()
        continue
      }
      // @ts-expect-error marker
      ws.isAlive = false
      ws.ping()
    }
  }, heartbeat_ms)

  interval.unref?.()

  wss.on("close", () => {
    clearInterval(interval)
  })

  /**
   * Broadcast a server-initiated event to all open clients.
   *
   * @param type - Message type.
   * @param payload - Message payload.
   */
  function broadcast(type: MessageType, payload?: unknown): void {
    const msg = JSON.stringify({
      id: `evt-${Date.now()}`,
      ok: true,
      type,
      payload,
    })
    for (const ws of wss.clients) {
      if (ws.readyState === ws.OPEN) {
        ws.send(msg)
      }
    }
  }

  /**
   * Change the current workspace and rebind the database watcher.
   *
   * @param new_root_dir - Absolute path to the new workspace root.
   */
  function setWorkspace(new_root_dir: string): { changed: boolean; workspace: WorkspaceConfig } {
    const resolved_root = path.resolve(new_root_dir)
    const new_db = resolveDbPath({ cwd: resolved_root })
    const old_path = CURRENT_WORKSPACE?.db_path || ""

    CURRENT_WORKSPACE = {
      root_dir: resolved_root,
      db_path: new_db.path,
    }

    const changed = new_db.path !== old_path

    if (changed) {
      log("workspace changed: %s → %s", old_path, new_db.path)

      // Rebind the database watcher to the new workspace
      if (DB_WATCHER) {
        DB_WATCHER.rebind({ root_dir: resolved_root })
      }

      // Clear existing registry entries and refresh all subscriptions
      registry.clear()

      // Broadcast workspace-changed event to all clients
      broadcast("workspace-changed", CURRENT_WORKSPACE)

      // Schedule refresh of all active list subscriptions
      scheduleListRefresh()
    }

    return { changed, workspace: CURRENT_WORKSPACE }
  }

  return {
    wss,
    broadcast,
    scheduleListRefresh,
    setWorkspace,
    // v2: list subscription refresh handles updates
  }
}

/**
 * Handle an incoming message frame and respond to the same socket.
 *
 * @param ws - The WebSocket connection.
 * @param data - Raw message data.
 */
export async function handleMessage(ws: WebSocket, data: RawData): Promise<void> {
  let json: unknown
  try {
    json = JSON.parse(data.toString())
  } catch {
    const reply = {
      id: "unknown",
      ok: false,
      type: "bad-json",
      error: { code: "bad_json", message: "Invalid JSON" },
    }
    ws.send(JSON.stringify(reply))
    return
  }

  if (!isRequest(json)) {
    log("invalid request")
    const reply = {
      id: "unknown",
      ok: false,
      type: "bad-request",
      error: { code: "bad_request", message: "Invalid request envelope" },
    }
    ws.send(JSON.stringify(reply))
    return
  }

  const req = json

  // Dispatch known types here as we implement them. For now, only a ping utility.
  if (req.type === ("ping" as MessageType)) {
    ws.send(JSON.stringify(makeOk(req, { ts: Date.now() })))
    return
  }

  // subscribe-list: payload { id: string, type: string, params?: object }
  if (req.type === "subscribe-list") {
    const payload_id = (req.payload as Record<string, unknown> | undefined)?.id || ""
    log("subscribe-list %s", payload_id)
    const validation = validateSubscribeListPayload((req.payload || {}) as Record<string, unknown>)
    if (!validation.ok) {
      ws.send(JSON.stringify(makeError(req, validation.code, validation.message)))
      return
    }
    const client_id = validation.id
    const spec = validation.spec
    const key = keyOf(spec)

    /**
     * Reply with an error and avoid attaching the subscription when
     * initialization fails.
     */
    const replyWithError = (
      code: string,
      message: string,
      details?: Record<string, unknown>,
    ): void => {
      ws.send(JSON.stringify(makeError(req, code, message, details)))
    }

    let initial: FetchListResult | null = null
    const subscribe_fetch_opts =
      CURRENT_WORKSPACE?.root_dir ? { cwd: CURRENT_WORKSPACE.root_dir } : {}
    try {
      initial = await fetchListForSubscription(spec, subscribe_fetch_opts)
    } catch (err) {
      log("subscribe-list snapshot error for %s: %o", key, err)
      const message = (err && (err as { message?: unknown }).message) || "Failed to load list"
      replyWithError("bd_error", String(message), { key })
      return
    }

    if (!initial.ok) {
      log("initial snapshot failed for %s: %s %o", key, initial.error.message, initial.error)
      const details = { ...(initial.error.details || {}), key }
      replyWithError(initial.error.code, initial.error.message, details)
      return
    }

    const s = ensureSubs(ws)
    const { key: attached_key } = registry.attach(spec, ws)
    s.list_subs?.set(client_id, { key: attached_key, spec })

    try {
      await registry.withKeyLock(attached_key, async () => {
        const items = applyClosedIssuesFilter(spec, initial ? initial.items : [])
        void registry.applyItems(attached_key, items)
        emitSubscriptionSnapshot(ws, client_id, attached_key, items)
      })
    } catch (err) {
      log("subscribe-list snapshot error for %s: %o", attached_key, err)
      s.list_subs?.delete(client_id)
      try {
        registry.detach(spec, ws)
      } catch {
        // ignore detach errors
      }
      replyWithError("bd_error", "Failed to publish snapshot", { key })
      return
    }

    ws.send(JSON.stringify(makeOk(req, { id: client_id, key: attached_key })))
    return
  }

  // unsubscribe-list: payload { id: string }
  if (req.type === "unsubscribe-list") {
    log("unsubscribe-list %s", (req.payload as Record<string, unknown> | undefined)?.id || "")
    const { id: client_id } = (req.payload || {}) as { id?: unknown }
    if (typeof client_id !== "string" || client_id.length === 0) {
      ws.send(
        JSON.stringify(makeError(req, "bad_request", "payload.id must be a non-empty string")),
      )
      return
    }
    const s = ensureSubs(ws)
    const sub = s.list_subs?.get(client_id) || null
    let removed = false
    if (sub) {
      try {
        removed = registry.detach(sub.spec, ws)
      } catch {
        removed = false
      }
      s.list_subs?.delete(client_id)
    }
    ws.send(
      JSON.stringify(
        makeOk(req, {
          id: client_id,
          unsubscribed: removed,
        }),
      ),
    )
    return
  }

  // Removed: subscribe-updates and subscribe-issues. No-ops in v2.

  // list-issues and epic-status were removed in favor of push-only subscriptions

  // Removed: show-issue. Details flow is push-only via `subscribe-list { type: 'issue-detail' }`.

  // type updates are not exposed via UI; no handler

  // update-assignee
  if (req.type === "update-assignee") {
    const { id, assignee } = (req.payload || {}) as { id?: unknown; assignee?: unknown }
    if (typeof id !== "string" || id.length === 0 || typeof assignee !== "string") {
      ws.send(
        JSON.stringify(
          makeError(req, "bad_request", "payload requires { id: string, assignee: string }"),
        ),
      )
      return
    }
    // Pass empty string to clear assignee when requested
    const res = await runBd(["update", id, "--assignee", assignee])
    if (res.code !== 0) {
      ws.send(JSON.stringify(makeError(req, "bd_error", res.stderr || "bd failed")))
      return
    }
    const shown = await runBdJson(["show", id, "--json"])
    if (shown.code !== 0) {
      ws.send(JSON.stringify(makeError(req, "bd_error", shown.stderr || "bd failed")))
      return
    }
    ws.send(JSON.stringify(makeOk(req, shown.stdoutJson)))
    try {
      triggerMutationRefreshOnce()
    } catch {
      // ignore
    }
    return
  }

  // update-status
  if (req.type === "update-status") {
    log("update-status")
    const { id, status } = (req.payload || {}) as { id?: unknown; status?: unknown }
    const allowed = new Set(["open", "in_progress", "closed"])
    if (
      typeof id !== "string" ||
      id.length === 0 ||
      typeof status !== "string" ||
      !allowed.has(status)
    ) {
      ws.send(
        JSON.stringify(
          makeError(
            req,
            "bad_request",
            "payload requires { id: string, status: 'open'|'in_progress'|'closed' }",
          ),
        ),
      )
      return
    }
    const res = await runBd(["update", id, "--status", status])
    if (res.code !== 0) {
      ws.send(JSON.stringify(makeError(req, "bd_error", res.stderr || "bd failed")))
      return
    }
    const shown = await runBdJson(["show", id, "--json"])
    if (shown.code !== 0) {
      ws.send(JSON.stringify(makeError(req, "bd_error", shown.stderr || "bd failed")))
      return
    }
    ws.send(JSON.stringify(makeOk(req, shown.stdoutJson)))
    // After mutation, refresh active subscriptions once (watcher or timeout)
    try {
      triggerMutationRefreshOnce()
    } catch {
      // ignore
    }
    return
  }

  // update-priority
  if (req.type === "update-priority") {
    log("update-priority")
    const { id, priority } = (req.payload || {}) as { id?: unknown; priority?: unknown }
    if (
      typeof id !== "string" ||
      id.length === 0 ||
      typeof priority !== "number" ||
      priority < 0 ||
      priority > 4
    ) {
      ws.send(
        JSON.stringify(
          makeError(req, "bad_request", "payload requires { id: string, priority: 0..4 }"),
        ),
      )
      return
    }
    const res = await runBd(["update", id, "--priority", String(priority)])
    if (res.code !== 0) {
      ws.send(JSON.stringify(makeError(req, "bd_error", res.stderr || "bd failed")))
      return
    }
    const shown = await runBdJson(["show", id, "--json"])
    if (shown.code !== 0) {
      ws.send(JSON.stringify(makeError(req, "bd_error", shown.stderr || "bd failed")))
      return
    }
    ws.send(JSON.stringify(makeOk(req, shown.stdoutJson)))
    try {
      triggerMutationRefreshOnce()
    } catch {
      // ignore
    }
    return
  }

  // edit-text
  if (req.type === "edit-text") {
    log("edit-text")
    const { id, field, value } = (req.payload || {}) as {
      id?: unknown
      field?: unknown
      value?: unknown
    }
    if (
      typeof id !== "string" ||
      id.length === 0 ||
      (field !== "title" &&
        field !== "description" &&
        field !== "acceptance" &&
        field !== "notes" &&
        field !== "design") ||
      typeof value !== "string"
    ) {
      ws.send(
        JSON.stringify(
          makeError(
            req,
            "bad_request",
            "payload requires { id: string, field: 'title'|'description'|'acceptance'|'notes'|'design', value: string }",
          ),
        ),
      )
      return
    }
    // Map UI fields to bd CLI flags
    // title       → --title
    // description → --description
    // acceptance  → --acceptance-criteria
    // notes       → --notes
    // design      → --design
    const flag =
      field === "title" ? "--title"
      : field === "description" ? "--description"
      : field === "acceptance" ? "--acceptance-criteria"
      : field === "notes" ? "--notes"
      : "--design"
    const res = await runBd(["update", id, flag, value])
    if (res.code !== 0) {
      ws.send(JSON.stringify(makeError(req, "bd_error", res.stderr || "bd failed")))
      return
    }
    const shown = await runBdJson(["show", id, "--json"])
    if (shown.code !== 0) {
      ws.send(JSON.stringify(makeError(req, "bd_error", shown.stderr || "bd failed")))
      return
    }
    ws.send(JSON.stringify(makeOk(req, shown.stdoutJson)))
    try {
      triggerMutationRefreshOnce()
    } catch {
      // ignore
    }
    return
  }

  // create-issue
  if (req.type === "create-issue") {
    log("create-issue")
    const { title, type, priority, description } = (req.payload || {}) as {
      title?: unknown
      type?: unknown
      priority?: unknown
      description?: unknown
    }
    if (typeof title !== "string" || title.length === 0) {
      ws.send(
        JSON.stringify(makeError(req, "bad_request", "payload requires { title: string, ... }")),
      )
      return
    }
    const args = ["create", title]
    if (
      typeof type === "string" &&
      (type === "bug" ||
        type === "feature" ||
        type === "task" ||
        type === "epic" ||
        type === "chore")
    ) {
      args.push("-t", type)
    }
    if (typeof priority === "number" && priority >= 0 && priority <= 4) {
      args.push("-p", String(priority))
    }
    if (typeof description === "string" && description.length > 0) {
      args.push("-d", description)
    }
    const res = await runBd(args)
    if (res.code !== 0) {
      ws.send(JSON.stringify(makeError(req, "bd_error", res.stderr || "bd failed")))
      return
    }
    // Reply with a minimal ack
    ws.send(JSON.stringify(makeOk(req, { created: true })))
    // Refresh active subscriptions once (watcher or timeout)
    try {
      triggerMutationRefreshOnce()
    } catch {
      // ignore
    }
    return
  }

  // dep-add: payload { a: string, b: string, view_id?: string }
  if (req.type === "dep-add") {
    const { a, b, view_id } = (req.payload || {}) as {
      a?: unknown
      b?: unknown
      view_id?: unknown
    }
    if (typeof a !== "string" || a.length === 0 || typeof b !== "string" || b.length === 0) {
      ws.send(
        JSON.stringify(makeError(req, "bad_request", "payload requires { a: string, b: string }")),
      )
      return
    }
    const res = await runBd(["dep", "add", a, b])
    if (res.code !== 0) {
      ws.send(JSON.stringify(makeError(req, "bd_error", res.stderr || "bd failed")))
      return
    }
    const id = typeof view_id === "string" && view_id.length > 0 ? view_id : a
    const shown = await runBdJson(["show", id, "--json"])
    if (shown.code !== 0) {
      ws.send(JSON.stringify(makeError(req, "bd_error", shown.stderr || "bd failed")))
      return
    }
    ws.send(JSON.stringify(makeOk(req, shown.stdoutJson)))
    try {
      triggerMutationRefreshOnce()
    } catch {
      // ignore
    }
    return
  }

  // dep-remove: payload { a: string, b: string, view_id?: string }
  if (req.type === "dep-remove") {
    const { a, b, view_id } = (req.payload || {}) as {
      a?: unknown
      b?: unknown
      view_id?: unknown
    }
    if (typeof a !== "string" || a.length === 0 || typeof b !== "string" || b.length === 0) {
      ws.send(
        JSON.stringify(makeError(req, "bad_request", "payload requires { a: string, b: string }")),
      )
      return
    }
    const res = await runBd(["dep", "remove", a, b])
    if (res.code !== 0) {
      ws.send(JSON.stringify(makeError(req, "bd_error", res.stderr || "bd failed")))
      return
    }
    const id = typeof view_id === "string" && view_id.length > 0 ? view_id : a
    const shown = await runBdJson(["show", id, "--json"])
    if (shown.code !== 0) {
      ws.send(JSON.stringify(makeError(req, "bd_error", shown.stderr || "bd failed")))
      return
    }
    ws.send(JSON.stringify(makeOk(req, shown.stdoutJson)))
    try {
      triggerMutationRefreshOnce()
    } catch {
      // ignore
    }
    return
  }

  // label-add: payload { id: string, label: string }
  if (req.type === "label-add") {
    const { id, label } = (req.payload || {}) as { id?: unknown; label?: unknown }
    if (
      typeof id !== "string" ||
      id.length === 0 ||
      typeof label !== "string" ||
      label.trim().length === 0
    ) {
      ws.send(
        JSON.stringify(
          makeError(req, "bad_request", "payload requires { id: string, label: non-empty string }"),
        ),
      )
      return
    }
    const res = await runBd(["label", "add", id, label.trim()])
    if (res.code !== 0) {
      ws.send(JSON.stringify(makeError(req, "bd_error", res.stderr || "bd failed")))
      return
    }
    const shown = await runBdJson(["show", id, "--json"])
    if (shown.code !== 0) {
      ws.send(JSON.stringify(makeError(req, "bd_error", shown.stderr || "bd failed")))
      return
    }
    ws.send(JSON.stringify(makeOk(req, shown.stdoutJson)))
    try {
      triggerMutationRefreshOnce()
    } catch {
      // ignore
    }
    return
  }

  // label-remove: payload { id: string, label: string }
  if (req.type === "label-remove") {
    const { id, label } = (req.payload || {}) as { id?: unknown; label?: unknown }
    if (
      typeof id !== "string" ||
      id.length === 0 ||
      typeof label !== "string" ||
      label.trim().length === 0
    ) {
      ws.send(
        JSON.stringify(
          makeError(req, "bad_request", "payload requires { id: string, label: non-empty string }"),
        ),
      )
      return
    }
    const res = await runBd(["label", "remove", id, label.trim()])
    if (res.code !== 0) {
      ws.send(JSON.stringify(makeError(req, "bd_error", res.stderr || "bd failed")))
      return
    }
    const shown = await runBdJson(["show", id, "--json"])
    if (shown.code !== 0) {
      ws.send(JSON.stringify(makeError(req, "bd_error", shown.stderr || "bd failed")))
      return
    }
    ws.send(JSON.stringify(makeOk(req, shown.stdoutJson)))
    try {
      triggerMutationRefreshOnce()
    } catch {
      // ignore
    }
    return
  }

  // get-comments: payload { id: string }
  if (req.type === "get-comments") {
    const { id } = (req.payload || {}) as { id?: unknown }
    if (typeof id !== "string" || id.length === 0) {
      ws.send(JSON.stringify(makeError(req, "bad_request", "payload requires { id: string }")))
      return
    }
    const res = await runBdJson(["comments", id, "--json"])
    if (res.code !== 0) {
      ws.send(JSON.stringify(makeError(req, "bd_error", res.stderr || "bd failed")))
      return
    }
    ws.send(JSON.stringify(makeOk(req, res.stdoutJson || [])))
    return
  }

  // add-comment: payload { id: string, text: string }
  if (req.type === "add-comment") {
    const { id, text } = (req.payload || {}) as { id?: unknown; text?: unknown }
    if (
      typeof id !== "string" ||
      id.length === 0 ||
      typeof text !== "string" ||
      text.trim().length === 0
    ) {
      ws.send(
        JSON.stringify(
          makeError(req, "bad_request", "payload requires { id: string, text: non-empty string }"),
        ),
      )
      return
    }

    // Get git user name for author attribution
    const author = await getGitUserName()
    const args = ["comment", id, text.trim()]
    if (author) {
      args.push("--author", author)
    }

    const res = await runBd(args)
    if (res.code !== 0) {
      ws.send(JSON.stringify(makeError(req, "bd_error", res.stderr || "bd failed")))
      return
    }

    // Return updated comments list
    const comments = await runBdJson(["comments", id, "--json"])
    if (comments.code !== 0) {
      ws.send(JSON.stringify(makeError(req, "bd_error", comments.stderr || "bd failed")))
      return
    }
    ws.send(JSON.stringify(makeOk(req, comments.stdoutJson || [])))
    return
  }

  // delete-issue: payload { id: string }
  if (req.type === "delete-issue") {
    const { id } = (req.payload || {}) as { id?: unknown }
    if (typeof id !== "string" || id.length === 0) {
      ws.send(JSON.stringify(makeError(req, "bad_request", "payload requires { id: string }")))
      return
    }
    const res = await runBd(["delete", id, "--force"])
    if (res.code !== 0) {
      ws.send(JSON.stringify(makeError(req, "bd_error", res.stderr || "bd delete failed")))
      return
    }
    ws.send(JSON.stringify(makeOk(req, { deleted: true, id })))
    try {
      triggerMutationRefreshOnce()
    } catch {
      // ignore
    }
    return
  }

  // list-workspaces: returns all available workspaces from the registry
  if (req.type === "list-workspaces") {
    log("list-workspaces")
    const workspaces = getAvailableWorkspaces()
    ws.send(
      JSON.stringify(
        makeOk(req, {
          workspaces,
          current: CURRENT_WORKSPACE,
        }),
      ),
    )
    return
  }

  // get-workspace: returns the current workspace
  if (req.type === "get-workspace") {
    log("get-workspace")
    ws.send(JSON.stringify(makeOk(req, CURRENT_WORKSPACE)))
    return
  }

  // set-workspace: payload { path: string }
  if (req.type === "set-workspace") {
    log("set-workspace")
    const { path: workspace_path } = (req.payload || {}) as { path?: unknown }
    if (typeof workspace_path !== "string" || workspace_path.length === 0) {
      ws.send(
        JSON.stringify(
          makeError(
            req,
            "bad_request",
            "payload requires { path: string } (absolute workspace path)",
          ),
        ),
      )
      return
    }

    // Resolve and validate the path
    const resolved = path.resolve(workspace_path)

    // Update workspace (this will rebind watcher, clear registry, broadcast change)
    const new_db = resolveDbPath({ cwd: resolved })
    const old_path = CURRENT_WORKSPACE?.db_path || ""

    CURRENT_WORKSPACE = {
      root_dir: resolved,
      db_path: new_db.path,
    }

    const changed = new_db.path !== old_path

    if (changed) {
      log("workspace changed via set-workspace: %s → %s", old_path, new_db.path)

      // Rebind the database watcher
      if (DB_WATCHER) {
        DB_WATCHER.rebind({ root_dir: resolved })
      }

      // Clear existing registry entries
      registry.clear()

      // Schedule refresh of all active list subscriptions
      scheduleListRefresh()
    }

    ws.send(
      JSON.stringify(
        makeOk(req, {
          changed,
          workspace: CURRENT_WORKSPACE,
        }),
      ),
    )
    return
  }

  // Unknown type
  const err = makeError(req, "unknown_type", `Unknown message type: ${req.type}`)
  ws.send(JSON.stringify(err))
}
