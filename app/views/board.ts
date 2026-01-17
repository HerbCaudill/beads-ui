import { html, render, TemplateResult } from "lit-html"
import { createListSelectors, IssueStores, ListSelectors } from "../data/list-selectors.js"
import { cmpClosedDesc, cmpPriorityThenCreated } from "../data/sort.js"
import type { Store, ClosedFilter } from "../state.js"
import { createIssueIdRenderer } from "../utils/issue-id-renderer.js"
import { debug } from "../utils/logging.js"
import { createPriorityBadge } from "../utils/priority-badge.js"
import { showToast } from "../utils/toast.js"
import { createTypeBadge } from "../utils/type-badge.js"
import type { IssueLite } from "../../types/issues.js"

/**
 * Map column IDs to their corresponding status values.
 */
const COLUMN_STATUS_MAP: Record<string, "open" | "in_progress" | "closed"> = {
  "blocked-col": "open",
  "ready-col": "open",
  "in-progress-col": "in_progress",
  "closed-col": "closed",
}

/**
 * Subscriptions interface for querying issue IDs.
 */
interface Subscriptions {
  selectors: {
    getIds: (client_id: string) => string[]
    count?: (client_id: string) => number
  }
}

/**
 * Legacy data interface for fallback fetch.
 */
interface LegacyData {
  getReady: () => Promise<IssueLite[]>
  getBlocked: () => Promise<IssueLite[]>
  getInProgress: () => Promise<IssueLite[]>
  getClosed: () => Promise<IssueLite[]>
}

/**
 * Transport function type for sending updates.
 */
type TransportFn = (type: string, payload: unknown) => Promise<unknown>

/**
 * View API returned by createBoardView.
 */
export interface BoardViewAPI {
  load: () => Promise<void>
  clear: () => void
}

/**
 * Create the Board view with Blocked, Ready, In progress, Closed.
 * Push-only: derives items from per-subscription stores.
 *
 * Sorting rules:
 * - Ready/Blocked/In progress: priority asc, then created_at asc.
 * - Closed: closed_at desc.
 *
 * @param mount_element - Element to render into.
 * @param _data - Unused (legacy param retained for call-compat).
 * @param gotoIssue - Navigate to issue detail.
 * @param store - Optional store for persisting board state.
 * @param subscriptions - Optional subscriptions for querying issue IDs.
 * @param issueStores - Optional issue stores for snapshots.
 * @param transport - Optional transport function for sending updates.
 * @returns View API.
 */
