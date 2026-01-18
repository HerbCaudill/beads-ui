/**
 * Main React entry point.
 *
 * This module initializes the SPA shell, wires up WebSocket connections,
 * manages subscriptions, and sets up the data layer for React components.
 *
 * Note: View rendering is handled by React components in App.tsx.
 * This module focuses on:
 * - Creating the DOM shell structure
 * - WebSocket connection and event routing
 * - Subscription management
 * - Transport and data layer setup
 * - Workspace management
 * - Router initialization
 * - Preference persistence
 * - Theme initialization
 */
import { Component, StrictMode, type ErrorInfo, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import type { SubscriptionSpec } from "../types/list-adapters.js"
import type { SnapshotMsg, UpsertMsg, DeleteMsg } from "../types/subscription-issue-store.js"
import { App } from "./components/App.js"

/** Error boundary to catch and display React errors. */
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): { hasError: boolean; error: Error } {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught:", error, errorInfo)
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: "red", fontFamily: "monospace" }}>
          <h2>React Error</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {this.state.error?.message}
            {"\n\n"}
            {this.state.error?.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}
import { createListSelectors } from "./data/list-selectors.js"
import { type Transport } from "./data/providers.js"
import {
  createSubscriptionIssueStores,
  type SubscriptionIssueStoresRegistry,
} from "./data/subscription-issue-stores.js"
import { createSubscriptionStore } from "./data/subscriptions-store.js"
import {
  setIssueStoresInstance,
  setIssueStoresRegistryInstance,
  setListSelectorsInstance,
  setSubscriptionsInstance,
  setTransportInstance,
  setWorkspaceChangeHandler,
  showFatalError,
} from "./hooks/index.js"
import { createHashRouter, type RouterStore } from "./router.js"
import {
  useAppStore,
  type AppState,
  type StatePatch,
  type StatusFilter,
  type ViewName,
} from "./store/index.js"
import { createActivityIndicator } from "./utils/activity-indicator.js"
import { debug } from "./utils/logging.js"
import { showToast } from "./utils/toast.js"
import { createWsClient } from "./ws.js"

/** Persisted filter preferences shape. */
interface PersistedFilters {
  status: StatusFilter
  search: string
  type: string
}

/** Persisted board preferences shape. */
interface PersistedBoard {
  closed_filter: "today" | "3" | "7"
}

/** Unsubscribe function returned by list subscriptions. */
type UnsubscribeFn = (() => Promise<void>) | null

/**
 * Store interface for bootstrap - wraps Zustand for router and subscriptions.
 */
interface BootstrapStore extends RouterStore {
  getState: () => AppState
  setState: (patch: StatePatch) => void
  subscribe: (fn: (s: AppState) => void) => () => void
}

/**
 * Create a store adapter that wraps Zustand for use by the router and
 * state subscriptions in the bootstrap module.
 */
function createStoreAdapter(): BootstrapStore {
  return {
    getState(): AppState {
      const state = useAppStore.getState()
      return {
        selected_id: state.selected_id,
        view: state.view,
        filters: state.filters,
        board: state.board,
        workspace: state.workspace,
      }
    },

    setState(patch: StatePatch): void {
      useAppStore.getState().setState(patch)
    },

    subscribe(fn: (s: AppState) => void): () => void {
      // Subscribe to relevant state changes using Zustand's subscribeWithSelector
      return useAppStore.subscribe(
        state => ({
          selected_id: state.selected_id,
          view: state.view,
          filters: state.filters,
          board: state.board,
          workspace: state.workspace,
        }),
        (selected, _previous) => {
          fn(selected)
        },
        { equalityFn: shallowEqualAppState },
      )
    },
  }
}

/**
 * Shallow equality comparison for app state objects.
 */
function shallowEqualAppState(a: AppState, b: AppState): boolean {
  if (a === b) return true
  if (a.selected_id !== b.selected_id) return false
  if (a.view !== b.view) return false
  if (
    a.filters.status !== b.filters.status ||
    a.filters.search !== b.filters.search ||
    a.filters.type !== b.filters.type
  ) {
    return false
  }
  if (a.board.closed_filter !== b.board.closed_filter) return false
  if (a.workspace.current?.path !== b.workspace.current?.path) return false
  if (a.workspace.available.length !== b.workspace.available.length) return false
  return true
}

