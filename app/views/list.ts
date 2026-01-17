import { html, render, TemplateResult } from "lit-html"
import type { ViewName } from "../router.js"
import type { AppState, StatePatch } from "../state.js"
import { createListSelectors, ListSelectors, IssueStores } from "../data/list-selectors.js"
import { cmpClosedDesc } from "../data/sort.js"
import { ISSUE_TYPES, typeLabel } from "../utils/issue-type.js"
import { issueHashFor } from "../utils/issue-url.js"
import { debug } from "../utils/logging.js"
import { statusLabel } from "../utils/status.js"
import { createIssueRowRenderer } from "./issue-row.js"

// List view implementation; requires a transport send function.

/**
 * Issue type for list view.
 */
interface Issue {
  id: string
  title?: string
  status?: "closed" | "open" | "in_progress"
  priority?: number
  issue_type?: string
  assignee?: string
  labels?: string[]
}

/**
 * RPC transport function type.
 */
type SendFn = (type: string, payload?: unknown) => Promise<unknown>

/**
 * Navigation function type.
 */
type NavigateFn = (hash: string) => void

/**
 * Default navigation function using window.location.hash.
 */
function defaultNavigateFn(hash: string): void {
  window.location.hash = hash
}

/**
 * App state store interface for list view.
 */
interface ListStore {
  getState: () => AppState
  setState: (patch: StatePatch) => void
  subscribe: (fn: (s: AppState) => void) => () => void
}

/**
 * Subscriptions interface (unused but kept for API compatibility).
 */
interface Subscriptions {
  selectors: {
    getIds: (client_id: string) => string[]
  }
}

/**
 * View API returned by createListView.
 */
export interface ListViewAPI {
  load: () => Promise<void>
  destroy: () => void
}

/**
 * Create the Issues List view.
 *
 * @param mount_element - Element to render into.
 * @param sendFn - RPC transport.
 * @param navigateFn - Navigation function (defaults to setting location.hash).
 * @param store - Optional state store.
 * @param _subscriptions - Unused subscriptions interface.
 * @param issue_stores - Optional issue stores for live updates.
 * @returns View API.
 */