export function createBoardView(
  mount_element: HTMLElement,
  _data: unknown,
  gotoIssue: (id: string) => void,
  store?: Store,
  subscriptions?: Subscriptions,
  issueStores?: IssueStores,
  transport?: TransportFn,
): BoardViewAPI {
  const log = debug("views:board")
  let list_ready: IssueLite[] = []
  let list_blocked: IssueLite[] = []
  let list_in_progress: IssueLite[] = []
  let list_closed: IssueLite[] = []
  let list_closed_raw: IssueLite[] = []
  // Centralized selection helpers
  const selectors: ListSelectors | null = issueStores ? createListSelectors(issueStores) : null

  /**
   * Closed column filter mode.
   */
  let closed_filter_mode: ClosedFilter = "today"
  if (store) {
    try {
      const s = store.getState()
      const cf = s && s.board ? String(s.board.closed_filter || "today") : "today"
      if (cf === "today" || cf === "3" || cf === "7") {
        closed_filter_mode = cf as ClosedFilter
      }
    } catch {
      // ignore store init errors
    }
  }

  function template(): TemplateResult {
    return html`
      <div class="panel__body board-root">
        ${columnTemplate("Blocked", "blocked-col", list_blocked)}
        ${columnTemplate("Ready", "ready-col", list_ready)}
        ${columnTemplate("In Progress", "in-progress-col", list_in_progress)}
        ${columnTemplate("Closed", "closed-col", list_closed)}
      </div>
    `
  }

  function columnTemplate(title: string, id: string, items: IssueLite[]): TemplateResult {
    const item_count = Array.isArray(items) ? items.length : 0
    const count_label = item_count === 1 ? "1 issue" : `${item_count} issues`
    return html`
      <section class="board-column" id=${id}>
        <header class="board-column__header" id=${id + "-header"} role="heading" aria-level="2">
          <div class="board-column__title">
            <span class="board-column__title-text">${title}</span>
            <span class="badge board-column__count" aria-label=${count_label}> ${item_count} </span>
          </div>
          ${id === "closed-col" ?
            html`<label class="board-closed-filter">
              <span class="visually-hidden">Filter closed issues</span>
              <select
                id="closed-filter"
                aria-label="Filter closed issues"
                @change=${onClosedFilterChange}
              >
                <option value="today" ?selected=${closed_filter_mode === "today"}>Today</option>
                <option value="3" ?selected=${closed_filter_mode === "3"}>Last 3 days</option>
                <option value="7" ?selected=${closed_filter_mode === "7"}>Last 7 days</option>
              </select>
            </label>`
          : ""}
        </header>
        <div class="board-column__body" role="list" aria-labelledby=${id + "-header"}>
          ${items.map(it => cardTemplate(it))}
        </div>
      </section>
    `
  }

  function cardTemplate(it: IssueLite): TemplateResult {
    return html`
      <article
        class="board-card"
        data-issue-id=${it.id}
        role="listitem"
        tabindex="-1"
        draggable="true"
        @click=${(ev: MouseEvent) => onCardClick(ev, it.id)}
        @dragstart=${(ev: DragEvent) => onDragStart(ev, it.id)}
        @dragend=${onDragEnd}
      >
        <div class="board-card__title text-truncate">${it.title || "(no title)"}</div>
        <div class="board-card__meta">
          ${createTypeBadge(it.issue_type)} ${createPriorityBadge(it.priority)}
          ${createIssueIdRenderer(it.id, { class_name: "mono" })}
        </div>
      </article>
    `
  }

  let dragging_id: string | null = null

  /**
   * Handle card click, ignoring clicks during drag operations.
   */
  function onCardClick(ev: MouseEvent, id: string): void {
    // Only navigate if this wasn't a drag operation
    if (!dragging_id) {
      gotoIssue(id)
    }
  }

  /**
   * Handle drag start: store issue id in dataTransfer and add dragging class.
   */
  function onDragStart(ev: DragEvent, id: string): void {
    dragging_id = id
    if (ev.dataTransfer) {
      ev.dataTransfer.setData("text/plain", id)
      ev.dataTransfer.effectAllowed = "move"
    }
    const target = ev.target as HTMLElement
    target.classList.add("board-card--dragging")
    log("dragstart %s", id)
  }

  /**
   * Handle drag end: remove dragging class.
   */
  function onDragEnd(ev: DragEvent): void {
    const target = ev.target as HTMLElement
    target.classList.remove("board-card--dragging")
    // Clear any highlighted drop target
    clearDropTarget()
    // Clear dragging_id after a short delay to allow click event to check it
    setTimeout(() => {
      dragging_id = null
    }, 0)
    log("dragend")
  }

  /**
   * Clear the currently highlighted drop target column.
   */
  function clearDropTarget(): void {
    const all_cols: HTMLElement[] = Array.from(
      mount_element.querySelectorAll(".board-column--drag-over"),
    )
    for (const c of all_cols) {
      c.classList.remove("board-column--drag-over")
    }
  }

  /**
   * Update issue status via WebSocket transport.
   */
  async function updateIssueStatus(
    issue_id: string,
    new_status: "open" | "in_progress" | "closed",
  ): Promise<void> {
    if (!transport) {
      log("no transport available, status update skipped")
      showToast("Cannot update status: not connected", "error")
      return
    }
    try {
      log("update-status %s → %s", issue_id, new_status)
      await transport("update-status", { id: issue_id, status: new_status })
      showToast("Status updated", "success", 1500)
    } catch (err) {
      log("update-status failed: %o", err)
      showToast("Failed to update status", "error")
    }
  }

  function doRender(): void {
    render(template(), mount_element)
    postRenderEnhance()
  }

  /**
   * Enhance rendered board with a11y and keyboard navigation.
   * - Roving tabindex per column (first card tabbable).
   * - ArrowUp/ArrowDown within column.
   * - ArrowLeft/ArrowRight to adjacent non-empty column (focus top card).
   * - Enter/Space to open details for focused card.
   */
  function postRenderEnhance(): void {
    try {
      const columns: HTMLElement[] = Array.from(mount_element.querySelectorAll(".board-column"))
      for (const col of columns) {
        const body = col.querySelector(".board-column__body") as HTMLElement | null
        if (!body) {
          continue
        }
        const cards: HTMLElement[] = Array.from(body.querySelectorAll(".board-card"))
        // Assign aria-label using column header for screen readers
        const header = col.querySelector(".board-column__header") as HTMLElement | null
        const col_name = header ? header.textContent?.trim() || "" : ""
        for (const card of cards) {
          const title_el = card.querySelector(".board-card__title") as HTMLElement | null
          const t = title_el ? title_el.textContent?.trim() || "" : ""
          card.setAttribute("aria-label", `Issue ${t || "(no title)"} — Column ${col_name}`)
          // Default roving setup
          card.tabIndex = -1
        }
        const first_card = cards[0]
        if (first_card) {
          first_card.tabIndex = 0
        }
      }
    } catch {
      // non-fatal
    }
  }

  // Delegate keyboard handling from mount_element
  mount_element.addEventListener("keydown", ev => {
    const target = ev.target
    if (!target || !(target instanceof HTMLElement)) {
      return
    }
    // Do not intercept keys inside editable controls
    const tag = String(target.tagName || "").toLowerCase()
    if (
      tag === "input" ||
      tag === "textarea" ||
      tag === "select" ||
      target.isContentEditable === true
    ) {
      return
    }
    const card = target.closest(".board-card")
    if (!card) {
      return
    }
    const key = String(ev.key || "")
    if (key === "Enter" || key === " ") {
      ev.preventDefault()
      const id = card.getAttribute("data-issue-id")
      if (id) {
        gotoIssue(id)
      }
      return
    }
    if (key !== "ArrowUp" && key !== "ArrowDown" && key !== "ArrowLeft" && key !== "ArrowRight") {
      return
    }
    ev.preventDefault()
    // Column context
    const col = card.closest(".board-column") as HTMLElement | null
    if (!col) {
      return
    }
    const body = col.querySelector(".board-column__body")
    if (!body) {
      return
    }
    const cards: HTMLElement[] = Array.from(body.querySelectorAll(".board-card"))
    const idx = cards.indexOf(card as HTMLElement)
    if (idx === -1) {
      return
    }
    if (key === "ArrowDown" && idx < cards.length - 1) {
      const current_card = cards[idx]
      const next_card = cards[idx + 1]
      if (current_card && next_card) {
        moveFocus(current_card, next_card)
      }
      return
    }
    if (key === "ArrowUp" && idx > 0) {
      const current_card = cards[idx]
      const prev_card = cards[idx - 1]
      if (current_card && prev_card) {
        moveFocus(current_card, prev_card)
      }
      return
    }
    if (key === "ArrowRight" || key === "ArrowLeft") {
      // Find adjacent column with at least one card
      const cols: HTMLElement[] = Array.from(mount_element.querySelectorAll(".board-column"))
      const col_idx = cols.indexOf(col)
      if (col_idx === -1) {
        return
      }
      const dir = key === "ArrowRight" ? 1 : -1
      let next_idx = col_idx + dir
      let target_col: HTMLElement | null = null
      while (next_idx >= 0 && next_idx < cols.length) {
        const candidate = cols[next_idx]
        if (candidate) {
          const c_body = candidate.querySelector(".board-column__body") as HTMLElement | null
          const c_cards = c_body ? Array.from(c_body.querySelectorAll(".board-card")) : []
          if (c_cards.length > 0) {
            target_col = candidate
            break
          }
        }
        next_idx += dir
      }
      if (target_col) {
        const first = target_col.querySelector(
          ".board-column__body .board-card",
        ) as HTMLElement | null
        if (first) {
          moveFocus(card as HTMLElement, first)
        }
      }
      return
    }
  })

  // Track the currently highlighted column to avoid flicker
  let current_drop_target: HTMLElement | null = null

  // Delegate drag and drop handling for columns
  mount_element.addEventListener("dragover", ev => {
    ev.preventDefault()
    if (ev.dataTransfer) {
      ev.dataTransfer.dropEffect = "move"
    }
    // Find the column being dragged over
    const target = ev.target as HTMLElement
    const col = target.closest(".board-column") as HTMLElement | null

    // Only update if we've entered a different column
    if (col && col !== current_drop_target) {
      // Remove highlight from previous column
      if (current_drop_target) {
        current_drop_target.classList.remove("board-column--drag-over")
      }
      // Highlight the new column
      col.classList.add("board-column--drag-over")
      current_drop_target = col
    }
  })

  mount_element.addEventListener("dragleave", ev => {
    const related = ev.relatedTarget as HTMLElement | null
    // Only clear if we're leaving the mount element entirely
    if (!related || !mount_element.contains(related)) {
      if (current_drop_target) {
        current_drop_target.classList.remove("board-column--drag-over")
        current_drop_target = null
      }
    }
  })

  mount_element.addEventListener("drop", ev => {
    ev.preventDefault()
    // Clear the drop target highlight
    if (current_drop_target) {
      current_drop_target.classList.remove("board-column--drag-over")
      current_drop_target = null
    }

    const target = ev.target as HTMLElement
    const col = target.closest(".board-column")
    if (!col) {
      return
    }

    const col_id = col.id
    const new_status = COLUMN_STATUS_MAP[col_id]
    if (!new_status) {
      log("drop on unknown column: %s", col_id)
      return
    }

    const issue_id = ev.dataTransfer?.getData("text/plain")
    if (!issue_id) {
      log("drop without issue id")
      return
    }

    log("drop %s on %s → %s", issue_id, col_id, new_status)
    void updateIssueStatus(issue_id, new_status)
  })

  function moveFocus(from: HTMLElement, to: HTMLElement): void {
    try {
      from.tabIndex = -1
      to.tabIndex = 0
      to.focus()
    } catch {
      // ignore focus errors
    }
  }

  // Sort helpers centralized in app/data/sort.js

  /**
   * Recompute closed list from raw using the current filter and sort.
   */
  function applyClosedFilter(): void {
    log("applyClosedFilter %s", closed_filter_mode)
    let items: IssueLite[] = Array.isArray(list_closed_raw) ? [...list_closed_raw] : []
    const now = new Date()
    let since_ts = 0
    if (closed_filter_mode === "today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      since_ts = start.getTime()
    } else if (closed_filter_mode === "3") {
      since_ts = now.getTime() - 3 * 24 * 60 * 60 * 1000
    } else if (closed_filter_mode === "7") {
      since_ts = now.getTime() - 7 * 24 * 60 * 60 * 1000
    }
    items = items.filter(it => {
      const s = Number.isFinite(it.closed_at) ? (it.closed_at as number) : NaN
      if (!Number.isFinite(s)) {
        return false
      }
      return s >= since_ts
    })
    items.sort(cmpClosedDesc)
    list_closed = items
  }

  function onClosedFilterChange(ev: Event): void {
    try {
      const el = ev.target as HTMLSelectElement
      const v = String(el.value || "today")
      closed_filter_mode = v === "3" || v === "7" ? v : "today"
      log("closed filter %s", closed_filter_mode)
      if (store) {
        try {
          store.setState({ board: { closed_filter: closed_filter_mode } })
        } catch {
          // ignore store errors
        }
      }
      applyClosedFilter()
      doRender()
    } catch {
      // ignore
    }
  }

  /**
   * Compose lists from subscriptions + issues store and render.
   */
  function refreshFromStores(): void {
    try {
      if (selectors) {
        const in_progress = selectors.selectBoardColumn("tab:board:in-progress", "in_progress")
        const blocked = selectors.selectBoardColumn("tab:board:blocked", "blocked")
        const ready_raw = selectors.selectBoardColumn("tab:board:ready", "ready")
        const closed = selectors.selectBoardColumn("tab:board:closed", "closed")

        // Ready excludes items that are in progress
        const in_prog_ids: Set<string> = new Set(in_progress.map(i => i.id))
        const ready = ready_raw.filter(i => !in_prog_ids.has(i.id))

        list_ready = ready
        list_blocked = blocked
        list_in_progress = in_progress
        list_closed_raw = closed
      }
      applyClosedFilter()
      doRender()
    } catch {
      list_ready = []
      list_blocked = []
      list_in_progress = []
      list_closed = []
      doRender()
    }
  }

  // Live updates: recompose on issue store envelopes
  if (selectors) {
    selectors.subscribe(() => {
      try {
        refreshFromStores()
      } catch {
        // ignore
      }
    })
  }

  return {
    async load(): Promise<void> {
      // Compose lists from subscriptions + issues store
      log("load")
      refreshFromStores()
      // If nothing is present yet (e.g., immediately after switching back
      // to the Board and before list-delta arrives), fetch via data layer as
      // a fallback so the board is not empty on initial display.
      try {
        const has_subs = Boolean(subscriptions && subscriptions.selectors)
        const cnt = (id: string): number => {
          if (!has_subs || !subscriptions) {
            return 0
          }
          const sel = subscriptions.selectors
          if (typeof sel.count === "function") {
            return Number(sel.count(id) || 0)
          }
          try {
            const arr = sel.getIds(id)
            return Array.isArray(arr) ? arr.length : 0
          } catch {
            return 0
          }
        }
        const total_items =
          cnt("tab:board:ready") +
          cnt("tab:board:blocked") +
          cnt("tab:board:in-progress") +
          cnt("tab:board:closed")
        const data = _data as LegacyData | null
        const can_fetch =
          data &&
          typeof data.getReady === "function" &&
          typeof data.getBlocked === "function" &&
          typeof data.getInProgress === "function" &&
          typeof data.getClosed === "function"
        if (total_items === 0 && can_fetch) {
          log("fallback fetch")
          const [ready_raw, blocked_raw, in_prog_raw, closed_raw]: [
            IssueLite[],
            IssueLite[],
            IssueLite[],
            IssueLite[],
          ] = await Promise.all([
            data!.getReady().catch(() => []),
            data!.getBlocked().catch(() => []),
            data!.getInProgress().catch(() => []),
            data!.getClosed().catch(() => []),
          ])
          // Normalize and map unknowns to IssueLite shape
          let ready: IssueLite[] = Array.isArray(ready_raw) ? ready_raw.map(it => it) : []
          const blocked: IssueLite[] = Array.isArray(blocked_raw) ? blocked_raw.map(it => it) : []
          const in_prog: IssueLite[] = Array.isArray(in_prog_raw) ? in_prog_raw.map(it => it) : []
          const closed: IssueLite[] = Array.isArray(closed_raw) ? closed_raw.map(it => it) : []

          // Remove items from Ready that are already In Progress
          const in_progress_ids: Set<string> = new Set(in_prog.map(i => i.id))
          ready = ready.filter(i => !in_progress_ids.has(i.id))

          // Sort as per column rules
          ready.sort(cmpPriorityThenCreated)
          blocked.sort(cmpPriorityThenCreated)
          in_prog.sort(cmpPriorityThenCreated)
          list_ready = ready
          list_blocked = blocked
          list_in_progress = in_prog
          list_closed_raw = closed
          applyClosedFilter()
          doRender()
        }
      } catch {
        // ignore fallback errors
      }
    },
    clear(): void {
      mount_element.replaceChildren()
      list_ready = []
      list_blocked = []
      list_in_progress = []
      list_closed = []
    },
  }
}