// SubscriptionIssueStoresRegistry is imported from subscription-issue-stores.js

/**
 * Bootstrap the SPA shell with two panels.
 *
 * @param root_element - The container element to render into.
 */
export function bootstrap(root_element: HTMLElement): void {
  const log = debug("main")
  log("bootstrap start")

  // Create route shells using vanilla DOM
  // React components render into these containers via portals
  const issues_section = document.createElement("section")
  issues_section.id = "issues-root"
  issues_section.className = "route issues"

  const list_panel = document.createElement("aside")
  list_panel.id = "list-panel"
  list_panel.className = "panel"
  issues_section.appendChild(list_panel)

  const epics_section = document.createElement("section")
  epics_section.id = "epics-root"
  epics_section.className = "route epics"
  epics_section.hidden = true

  const board_section = document.createElement("section")
  board_section.id = "board-root"
  board_section.className = "route board"
  board_section.hidden = true

  const detail_section = document.createElement("section")
  detail_section.id = "detail-panel"
  detail_section.className = "route detail"
  detail_section.hidden = true

  root_element.appendChild(issues_section)
  root_element.appendChild(epics_section)
  root_element.appendChild(board_section)
  root_element.appendChild(detail_section)

  const issues_root = document.getElementById("issues-root") as HTMLElement | null
  const epics_root = document.getElementById("epics-root") as HTMLElement | null
  const board_root = document.getElementById("board-root") as HTMLElement | null
  const detail_mount = document.getElementById("detail-panel") as HTMLElement | null

  if (issues_root && epics_root && board_root && detail_mount) {
    const header_loading = document.getElementById("header-loading") as HTMLElement | null
    const activity = createActivityIndicator(header_loading)

    /**
     * Show a blocking dialog when a backend command fails.
     *
     * @param err - The error to display.
     * @param context - Context string describing what failed.
     */
    function showFatalFromError(err: unknown, context: string): void {
      let message = "Request failed"
      let detail = ""

      if (err && typeof err === "object") {
        const any_err = err as { message?: unknown; details?: unknown }
        if (typeof any_err.message === "string" && any_err.message.length > 0) {
          message = any_err.message
        }
        if (typeof any_err.details === "string") {
          detail = any_err.details
        } else if (any_err.details && typeof any_err.details === "object") {
          try {
            detail = JSON.stringify(any_err.details, null, 2)
          } catch {
            detail = ""
          }
        }
      } else if (typeof err === "string" && err.length > 0) {
        message = err
      }

      const title = context && context.length > 0 ? `Failed to load ${context}` : "Request failed"

      // Show via React fatal error dialog
      showFatalError(title, message, detail)
    }

    const client = createWsClient()
    const tracked_send = activity.wrapSend((type, payload) => client.send(type, payload))
    // Subscriptions: wire client events and expose subscribe/unsubscribe helpers
    const subscriptions = createSubscriptionStore(tracked_send)
    // Per-subscription stores (source of truth)
    const sub_issue_stores = createSubscriptionIssueStores()
    // Expose to React hooks
    setIssueStoresInstance(sub_issue_stores)
    setIssueStoresRegistryInstance(sub_issue_stores)
    setSubscriptionsInstance(subscriptions)
    // Route per-subscription push envelopes to the owning store
    client.on("snapshot", (payload: unknown) => {
      const p = payload as { id?: string; type?: string }
      const id = p && typeof p.id === "string" ? p.id : ""
      const store_instance = id ? sub_issue_stores.getStore(id) : null
      if (store_instance && p && p.type === "snapshot") {
        try {
          store_instance.applyPush(p as SnapshotMsg)
        } catch {
          // ignore
        }
      }
    })
    client.on("upsert", (payload: unknown) => {
      const p = payload as { id?: string; type?: string }
      const id = p && typeof p.id === "string" ? p.id : ""
      const store_instance = id ? sub_issue_stores.getStore(id) : null
      if (store_instance && p && p.type === "upsert") {
        try {
          store_instance.applyPush(p as UpsertMsg)
        } catch {
          // ignore
        }
      }
    })
    client.on("delete", (payload: unknown) => {
      const p = payload as { id?: string; type?: string }
      const id = p && typeof p.id === "string" ? p.id : ""
      const store_instance = id ? sub_issue_stores.getStore(id) : null
      if (store_instance && p && p.type === "delete") {
        try {
          store_instance.applyPush(p as DeleteMsg)
        } catch {
          // ignore
        }
      }
    })
    // Derived list selectors: render from per-subscription snapshots
    const listSelectors = createListSelectors(sub_issue_stores)
    // Expose to React hooks
    setListSelectorsInstance(listSelectors)

    // --- Subscription state (hoisted for closure access) ---
    let unsub_issues_tab: UnsubscribeFn = null
    let unsub_epics_tab: UnsubscribeFn = null
    let unsub_board_ready: UnsubscribeFn = null
    let unsub_board_in_progress: UnsubscribeFn = null
    let unsub_board_closed: UnsubscribeFn = null
    let unsub_board_blocked: UnsubscribeFn = null
    let last_issues_spec_key: string | null = null

    // Track in-flight subscriptions to prevent duplicates during rapid view switching
    const pending_subscriptions = new Set<string>()

    /**
     * Compute subscription spec for Issues tab based on filters.
     *
     * @param filters - Current filter state.
     * @returns Subscription spec for the issues tab.
     */
    function computeIssuesSpec(filters: { status?: string }): SubscriptionSpec {
      const st = String(filters?.status || "all")
      if (st === "ready") {
        return { type: "ready-issues" }
      }
      if (st === "in_progress") {
        return { type: "in-progress-issues" }
      }
      if (st === "closed") {
        return { type: "closed-issues" }
      }
      // "all" and "open" map to all-issues; client filters apply locally
      return { type: "all-issues" }
    }

    /**
     * Ensure only the active tab has subscriptions; clean up previous.
     *
     * @param s - Current app state containing view and filters.
     */
    function ensureTabSubscriptions(s: { view: ViewName; filters: { status?: string } }): void {
      // Issues tab
      if (s.view === "issues") {
        const spec = computeIssuesSpec(s.filters || {})
        const key = JSON.stringify(spec)
        // Register store first to capture the initial snapshot
        try {
          sub_issue_stores.register("tab:issues", spec)
        } catch (err) {
          log("register issues store failed: %o", err)
        }
        // Only (re)subscribe if not yet subscribed, spec changed, and not already in-flight
        const issues_sub_key = `tab:issues:${key}`
        if (
          (!unsub_issues_tab || key !== last_issues_spec_key) &&
          !pending_subscriptions.has(issues_sub_key)
        ) {
          pending_subscriptions.add(issues_sub_key)
          void subscriptions
            .subscribeList("tab:issues", spec)
            .then(unsub => {
              unsub_issues_tab = unsub
              last_issues_spec_key = key
            })
            .catch(err => {
              log("subscribe issues failed: %o", err)
              showFatalFromError(err, "issues list")
            })
            .finally(() => {
              pending_subscriptions.delete(issues_sub_key)
            })
        }
      } else if (unsub_issues_tab) {
        void unsub_issues_tab().catch(() => {})
        unsub_issues_tab = null
        last_issues_spec_key = null
        try {
          sub_issue_stores.unregister("tab:issues")
        } catch (err) {
          log("unregister issues store failed: %o", err)
        }
      }

      // Epics tab
      if (s.view === "epics") {
        // Register store first to avoid race with initial snapshot
        try {
          sub_issue_stores.register("tab:epics", { type: "epics" })
        } catch (err) {
          log("register epics store failed: %o", err)
        }
        // Only subscribe if not already subscribed and not in-flight
        if (!unsub_epics_tab && !pending_subscriptions.has("tab:epics")) {
          pending_subscriptions.add("tab:epics")
          void subscriptions
            .subscribeList("tab:epics", { type: "epics" })
            .then(unsub => {
              unsub_epics_tab = unsub
            })
            .catch(err => {
              log("subscribe epics failed: %o", err)
              showFatalFromError(err, "epics")
            })
            .finally(() => {
              pending_subscriptions.delete("tab:epics")
            })
        }
      } else if (unsub_epics_tab) {
        void unsub_epics_tab().catch(() => {})
        unsub_epics_tab = null
        try {
          sub_issue_stores.unregister("tab:epics")
        } catch (err) {
          log("unregister epics store failed: %o", err)
        }
      }

      // Board tab subscribes to lists used by columns
      if (s.view === "board") {
        // Ready column
        if (!unsub_board_ready && !pending_subscriptions.has("tab:board:ready")) {
          try {
            sub_issue_stores.register("tab:board:ready", {
              type: "ready-issues",
            })
          } catch (err) {
            log("register board:ready store failed: %o", err)
          }
          pending_subscriptions.add("tab:board:ready")
          void subscriptions
            .subscribeList("tab:board:ready", { type: "ready-issues" })
            .then(u => {
              unsub_board_ready = u
            })
            .catch(err => {
              log("subscribe board ready failed: %o", err)
              showFatalFromError(err, "board (Ready)")
            })
            .finally(() => {
              pending_subscriptions.delete("tab:board:ready")
            })
        }
        // In Progress column
        if (!unsub_board_in_progress && !pending_subscriptions.has("tab:board:in-progress")) {
          try {
            sub_issue_stores.register("tab:board:in-progress", {
              type: "in-progress-issues",
            })
          } catch (err) {
            log("register board:in-progress store failed: %o", err)
          }
          pending_subscriptions.add("tab:board:in-progress")
          void subscriptions
            .subscribeList("tab:board:in-progress", {
              type: "in-progress-issues",
            })
            .then(u => {
              unsub_board_in_progress = u
            })
            .catch(err => {
              log("subscribe board in-progress failed: %o", err)
              showFatalFromError(err, "board (In Progress)")
            })
            .finally(() => {
              pending_subscriptions.delete("tab:board:in-progress")
            })
        }
        // Closed column
        if (!unsub_board_closed && !pending_subscriptions.has("tab:board:closed")) {
          try {
            sub_issue_stores.register("tab:board:closed", {
              type: "closed-issues",
            })
          } catch (err) {
            log("register board:closed store failed: %o", err)
          }
          pending_subscriptions.add("tab:board:closed")
          void subscriptions
            .subscribeList("tab:board:closed", { type: "closed-issues" })
            .then(u => {
              unsub_board_closed = u
            })
            .catch(err => {
              log("subscribe board closed failed: %o", err)
              showFatalFromError(err, "board (Closed)")
            })
            .finally(() => {
              pending_subscriptions.delete("tab:board:closed")
            })
        }
        // Blocked column
        if (!unsub_board_blocked && !pending_subscriptions.has("tab:board:blocked")) {
          try {
            sub_issue_stores.register("tab:board:blocked", {
              type: "blocked-issues",
            })
          } catch (err) {
            log("register board:blocked store failed: %o", err)
          }
          pending_subscriptions.add("tab:board:blocked")
          void subscriptions
            .subscribeList("tab:board:blocked", { type: "blocked-issues" })
            .then(u => {
              unsub_board_blocked = u
            })
            .catch(err => {
              log("subscribe board blocked failed: %o", err)
              showFatalFromError(err, "board (Blocked)")
            })
            .finally(() => {
              pending_subscriptions.delete("tab:board:blocked")
            })
        }
      } else {
        // Unsubscribe all board lists when leaving the board view
        if (unsub_board_ready) {
          void unsub_board_ready().catch(() => {})
          unsub_board_ready = null
          try {
            sub_issue_stores.unregister("tab:board:ready")
          } catch (err) {
            log("unregister board:ready failed: %o", err)
          }
        }
        if (unsub_board_in_progress) {
          void unsub_board_in_progress().catch(() => {})
          unsub_board_in_progress = null
          try {
            sub_issue_stores.unregister("tab:board:in-progress")
          } catch (err) {
            log("unregister board:in-progress failed: %o", err)
          }
        }
        if (unsub_board_closed) {
          void unsub_board_closed().catch(() => {})
          unsub_board_closed = null
          try {
            sub_issue_stores.unregister("tab:board:closed")
          } catch (err) {
            log("unregister board:closed failed: %o", err)
          }
        }
        if (unsub_board_blocked) {
          void unsub_board_blocked().catch(() => {})
          unsub_board_blocked = null
          try {
            sub_issue_stores.unregister("tab:board:blocked")
          } catch (err) {
            log("unregister board:blocked failed: %o", err)
          }
        }
      }
    }

    // --- Workspace management ---
    /**
     * Clear all subscriptions and stores, then re-establish them.
     * Called when switching workspaces.
     */
    async function clearAndResubscribe(): Promise<void> {
      log("clearing all subscriptions for workspace switch")
      // Unsubscribe from server-side subscriptions first
      if (unsub_issues_tab) {
        void unsub_issues_tab().catch(() => {})
        unsub_issues_tab = null
      }
      if (unsub_epics_tab) {
        void unsub_epics_tab().catch(() => {})
        unsub_epics_tab = null
      }
      if (unsub_board_ready) {
        void unsub_board_ready().catch(() => {})
        unsub_board_ready = null
      }
      if (unsub_board_in_progress) {
        void unsub_board_in_progress().catch(() => {})
        unsub_board_in_progress = null
      }
      if (unsub_board_closed) {
        void unsub_board_closed().catch(() => {})
        unsub_board_closed = null
      }
      if (unsub_board_blocked) {
        void unsub_board_blocked().catch(() => {})
        unsub_board_blocked = null
      }
      // Clear all subscription stores
      const store_ids = [
        "tab:issues",
        "tab:epics",
        "tab:board:ready",
        "tab:board:in-progress",
        "tab:board:closed",
        "tab:board:blocked",
      ]
      for (const id of store_ids) {
        try {
          sub_issue_stores.unregister(id)
        } catch {
          // ignore
        }
      }
      // Also clear any detail stores
      const s = store.getState()
      if (s.selected_id) {
        try {
          sub_issue_stores.unregister(`detail:${s.selected_id}`)
        } catch {
          // ignore
        }
      }
      // Force re-subscribe by resetting last spec key
      last_issues_spec_key = null
      // Re-establish subscriptions for current view
      ensureTabSubscriptions(store.getState())
    }

    /**
     * Extract project name from path.
     *
     * @param path - Workspace path.
     */
    function getProjectName(path: string): string {
      if (!path) {
        return "Unknown"
      }
      const parts = path.split("/").filter(Boolean)
      return parts.length > 0 ? parts[parts.length - 1]! : "Unknown"
    }

    /**
     * Handle workspace change request from the picker.
     *
     * @param workspace_path - Path to the workspace to switch to.
     */
    async function handleWorkspaceChange(workspace_path: string): Promise<void> {
      log("requesting workspace switch to %s", workspace_path)
      try {
        const result = (await client.send("set-workspace", {
          path: workspace_path,
        })) as {
          workspace?: { root_dir: string; db_path: string }
          changed?: boolean
        }
        log("workspace switch result: %o", result)
        if (result && result.workspace) {
          // Update state with new workspace
          store.setState({
            workspace: {
              current: {
                path: result.workspace.root_dir,
                database: result.workspace.db_path,
              },
            },
          })
          // Persist preference
          window.localStorage.setItem("beads-ui.workspace", workspace_path)
          // Clear and resubscribe if workspace actually changed
          if (result.changed) {
            await clearAndResubscribe()
            showToast("Switched to " + getProjectName(workspace_path), "success", 2000)
          }
        }
      } catch (err) {
        log("workspace switch failed: %o", err)
        showToast("Failed to switch workspace", "error", 3000)
        throw err
      }
    }

    /**
     * Load available workspaces from server and update state.
     */
    async function loadWorkspaces(): Promise<void> {
      try {
        const result = (await client.send("list-workspaces", {})) as {
          workspaces?: Array<{
            path: string
            database: string
            pid?: number
            version?: string
          }>
          current?: { root_dir: string; db_path: string }
        }
        log("workspaces loaded: %o", result)
        if (result && Array.isArray(result.workspaces)) {
          const available = result.workspaces.map(ws => {
            const info: { path: string; database: string; pid?: number; version?: string } = {
              path: ws.path,
              database: ws.database,
            }
            if (ws.pid !== undefined) {
              info.pid = ws.pid
            }
            if (ws.version !== undefined) {
              info.version = ws.version
            }
            return info
          })
          const current =
            result.current ?
              {
                path: result.current.root_dir,
                database: result.current.db_path,
              }
            : null
          store.setState({ workspace: { current, available } })

          // Check if we have a saved preference that differs from current
          const saved_workspace = window.localStorage.getItem("beads-ui.workspace")
          if (saved_workspace && current && saved_workspace !== current.path) {
            // Check if saved workspace is in available list
            const saved_exists = available.some(ws => ws.path === saved_workspace)
            if (saved_exists) {
              log("restoring saved workspace preference: %s", saved_workspace)
              await handleWorkspaceChange(saved_workspace)
            }
          }
        }
      } catch (err) {
        log("failed to load workspaces: %o", err)
      }
    }

    // Handle workspace-changed events from server (e.g., if another client changes workspace)
    client.on("workspace-changed", (payload: unknown) => {
      const p = payload as { root_dir?: string; db_path?: string }
      log("workspace-changed event: %o", payload)
      if (p && p.root_dir) {
        store.setState({
          workspace: {
            current: {
              path: p.root_dir,
              database: p.db_path || "",
            },
          },
        })
        // Reload workspaces to get fresh list
        void loadWorkspaces()
        // Clear and resubscribe
        void clearAndResubscribe()
      }
    })

    // --- End workspace management (mounting happens after store is created) ---

    // Show toasts for WebSocket connectivity changes
    let had_disconnect = false
    if (typeof client.onConnection === "function") {
      const onConn = (s: "connecting" | "open" | "closed" | "reconnecting"): void => {
        log("ws state %s", s)
        if (s === "reconnecting" || s === "closed") {
          had_disconnect = true
          showToast("Connection lost. Reconnecting…", "error", 4000)
        } else if (s === "open" && had_disconnect) {
          had_disconnect = false
          showToast("Reconnected", "success", 2200)
        }
      }
      client.onConnection(onConn)
    }
    // Load persisted filters (status/search/type) from localStorage
    let persisted_filters: PersistedFilters = { status: "all", search: "", type: "" }
    try {
      const raw = window.localStorage.getItem("beads-ui.filters")
      if (raw) {
        const obj = JSON.parse(raw) as {
          status?: unknown
          search?: unknown
          type?: unknown
          types?: unknown[]
        }
        if (obj && typeof obj === "object") {
          const ALLOWED = ["bug", "feature", "task", "epic", "chore"]
          let parsed_type = ""
          if (typeof obj.type === "string" && ALLOWED.includes(obj.type)) {
            parsed_type = obj.type
          } else if (Array.isArray(obj.types)) {
            // Backwards compatibility: pick first valid from previous array format
            let first_valid = ""
            for (const it of obj.types) {
              if (ALLOWED.includes(String(it))) {
                first_valid = String(it)
                break
              }
            }
            parsed_type = first_valid
          }
          persisted_filters = {
            status:
              (
                typeof obj.status === "string" &&
                ["all", "open", "in_progress", "closed", "ready"].includes(obj.status)
              ) ?
                (obj.status as StatusFilter)
              : "all",
            search: typeof obj.search === "string" ? obj.search : "",
            type: parsed_type,
          }
        }
      }
    } catch (err) {
      log("filters parse error: %o", err)
    }
    // Load last-view from storage
    let last_view: ViewName = "issues"
    try {
      const raw_view = window.localStorage.getItem("beads-ui.view")
      if (raw_view === "issues" || raw_view === "epics" || raw_view === "board") {
        last_view = raw_view
      }
    } catch (err) {
      log("view parse error: %o", err)
    }
    // Load board preferences
    let persisted_board: PersistedBoard = { closed_filter: "today" }
    try {
      const raw_board = window.localStorage.getItem("beads-ui.board")
      if (raw_board) {
        const obj = JSON.parse(raw_board) as { closed_filter?: unknown }
        if (obj && typeof obj === "object") {
          const cf = String(obj.closed_filter || "today")
          if (cf === "today" || cf === "3" || cf === "7") {
            persisted_board.closed_filter = cf
          }
        }
      }
    } catch (err) {
      log("board prefs parse error: %o", err)
    }

    // Initialize Zustand store with persisted values before creating the adapter
    useAppStore.getState().setState({
      filters: persisted_filters,
      view: last_view,
      board: persisted_board,
    })
    const store = createStoreAdapter()
    const router = createHashRouter(store)
    router.start()

    /**
     * Transport wrapper for the WebSocket client.
     *
     * @param type - Message type.
     * @param payload - Message payload.
     */
    const transport: Transport = async (type, payload) => {
      try {
        return await tracked_send(type, payload)
      } catch {
        return []
      }
    }
    // Expose to React hooks
    setTransportInstance(transport)

    // Expose workspace change handler to React
    setWorkspaceChangeHandler(handleWorkspaceChange)
    // Load workspaces after WebSocket is connected
    void loadWorkspaces()

    // Note: Navigation, workspace picker, new issue dialog, list view,
    // detail view, board view, and epics view are now handled by React
    // components in App.tsx via portals.

    // Persist filter changes to localStorage
    store.subscribe(s => {
      const data = {
        status: s.filters.status,
        search: s.filters.search,
        type: typeof s.filters.type === "string" ? s.filters.type : "",
      }
      window.localStorage.setItem("beads-ui.filters", JSON.stringify(data))
    })
    // Persist board preferences
    store.subscribe(s => {
      window.localStorage.setItem(
        "beads-ui.board",
        JSON.stringify({ closed_filter: s.board.closed_filter }),
      )
    })

    // Expose activity debug info globally for diagnostics
    // @ts-expect-error - Debug global
    window.__bdui_debug = {
      getPendingSubscriptions: () => Array.from(pending_subscriptions),
      getActivityCount: () => activity.getCount(),
      getActiveRequests: () => activity.getActiveRequests(),
    }

    /**
     * Manage route visibility and list subscriptions per view.
     *
     * React components handle the actual view rendering; this just manages
     * the DOM section visibility and ensures subscriptions are active.
     *
     * @param s - Current app state.
     */
    const onRouteChange = (s: {
      selected_id: string | null
      view: ViewName
      filters: { status?: string }
    }): void => {
      if (issues_root && epics_root && board_root && detail_mount) {
        // Underlying route visibility is controlled only by selected view
        issues_root.hidden = s.view !== "issues"
        epics_root.hidden = s.view !== "epics"
        board_root.hidden = s.view !== "board"
        // detail_mount visibility is controlled by React IssueDialog component
      }
      // Ensure subscriptions for the active tab before loading the view to
      // avoid empty initial renders due to racing list-delta.
      ensureTabSubscriptions(s)
      window.localStorage.setItem("beads-ui.view", s.view)
    }
    store.subscribe(onRouteChange)
    // Ensure initial state is reflected (fixes reload on #/epics)
    onRouteChange(store.getState())

    // Note: Keyboard shortcuts for new issue dialog are handled by React in App.tsx
  }
}

