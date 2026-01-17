import { html, render, TemplateResult } from "lit-html"
import { createListSelectors, IssueStores, ListSelectors } from "../data/list-selectors.js"
import { createIssueIdRenderer } from "../utils/issue-id-renderer.js"
import { createIssueRowRenderer, IssueUpdatePatch } from "./issue-row.js"
import type { IssueLite } from "../../types/issues.js"

/**
 * Issue row data for rendering in the epics view.
 * Matches the IssueRowData typedef in issue-row.js.
 */
interface IssueRowData {
  id: string
  title?: string
  status?: string
  priority?: number
  issue_type?: string
  assignee?: string
  dependency_count?: number
  dependent_count?: number
}

/**
 * Epic entity with total/closed children counters and dependents.
 */
interface EpicEntity extends IssueLite {
  dependents?: IssueLite[]
  total_children?: number
  closed_children?: number
}

/**
 * Group of epic data for rendering.
 */
interface EpicGroup {
  epic: EpicEntity
  total_children: number
  closed_children: number
}

/**
 * Data interface for updating issues.
 */
interface EpicsData {
  updateIssue: (input: { id: string; [key: string]: unknown }) => Promise<unknown>
}

/**
 * Subscriptions interface for epics view.
 */
interface EpicsSubscriptions {
  subscribeList: (
    client_id: string,
    spec: { type: string; params?: Record<string, string | number | boolean> },
  ) => Promise<() => Promise<void>>
  selectors: {
    getIds: (client_id: string) => string[]
    count?: (client_id: string) => number
  }
}

/**
 * Extended issue stores interface with register/unregister methods.
 */
interface EpicsIssueStores extends IssueStores {
  register?: (client_id: string, spec: { type: string; params: Record<string, string> }) => void
  unregister?: (client_id: string) => void
}

/**
 * View API returned by createEpicsView.
 */
export interface EpicsViewAPI {
  load: () => Promise<void>
}

/**
 * Epics view (push-only):
 * - Derives epic groups from the local issues store (no RPC reads).
 * - Subscribes to `tab:epics` for top-level membership.
 * - On expand, subscribes to `detail:{id}` (issue-detail) for the epic.
 * - Renders children from the epic detail's `dependents` list.
 * - Provides inline edits via mutations; UI re-renders on push.
 *
 * @param mount_element - Element to render into.
 * @param data - Data interface for updating issues.
 * @param goto_issue - Navigate to issue detail.
 * @param subscriptions - Optional subscriptions interface.
 * @param issue_stores - Optional issue stores for snapshots.
 * @returns View API.
 */