export function createListView(
  mount_element: HTMLElement,
  sendFn: SendFn,
  navigateFn: NavigateFn = defaultNavigateFn,
  store?: ListStore,
  _subscriptions?: Subscriptions,
  issue_stores?: IssueStores,
): ListViewAPI {
  const log = debug("views:list")
  // Touch unused param to satisfy lint rules without impacting behavior
  void _subscriptions
  let status_filters: string[] = []
  let search_text = ""
  let issues_cache: Issue[] = []
  let type_filters: string[] = []
  let selected_id: string | null = store ? store.getState().selected_id : null
  let unsubscribe: (() => void) | null = null
  let status_dropdown_open = false
  let type_dropdown_open = false

  /**
   * Normalize legacy string filter to array format.
   */
  function normalizeStatusFilter(val: string | string[] | undefined): string[] {
    if (Array.isArray(val)) return val
    if (typeof val === "string" && val !== "" && val !== "all") return [val]
    return []
  }

  /**
   * Normalize legacy string filter to array format.
   */
  function normalizeTypeFilter(val: string | string[] | undefined): string[] {
    if (Array.isArray(val)) return val
    if (typeof val === "string" && val !== "") return [val]
    return []
  }

  // Shared row renderer (used in template below)
  const row_renderer = createIssueRowRenderer({
    navigate: (id: string) => {
      const nav = navigateFn || defaultNavigateFn
      const view: ViewName = store ? store.getState().view : "issues"
      nav(issueHashFor(view, id))
    },
    onUpdate: updateInline,
    requestRender: doRender,
    getSelectedId: () => selected_id,
    row_class: "issue-row",
  })

  /**
   * Toggle a status filter chip.
   * Note: status_filters is an array for multi-select UI, but the store may use string.
   */
  const toggleStatusFilter = async (status: string): Promise<void> => {
    if (status_filters.includes(status)) {
      status_filters = status_filters.filter(s => s !== status)
    } else {
      status_filters = [...status_filters, status]
    }
    log("status toggle %s -> %o", status, status_filters)
    if (store) {
      // Use type assertion for array-based multi-select that extends store's single-value type
      store.setState({
        filters: { status: status_filters as unknown as AppState["filters"]["status"] },
      })
    }
    await load()
  }

  /**
   * Event: search input.
   */
  const onSearchInput = (ev: Event): void => {
    const input = ev.currentTarget as HTMLInputElement
    search_text = input.value
    log("search input %s", search_text)
    if (store) {
      store.setState({ filters: { search: search_text } })
    }
    doRender()
  }

  /**
   * Toggle a type filter chip.
   * Note: type_filters is an array for multi-select UI, but the store may use string.
   */
  const toggleTypeFilter = (type: string): void => {
    if (type_filters.includes(type)) {
      type_filters = type_filters.filter(t => t !== type)
    } else {
      type_filters = [...type_filters, type]
    }
    log("type toggle %s -> %o", type, type_filters)
    if (store) {
      // Use type assertion for array-based multi-select that extends store's single-value type
      store.setState({ filters: { type: type_filters as unknown as AppState["filters"]["type"] } })
    }
    doRender()
  }

  /**
   * Toggle status dropdown open/closed.
   */
  const toggleStatusDropdown = (e: Event): void => {
    e.stopPropagation()
    status_dropdown_open = !status_dropdown_open
    type_dropdown_open = false
    doRender()
  }

  /**
   * Toggle type dropdown open/closed.
   */
  const toggleTypeDropdown = (e: Event): void => {
    e.stopPropagation()
    type_dropdown_open = !type_dropdown_open
    status_dropdown_open = false
    doRender()
  }

  /**
   * Get display text for dropdown trigger.
   */
  function getDropdownDisplayText(
    selected: string[],
    label: string,
    formatter: (val: string) => string,
  ): string {
    if (selected.length === 0) return `${label}: Any`
    const first = selected[0]
    if (selected.length === 1 && first !== undefined) return `${label}: ${formatter(first)}`
    return `${label} (${selected.length})`
  }

  // Initialize filters from store on first render so reload applies persisted state
  if (store) {
    const s = store.getState()
    if (s && s.filters && typeof s.filters === "object") {
      status_filters = normalizeStatusFilter(s.filters.status)
      search_text = s.filters.search || ""
      type_filters = normalizeTypeFilter(s.filters.type)
    }
  }
  // Initial values are reflected via bound `.value` in the template
  // Compose helpers: centralize membership + entity selection + sorting
  const selectors: ListSelectors | null = issue_stores ? createListSelectors(issue_stores) : null

  /**
   * Build lit-html template for the list view.
   */
  function template(): TemplateResult {
    let filtered = issues_cache
    if (status_filters.length > 0 && !status_filters.includes("ready")) {
      filtered = filtered.filter(it => status_filters.includes(String(it.status || "")))
    }
    if (search_text) {
      const needle = search_text.toLowerCase()
      filtered = filtered.filter(it => {
        const a = String(it.id).toLowerCase()
        const b = String(it.title || "").toLowerCase()
        return a.includes(needle) || b.includes(needle)
      })
    }
    if (type_filters.length > 0) {
      filtered = filtered.filter(it => type_filters.includes(String(it.issue_type || "")))
    }
    // Sorting: closed list is a special case → sort by closed_at desc only
    if (status_filters.length === 1 && status_filters[0] === "closed") {
      filtered = filtered.slice().sort(cmpClosedDesc)
    }

    return html`
      <div class="panel__header">
        <div class="filter-dropdown ${status_dropdown_open ? "is-open" : ""}">
          <button class="filter-dropdown__trigger" @click=${toggleStatusDropdown}>
            ${getDropdownDisplayText(status_filters, "Status", statusLabel)}
            <span class="filter-dropdown__arrow">▾</span>
          </button>
          <div class="filter-dropdown__menu">
            ${["ready", "open", "in_progress", "closed"].map(
              s => html`
                <label class="filter-dropdown__option">
                  <input
                    type="checkbox"
                    .checked=${status_filters.includes(s)}
                    @change=${() => toggleStatusFilter(s)}
                  />
                  ${s === "ready" ? "Ready" : statusLabel(s)}
                </label>
              `,
            )}
          </div>
        </div>
        <div class="filter-dropdown ${type_dropdown_open ? "is-open" : ""}">
          <button class="filter-dropdown__trigger" @click=${toggleTypeDropdown}>
            ${getDropdownDisplayText(type_filters, "Types", typeLabel)}
            <span class="filter-dropdown__arrow">▾</span>
          </button>
          <div class="filter-dropdown__menu">
            ${ISSUE_TYPES.map(
              t => html`
                <label class="filter-dropdown__option">
                  <input
                    type="checkbox"
                    .checked=${type_filters.includes(t)}
                    @change=${() => toggleTypeFilter(t)}
                  />
                  ${typeLabel(t)}
                </label>
              `,
            )}
          </div>
        </div>
        <input type="search" placeholder="Search…" @input=${onSearchInput} .value=${search_text} />
      </div>
      <div class="panel__body" id="list-root">
        ${filtered.length === 0 ?
          html`<div class="issues-block">
            <div class="muted" style="padding:10px 12px;">No issues</div>
          </div>`
        : html`<div class="issues-block">
            <table
              class="table"
              role="grid"
              aria-rowcount=${String(filtered.length)}
              aria-colcount="6"
            >
              <colgroup>
                <col style="width: 100px" />
                <col style="width: 120px" />
                <col />
                <col style="width: 120px" />
                <col style="width: 160px" />
                <col style="width: 130px" />
                <col style="width: 80px" />
              </colgroup>
              <thead>
                <tr role="row">
                  <th role="columnheader">ID</th>
                  <th role="columnheader">Type</th>
                  <th role="columnheader">Title</th>
                  <th role="columnheader">Status</th>
                  <th role="columnheader">Assignee</th>
                  <th role="columnheader">Priority</th>
                  <th role="columnheader">Deps</th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                ${filtered.map(it => row_renderer(it))}
              </tbody>
            </table>
          </div>`}
      </div>
    `
  }

  /**
   * Render the current issues_cache with filters applied.
   */
  function doRender(): void {
    render(template(), mount_element)
  }

  // Initial render (header + body shell with current state)
  doRender()
  // no separate ready checkbox when using select option

  /**
   * Update minimal fields inline via ws mutations and refresh that row's data.
   */
  async function updateInline(
    id: string,
    patch: { title?: string; assignee?: string; status?: string; priority?: number },
  ): Promise<void> {
    try {
      log("updateInline %s %o", id, Object.keys(patch))
      // Dispatch specific mutations based on provided keys
      if (typeof patch.title === "string") {
        await sendFn("edit-text", { id, field: "title", value: patch.title })
      }
      if (typeof patch.assignee === "string") {
        await sendFn("update-assignee", { id, assignee: patch.assignee })
      }
      if (typeof patch.status === "string") {
        await sendFn("update-status", { id, status: patch.status })
      }
      if (typeof patch.priority === "number") {
        await sendFn("update-priority", { id, priority: patch.priority })
      }
    } catch {
      // ignore failures; UI state remains as-is
    }
  }

  /**
   * Load issues from local push stores and re-render.
   */
  async function load(): Promise<void> {
    log("load")
    // Preserve scroll position to avoid jarring jumps on live refresh
    const beforeEl = mount_element.querySelector("#list-root") as HTMLElement | null
    const prevScroll = beforeEl ? beforeEl.scrollTop : 0
    // Compose items from subscriptions membership and issues store entities
    try {
      if (selectors) {
        issues_cache = selectors.selectIssuesFor("tab:issues") as Issue[]
      } else {
        issues_cache = []
      }
    } catch (err) {
      log("load failed: %o", err)
      issues_cache = []
    }
    doRender()
    // Restore scroll position if possible
    try {
      const afterEl = mount_element.querySelector("#list-root") as HTMLElement | null
      if (afterEl && prevScroll > 0) {
        afterEl.scrollTop = prevScroll
      }
    } catch {
      // ignore
    }
  }

  // Keyboard navigation
  mount_element.tabIndex = 0
  mount_element.addEventListener("keydown", (ev: KeyboardEvent) => {
    // Grid cell Up/Down navigation when focus is inside the table and not within
    // an editable control (input/textarea/select). Preserves column position.
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      const tgt = ev.target as HTMLElement
      const table =
        tgt && typeof tgt.closest === "function" ? tgt.closest("#list-root table.table") : null
      if (table) {
        // Do not intercept when inside native editable controls
        const in_editable = Boolean(
          tgt &&
          typeof tgt.closest === "function" &&
          (tgt.closest("input") || tgt.closest("textarea") || tgt.closest("select")),
        )
        if (!in_editable) {
          const cell = tgt && typeof tgt.closest === "function" ? tgt.closest("td") : null
          if (cell && cell.parentElement) {
            const row = cell.parentElement as HTMLTableRowElement
            const tbody = row.parentElement as HTMLTableSectionElement | null
            if (tbody && tbody.querySelectorAll) {
              const rows = Array.from(tbody.querySelectorAll("tr"))
              const row_idx = Math.max(0, rows.indexOf(row))
              const col_idx = cell.cellIndex || 0
              const next_idx =
                ev.key === "ArrowDown" ?
                  Math.min(row_idx + 1, rows.length - 1)
                : Math.max(row_idx - 1, 0)
              const next_row = rows[next_idx]
              const next_cell = next_row && next_row.cells ? next_row.cells[col_idx] : null
              if (next_cell) {
                const focusable = next_cell.querySelector(
                  'button:not([disabled]), [tabindex]:not([tabindex="-1"]), a[href], select:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled])',
                ) as HTMLElement | null
                if (focusable && typeof focusable.focus === "function") {
                  ev.preventDefault()
                  focusable.focus()
                  return
                }
              }
            }
          }
        }
      }
    }

    const tbody = mount_element.querySelector("#list-root tbody") as HTMLTableSectionElement | null
    const items = tbody ? tbody.querySelectorAll("tr") : []
    if (items.length === 0) {
      return
    }
    let idx = 0
    if (selected_id) {
      const arr = Array.from(items)
      idx = arr.findIndex(el => {
        const did = el.getAttribute("data-issue-id") || ""
        return did === selected_id
      })
      if (idx < 0) {
        idx = 0
      }
    }
    if (ev.key === "ArrowDown") {
      ev.preventDefault()
      const next = items[Math.min(idx + 1, items.length - 1)]
      const next_id = next ? next.getAttribute("data-issue-id") : ""
      const set = next_id ? next_id : null
      if (store && set) {
        store.setState({ selected_id: set })
      }
      selected_id = set
      doRender()
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault()
      const prev = items[Math.max(idx - 1, 0)]
      const prev_id = prev ? prev.getAttribute("data-issue-id") : ""
      const set = prev_id ? prev_id : null
      if (store && set) {
        store.setState({ selected_id: set })
      }
      selected_id = set
      doRender()
    } else if (ev.key === "Enter") {
      ev.preventDefault()
      const current = items[idx]
      const id = current ? current.getAttribute("data-issue-id") : ""
      if (id) {
        const nav = navigateFn || defaultNavigateFn
        const view: ViewName = store ? store.getState().view : "issues"
        nav(issueHashFor(view, id))
      }
    }
  })

  // Click outside to close dropdowns
  const clickOutsideHandler = (e: MouseEvent): void => {
    const target = e.target as HTMLElement | null
    if (target && !target.closest(".filter-dropdown")) {
      if (status_dropdown_open || type_dropdown_open) {
        status_dropdown_open = false
        type_dropdown_open = false
        doRender()
      }
    }
  }
  document.addEventListener("click", clickOutsideHandler)

  // Keep selection in sync with store
  if (store) {
    unsubscribe = store.subscribe(s => {
      if (s.selected_id !== selected_id) {
        selected_id = s.selected_id
        log("selected %s", selected_id || "(none)")
        doRender()
      }
      if (s.filters && typeof s.filters === "object") {
        const next_status = normalizeStatusFilter(s.filters.status)
        const next_search = s.filters.search || ""
        let needs_render = false
        const status_changed = JSON.stringify(next_status) !== JSON.stringify(status_filters)
        if (status_changed) {
          status_filters = next_status
          // Reload on any status scope change to keep cache correct
          void load()
          return
        }
        if (next_search !== search_text) {
          search_text = next_search
          needs_render = true
        }
        const next_type_arr = normalizeTypeFilter(s.filters.type)
        const type_changed = JSON.stringify(next_type_arr) !== JSON.stringify(type_filters)
        if (type_changed) {
          type_filters = next_type_arr
          needs_render = true
        }
        if (needs_render) {
          doRender()
        }
      }
    })
  }

  // Live updates: recompose and re-render when issue stores change
  if (selectors) {
    selectors.subscribe(() => {
      try {
        issues_cache = selectors.selectIssuesFor("tab:issues") as Issue[]
        doRender()
      } catch {
        // ignore
      }
    })
  }

  return {
    load,
    destroy(): void {
      mount_element.replaceChildren()
      document.removeEventListener("click", clickOutsideHandler)
      if (unsubscribe) {
        unsubscribe()
        unsubscribe = null
      }
    },
  }
}