/**
 * Initialize the theme toggle.
 *
 * Sets the initial theme from saved preference or OS preference,
 * and wires up the theme switch in the header.
 */
export function initTheme(): void {
  // Initialize theme from saved preference or OS preference
  try {
    const saved = window.localStorage.getItem("beads-ui.theme")
    const prefers_dark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    const initial =
      saved === "dark" || saved === "light" ? saved
      : prefers_dark ? "dark"
      : "light"
    document.documentElement.setAttribute("data-theme", initial)
    const sw = document.getElementById("theme-switch") as HTMLInputElement | null
    if (sw) {
      sw.checked = initial === "dark"
    }
  } catch {
    // ignore theme init errors
  }

  // Wire up theme switch in header
  const theme_switch = document.getElementById("theme-switch") as HTMLInputElement | null
  if (theme_switch) {
    theme_switch.addEventListener("change", () => {
      const mode = theme_switch.checked ? "dark" : "light"
      document.documentElement.setAttribute("data-theme", mode)
      window.localStorage.setItem("beads-ui.theme", mode)
    })
  }
}

/**
 * Initialize the application.
 *
 * Bootstraps the app shell and the React root.
 */
function init(): void {
  // Initialize theme toggle
  initTheme()

  // Bootstrap the app shell
  const appRoot = document.getElementById("app")
  if (appRoot) {
    bootstrap(appRoot)
  }

  // Bootstrap the React root
  const reactRoot = document.getElementById("react-root")
  if (reactRoot) {
    createRoot(reactRoot).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    )
  }
}

// Run on DOMContentLoaded
if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", init)
}
