import { html, TemplateResult } from "lit-html"
import { createIssueIdRenderer } from "../utils/issue-id-renderer.js"
import { emojiForPriority } from "../utils/priority-badge.js"
import { priority_levels } from "../utils/priority.js"
import { statusLabel } from "../utils/status.js"
import { createTypeBadge } from "../utils/type-badge.js"

/**
 * Issue data for row rendering.
 */
export interface IssueRowData {
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
 * Patch object for issue updates.
 */
export interface IssueUpdatePatch {
  title?: string
  assignee?: string
  status?: "open" | "in_progress" | "closed"
  priority?: number
}

/**
 * Options for creating an issue row renderer.
 */
export interface IssueRowOptions {
  navigate: (id: string) => void
  onUpdate: (id: string, patch: IssueUpdatePatch) => Promise<void>
  requestRender: () => void
  getSelectedId?: () => string | null
  row_class?: string
}

/**
 * Create a reusable issue row renderer used by list and epics views.
 * Handles inline editing for title/assignee and selects for status/priority.
 *
 * @param options - Configuration options.
 * @returns Template function for rendering issue rows.
 */
export function createIssueRowRenderer(
  options: IssueRowOptions,
): (it: IssueRowData) => TemplateResult<1> {
  const navigate = options.navigate
  const on_update = options.onUpdate
  const request_render = options.requestRender
  const get_selected_id = options.getSelectedId || ((): string | null => null)
  const row_class = options.row_class || "issue-row"

  const editing = new Set<string>()

  /**
   * Render an editable text field.
   *
   * @param id - Issue ID.
   * @param key - Field key (title or assignee).
   * @param value - Current value.
   * @param placeholder - Placeholder text when empty.
   * @returns Template for the editable field.
   */
  function editableText(
    id: string,
    key: "title" | "assignee",
    value: string,
    placeholder: string = "",
  ): TemplateResult {
    const k = `${id}:${key}`
    const is_edit = editing.has(k)
    if (is_edit) {
      return html`<span>
        <input
          type="text"
          .value=${value}
          class="inline-edit"
          @keydown=${async (e: KeyboardEvent): Promise<void> => {
            if (e.key === "Escape") {
              editing.delete(k)
              request_render()
            } else if (e.key === "Enter") {
              const el = e.currentTarget as HTMLInputElement
              const next = el.value || ""
              if (next !== value) {
                await on_update(id, { [key]: next })
              }
              editing.delete(k)
              request_render()
            }
          }}
          @blur=${async (ev: FocusEvent): Promise<void> => {
            const el = ev.currentTarget as HTMLInputElement
            const next = el.value || ""
            if (next !== value) {
              await on_update(id, { [key]: next })
            }
            editing.delete(k)
            request_render()
          }}
          autofocus
        />
      </span>`
    }
    return html`<span
      class="editable text-truncate ${value ? "" : "muted"}"
      tabindex="0"
      role="button"
      @click=${(e: MouseEvent): void => {
        e.stopPropagation()
        e.preventDefault()
        editing.add(k)
        request_render()
      }}
      @keydown=${(e: KeyboardEvent): void => {
        if (e.key === "Enter") {
          e.preventDefault()
          e.stopPropagation()
          editing.add(k)
          request_render()
        }
      }}
      >${value || placeholder}</span
    >`
  }

  /**
   * Create a change handler for select elements.
   *
   * @param id - Issue ID.
   * @param key - Field key (priority or status).
   * @returns Event handler function.
   */
  function makeSelectChange(id: string, key: "priority" | "status"): (ev: Event) => Promise<void> {
    return async (ev: Event): Promise<void> => {
      const sel = ev.currentTarget as HTMLSelectElement
      const val = sel.value || ""
      const patch: IssueUpdatePatch = {}
      if (key === "priority") {
        patch.priority = Number(val)
      } else {
        patch.status = val as "open" | "in_progress" | "closed"
      }
      await on_update(id, patch)
    }
  }

  /**
   * Create a click handler for row navigation.
   *
   * @param id - Issue ID.
   * @returns Event handler function.
   */
  function makeRowClick(id: string): (ev: Event) => void {
    return (ev: Event): void => {
      const el = ev.target as HTMLElement | null
      if (el && (el.tagName === "INPUT" || el.tagName === "SELECT")) {
        return
      }
      navigate(id)
    }
  }

  /**
   * Render an issue row.
   *
   * @param it - Issue data.
   * @returns Template for the row.
   */
  function rowTemplate(it: IssueRowData): TemplateResult<1> {
    const cur_status = String(it.status || "open")
    const cur_prio = String(it.priority ?? 2)
    const is_selected = get_selected_id() === it.id
    return html`<tr
      role="row"
      class="${row_class} ${is_selected ? "selected" : ""}"
      data-issue-id=${it.id}
      @click=${makeRowClick(it.id)}
    >
      <td role="gridcell" class="mono">${createIssueIdRenderer(it.id)}</td>
      <td role="gridcell">${createTypeBadge(it.issue_type)}</td>
      <td role="gridcell">${editableText(it.id, "title", it.title || "")}</td>
      <td role="gridcell">
        <select
          class="badge-select badge--status is-${cur_status}"
          .value=${cur_status}
          @change=${makeSelectChange(it.id, "status")}
        >
          ${(["open", "in_progress", "closed"] as const).map(
            s => html`<option value=${s} ?selected=${cur_status === s}>${statusLabel(s)}</option>`,
          )}
        </select>
      </td>
      <td role="gridcell">${editableText(it.id, "assignee", it.assignee || "", "Unassigned")}</td>
      <td role="gridcell">
        <select
          class="badge-select badge--priority ${"is-p" + cur_prio}"
          .value=${cur_prio}
          @change=${makeSelectChange(it.id, "priority")}
        >
          ${priority_levels.map(
            (p, i) =>
              html`<option value=${String(i)} ?selected=${cur_prio === String(i)}>
                ${emojiForPriority(i)} ${p}
              </option>`,
          )}
        </select>
      </td>
      <td role="gridcell" class="deps-col">
        ${(it.dependency_count || 0) > 0 || (it.dependent_count || 0) > 0 ?
          html`<span class="deps-indicator"
            >${(it.dependency_count || 0) > 0 ?
              html`<span
                class="dep-count"
                title="${it.dependency_count} ${(it.dependency_count || 0) === 1 ?
                  "dependency"
                : "dependencies"}"
                >→${it.dependency_count}</span
              >`
            : ""}${(it.dependent_count || 0) > 0 ?
              html`<span
                class="dependent-count"
                title="${it.dependent_count} ${(it.dependent_count || 0) === 1 ?
                  "dependent"
                : "dependents"}"
                >←${it.dependent_count}</span
              >`
            : ""}</span
          >`
        : ""}
      </td>
    </tr>`
  }

  return rowTemplate
}