export function createEpicsView(
  mount_element: HTMLElement,
  data: EpicsData,
  goto_issue: (id: string) => void,
  subscriptions?: EpicsSubscriptions,
  issue_stores?: EpicsIssueStores,
): EpicsViewAPI {
  let groups: EpicGroup[] = []
  const expanded: Set<string> = new Set()
  const loading: Set<string> = new Set()
  const epic_unsubs: Map<string, () => Promise<void>> = new Map()
  // Centralized selection helpers
  const selectors: ListSelectors | null = issue_stores ? createListSelectors(issue_stores) : null
  // Live re-render on pushes: recompute groups when stores change
  if (selectors) {
    selectors.subscribe(() => {
      const had_none = groups.length === 0
      groups = buildGroupsFromSnapshot()
      doRender()
      // Auto-expand first epic when transitioning from empty to non-empty
      if (had_none && groups.length > 0) {
        const first_group = groups[0]
        const first_id = first_group ? String(first_group.epic?.id || "") : ""
        if (first_id && !expanded.has(first_id)) {
          void toggle(first_id)
        }
      }
    })
  }

  // Shared row renderer used for children rows
  const renderRow = createIssueRowRenderer({
    navigate: id => goto_issue(id),
    onUpdate: updateInline,
    requestRender: doRender,
    getSelectedId: () => null,
    row_class: "epic-row",
  })

  function doRender(): void {
    render(template(), mount_element)
  }

  function template(): TemplateResult {
    if (!groups.length) {
      return html`<div class="panel__header muted">No epics found.</div>`
    }
    return html`${groups.map(g => groupTemplate(g))}`
  }

  function groupTemplate(g: EpicGroup): TemplateResult {
    const epic = g.epic || ({} as EpicEntity)
    const id = String(epic.id || "")
    const is_open = expanded.has(id)
    // Compose children via selectors
    const list: IssueRowData[] = selectors ? selectors.selectEpicChildren(id) : []
    const is_loading = loading.has(id)
    return html`
      <div class="epic-group" data-epic-id=${id}>
        <div
          class="epic-header"
          @click=${() => toggle(id)}
          role="button"
          tabindex="0"
          aria-expanded=${is_open}
        >
          ${createIssueIdRenderer(id, { class_name: "mono" })}
          <span class="text-truncate" style="margin-left:8px">${epic.title || "(no title)"}</span>
          <span
            class="epic-progress"
            style="margin-left:auto; display:flex; align-items:center; gap:8px;"
          >
            <progress
              value=${Number(g.closed_children || 0)}
              max=${Math.max(1, Number(g.total_children || 0))}
            ></progress>
            <span class="muted mono">${g.closed_children}/${g.total_children}</span>
          </span>
        </div>
        ${is_open ?
          html`<div class="epic-children">
            ${is_loading ? html`<div class="muted">Loading…</div>`
            : list.length === 0 ? html`<div class="muted">No issues found</div>`
            : html`<table class="table">
                <colgroup>
                  <col style="width: 100px" />
                  <col style="width: 120px" />
                  <col />
                  <col style="width: 120px" />
                  <col style="width: 160px" />
                  <col style="width: 130px" />
                </colgroup>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Type</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Assignee</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  ${list.map(it => renderRow(it))}
                </tbody>
              </table>`}
          </div>`
        : null}
      </div>
    `
  }

  async function updateInline(id: string, patch: IssueUpdatePatch): Promise<void> {
    try {
      await data.updateIssue({ id, ...patch })
      // Re-render; view will update on subsequent push
      doRender()
    } catch {
      // swallow; UI remains
    }
  }

  async function toggle(epic_id: string): Promise<void> {
    if (!expanded.has(epic_id)) {
      expanded.add(epic_id)
      loading.add(epic_id)
      doRender()
      // Subscribe to epic detail; children are rendered from `dependents`
      if (subscriptions && typeof subscriptions.subscribeList === "function") {
        try {
          // Register store first to avoid dropping the initial snapshot
          try {
            if (issue_stores && issue_stores.register) {
              issue_stores.register(`detail:${epic_id}`, {
                type: "issue-detail",
                params: { id: epic_id },
              })
            }
          } catch {
            // ignore
          }
          const u = await subscriptions.subscribeList(`detail:${epic_id}`, {
            type: "issue-detail",
            params: { id: epic_id },
          })
          epic_unsubs.set(epic_id, u)
        } catch {
          // ignore subscription failures
        }
      }
      // Mark as not loading after subscribe attempt; membership will stream in
      loading.delete(epic_id)
    } else {
      expanded.delete(epic_id)
      // Unsubscribe when collapsing
      if (epic_unsubs.has(epic_id)) {
        try {
          const u = epic_unsubs.get(epic_id)
          if (u) {
            await u()
          }
        } catch {
          // ignore
        }
        epic_unsubs.delete(epic_id)
        try {
          if (issue_stores && issue_stores.unregister) {
            issue_stores.unregister(`detail:${epic_id}`)
          }
        } catch {
          // ignore
        }
      }
    }
    doRender()
  }

  /** Build groups from the current `tab:epics` snapshot. */
  function buildGroupsFromSnapshot(): EpicGroup[] {
    const epic_entities: EpicEntity[] =
      issue_stores && issue_stores.snapshotFor ?
        (issue_stores.snapshotFor("tab:epics") as EpicEntity[]) || []
      : []
    const next_groups: EpicGroup[] = []
    for (const epic of epic_entities) {
      const dependents = Array.isArray(epic.dependents) ? epic.dependents : []
      // Prefer explicit counters when provided by server; otherwise derive
      const has_total = Number.isFinite(epic.total_children)
      const has_closed = Number.isFinite(epic.closed_children)
      const total = has_total ? Number(epic.total_children) || 0 : dependents.length
      let closed = has_closed ? Number(epic.closed_children) || 0 : 0
      if (!has_closed) {
        for (const d of dependents) {
          if (String(d.status || "") === "closed") {
            closed++
          }
        }
      }
      next_groups.push({
        epic,
        total_children: total,
        closed_children: closed,
      })
    }
    return next_groups
  }

  return {
    async load(): Promise<void> {
      groups = buildGroupsFromSnapshot()
      doRender()
      // Auto-expand first epic on screen
      try {
        if (groups.length > 0) {
          const first_group = groups[0]
          const first_id = first_group ? String(first_group.epic?.id || "") : ""
          if (first_id && !expanded.has(first_id)) {
            // This will render and load children lazily
            await toggle(first_id)
          }
        }
      } catch {
        // ignore auto-expand failures
      }
    },
  }
}
