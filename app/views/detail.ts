// Issue Detail view implementation (lit-html based)
import { html, render, TemplateResult } from "lit-html"
import { unsafeHTML } from "lit-html/directives/unsafe-html.js"
import { parseView } from "../router.js"
import { issueHashFor } from "../utils/issue-url.js"
import { debug } from "../utils/logging.js"
import { renderMarkdown } from "../utils/markdown.js"
import { emojiForPriority } from "../utils/priority-badge.js"
import { priority_levels } from "../utils/priority.js"
import { statusLabel } from "../utils/status.js"
import { showToast } from "../utils/toast.js"
import { createTypeBadge } from "../utils/type-badge.js"
import type { Comment, DependencyRef, IssueDetail } from "../../types/issues.js"
import type { ViewName } from "../router.js"

/**
 * Issue stores interface for live updates.
 */
interface IssueStores {
  snapshotFor?: (client_id: string) => IssueDetail[]
  subscribe?: (fn: () => void) => () => void
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
 * View API returned by createDetailView.
 */
export interface DetailViewAPI {
  load: (id: string) => Promise<void>
  clear: () => void
  destroy: () => void
}

/**
 * Format a date string for display.
 */
function formatCommentDate(dateStr?: string): string {
  if (!dateStr) return ""
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return dateStr
  }
}

/**
 * Default navigation function using window.location.hash.
 */
function defaultNavigateFn(hash: string): void {
  window.location.hash = hash
}

/**
 * Create the Issue Detail view.
 *
 * @param mount_element - Element to render into.
 * @param sendFn - RPC transport.
 * @param navigateFn - Navigation function; defaults to setting location.hash.
 * @param issue_stores - Optional issue stores for live updates.
 * @returns View API.
 */
export function createDetailView(
  mount_element: HTMLElement,
  sendFn: SendFn,
  navigateFn: NavigateFn = defaultNavigateFn,
  issue_stores: IssueStores | undefined = undefined,
): DetailViewAPI {
  const log = debug("views:detail")
  let current: IssueDetail | null = null
  let current_id: string | null = null
  let pending = false
  let edit_title = false
  let edit_desc = false
  let edit_design = false
  let edit_notes = false
  let edit_accept = false
  let edit_assignee = false
  let new_label_text = ""
  let comment_text = ""
  let comment_pending = false

  let delete_dialog: HTMLDialogElement | null = null

  function ensureDeleteDialog(): HTMLDialogElement {
    if (delete_dialog) return delete_dialog
    delete_dialog = document.createElement("dialog")
    delete_dialog.id = "delete-confirm-dialog"
    delete_dialog.setAttribute("role", "alertdialog")
    delete_dialog.setAttribute("aria-modal", "true")
    document.body.appendChild(delete_dialog)
    return delete_dialog
  }

  function openDeleteDialog(): void {
    if (!current) return
    const dialog = ensureDeleteDialog()
    const issueId = current.id
    const issueTitle = current.title || "(no title)"
    dialog.innerHTML = `
      <div class="delete-confirm">
        <h2 class="delete-confirm__title">Delete Issue</h2>
        <p class="delete-confirm__message">
          Are you sure you want to delete issue <strong>${issueId}</strong> — <strong>${issueTitle}</strong>? This action cannot be undone.
        </p>
        <div class="delete-confirm__actions">
          <button type="button" class="btn" id="delete-cancel-btn">Cancel</button>
          <button type="button" class="btn danger" id="delete-confirm-btn">Delete</button>
        </div>
      </div>
    `
    const cancelBtn = dialog.querySelector("#delete-cancel-btn")
    const confirmBtn = dialog.querySelector("#delete-confirm-btn")

    cancelBtn?.addEventListener("click", () => {
      if (typeof dialog.close === "function") {
        dialog.close()
      }
      dialog.removeAttribute("open")
    })

    confirmBtn?.addEventListener("click", async () => {
      if (typeof dialog.close === "function") {
        dialog.close()
      }
      dialog.removeAttribute("open")
      await performDelete()
    })

    dialog.addEventListener("cancel", (ev: Event) => {
      ev.preventDefault()
      if (typeof dialog.close === "function") {
        dialog.close()
      }
      dialog.removeAttribute("open")
    })

    if (typeof dialog.showModal === "function") {
      try {
        dialog.showModal()
        dialog.setAttribute("open", "")
      } catch {
        dialog.setAttribute("open", "")
      }
    } else {
      dialog.setAttribute("open", "")
    }
  }

  async function performDelete(): Promise<void> {
    if (!current) return
    const id = current.id
    try {
      await sendFn("delete-issue", { id })
      current = null
      current_id = null
      doRender()
      // Navigate back to close the dialog
      const view = parseView(window.location.hash || "")
      navigateFn(`#/${view}`)
    } catch (err) {
      log("delete failed: %o", err)
      showToast("Failed to delete issue", "error")
    }
  }

  function onDeleteClick(ev: Event): void {
    ev.stopPropagation()
    ev.preventDefault()
    openDeleteDialog()
  }

  function issueHref(id: string): string {
    const view: ViewName = parseView(window.location.hash || "")
    return issueHashFor(view, id)
  }

  function renderPlaceholder(message: string): void {
    render(
      html`
        <div class="panel__body" id="detail-root">
          <p class="muted">${message}</p>
        </div>
      `,
      mount_element,
    )
  }

  /**
   * Refresh current from subscription store snapshot if available.
   */
  function refreshFromStore(): void {
    if (!current_id || !issue_stores || typeof issue_stores.snapshotFor !== "function") {
      return
    }
    const arr = issue_stores.snapshotFor(`detail:${current_id}`)
    if (Array.isArray(arr) && arr.length > 0) {
      // First item is the issue for this subscription
      const found = arr.find(it => String(it.id) === String(current_id)) ?? arr[0]
      current = found ?? null
    }
  }

  // Live updates: re-render when issue stores change
  if (issue_stores && typeof issue_stores.subscribe === "function") {
    issue_stores.subscribe(() => {
      try {
        refreshFromStore()
        doRender()
      } catch (err) {
        log("issue stores listener error %o", err)
      }
    })
  }

  // Handlers
  const onTitleSpanClick = (): void => {
    edit_title = true
    doRender()
  }

  const onTitleKeydown = (ev: KeyboardEvent): void => {
    if (ev.key === "Enter") {
      edit_title = true
      doRender()
    } else if (ev.key === "Escape") {
      edit_title = false
      doRender()
    }
  }

  const onTitleSave = async (): Promise<void> => {
    if (!current || pending) {
      return
    }
    const input = mount_element.querySelector("h2 input") as HTMLInputElement | null
    const prev = current.title || ""
    const next = input ? input.value : ""
    if (next === prev) {
      edit_title = false
      doRender()
      return
    }
    pending = true
    if (input) {
      input.disabled = true
    }
    try {
      log("save title %s → %s", String(current.id), next)
      const updated = await sendFn("edit-text", {
        id: current.id,
        field: "title",
        value: next,
      })
      if (updated && typeof updated === "object") {
        current = updated as IssueDetail
        edit_title = false
        doRender()
      }
    } catch (err) {
      log("save title failed %s %o", String(current.id), err)
      current.title = prev
      edit_title = false
      doRender()
      showToast("Failed to save title", "error")
    } finally {
      pending = false
    }
  }

  const onTitleCancel = (): void => {
    edit_title = false
    doRender()
  }

  // Assignee inline edit handlers
  const onAssigneeSpanClick = (): void => {
    edit_assignee = true
    doRender()
  }

  const onAssigneeKeydown = (ev: KeyboardEvent): void => {
    if (ev.key === "Enter") {
      ev.preventDefault()
      edit_assignee = true
      doRender()
    } else if (ev.key === "Escape") {
      ev.preventDefault()
      edit_assignee = false
      doRender()
    }
  }

  const onAssigneeSave = async (): Promise<void> => {
    if (!current || pending) {
      return
    }
    const input = mount_element.querySelector(
      "#detail-root .prop.assignee input",
    ) as HTMLInputElement | null
    const prev = current?.assignee ?? ""
    const next = input?.value ?? ""
    if (next === prev) {
      edit_assignee = false
      doRender()
      return
    }
    pending = true
    if (input) {
      input.disabled = true
    }
    try {
      log("save assignee %s → %s", String(current.id), next)
      const updated = await sendFn("update-assignee", {
        id: current.id,
        assignee: next,
      })
      if (updated && typeof updated === "object") {
        current = updated as IssueDetail
        edit_assignee = false
        doRender()
      }
    } catch (err) {
      log("save assignee failed %s %o", String(current.id), err)
      // revert visually
      current.assignee = prev
      edit_assignee = false
      doRender()
      showToast("Failed to update assignee", "error")
    } finally {
      pending = false
    }
  }

  const onAssigneeCancel = (): void => {
    edit_assignee = false
    doRender()
  }

  // Labels handlers
  const onLabelInput = (ev: Event): void => {
    const el = ev.currentTarget as HTMLInputElement
    new_label_text = el.value || ""
  }

  function onLabelKeydown(e: KeyboardEvent): void {
    if (e.key === "Enter") {
      e.preventDefault()
      void onAddLabel()
    }
  }

  async function onAddLabel(): Promise<void> {
    if (!current || pending) {
      return
    }
    const text = new_label_text.trim()
    if (!text) {
      return
    }
    pending = true
    try {
      log("add label %s → %s", String(current.id), text)
      const updated = await sendFn("label-add", {
        id: current.id,
        label: text,
      })
      if (updated && typeof updated === "object") {
        current = updated as IssueDetail
        new_label_text = ""
        doRender()
      }
    } catch (err) {
      log("add label failed %s %o", String(current.id), err)
      showToast("Failed to add label", "error")
    } finally {
      pending = false
    }
  }

  async function onRemoveLabel(label: string): Promise<void> {
    if (!current || pending) {
      return
    }
    pending = true
    try {
      log("remove label %s → %s", String(current?.id || ""), label)
      const updated = await sendFn("label-remove", {
        id: current.id,
        label,
      })
      if (updated && typeof updated === "object") {
        current = updated as IssueDetail
        doRender()
      }
    } catch (err) {
      log("remove label failed %s %o", String(current?.id || ""), err)
      showToast("Failed to remove label", "error")
    } finally {
      pending = false
    }
  }

  const onStatusChange = async (ev: Event): Promise<void> => {
    if (!current || pending) {
      doRender()
      return
    }
    const sel = ev.currentTarget as HTMLSelectElement
    const prev = current.status || "open"
    const next = sel.value
    if (next === prev) {
      return
    }
    pending = true
    current.status = next
    doRender()
    try {
      log("update status %s → %s", String(current.id), next)
      const updated = await sendFn("update-status", {
        id: current.id,
        status: next,
      })
      if (updated && typeof updated === "object") {
        current = updated as IssueDetail
        doRender()
      }
    } catch (err) {
      log("update status failed %s %o", String(current.id), err)
      current.status = prev
      doRender()
      showToast("Failed to update status", "error")
    } finally {
      pending = false
    }
  }

  const onPriorityChange = async (ev: Event): Promise<void> => {
    if (!current || pending) {
      doRender()
      return
    }
    const sel = ev.currentTarget as HTMLSelectElement
    const prev = typeof current.priority === "number" ? current.priority : 2
    const next = Number(sel.value)
    if (next === prev) {
      return
    }
    pending = true
    current.priority = next
    doRender()
    try {
      log("update priority %s → %d", String(current.id), next)
      const updated = await sendFn("update-priority", {
        id: current.id,
        priority: next,
      })
      if (updated && typeof updated === "object") {
        current = updated as IssueDetail
        doRender()
      }
    } catch (err) {
      log("update priority failed %s %o", String(current.id), err)
      current.priority = prev
      doRender()
      showToast("Failed to update priority", "error")
    } finally {
      pending = false
    }
  }

  const onDescEdit = (): void => {
    edit_desc = true
    doRender()
  }

  const onDescKeydown = (ev: KeyboardEvent): void => {
    if (ev.key === "Escape") {
      edit_desc = false
      doRender()
    } else if (ev.key === "Enter" && ev.ctrlKey) {
      const btn = mount_element.querySelector(
        "#detail-root .editable-actions button",
      ) as HTMLButtonElement | null
      if (btn) {
        btn.click()
      }
    }
  }

  const onDescSave = async (): Promise<void> => {
    if (!current || pending) {
      return
    }
    const ta = mount_element.querySelector("#detail-root textarea") as HTMLTextAreaElement | null
    const prev = current.description || ""
    const next = ta ? ta.value : ""
    if (next === prev) {
      edit_desc = false
      doRender()
      return
    }
    pending = true
    if (ta) {
      ta.disabled = true
    }
    try {
      log("save description %s", String(current?.id || ""))
      const updated = await sendFn("edit-text", {
        id: current.id,
        field: "description",
        value: next,
      })
      if (updated && typeof updated === "object") {
        current = updated as IssueDetail
        edit_desc = false
        doRender()
      }
    } catch (err) {
      log("save description failed %s %o", String(current?.id || ""), err)
      current.description = prev
      edit_desc = false
      doRender()
      showToast("Failed to save description", "error")
    } finally {
      pending = false
    }
  }

  const onDescCancel = (): void => {
    edit_desc = false
    doRender()
  }

  // Design inline edit handlers (same UX as Description)
  const onDesignEdit = (): void => {
    edit_design = true
    doRender()
    try {
      const ta = mount_element.querySelector(
        "#detail-root .design textarea",
      ) as HTMLTextAreaElement | null
      if (ta) {
        ta.focus()
      }
    } catch (err) {
      log("focus design textarea failed %o", err)
    }
  }

  const onDesignKeydown = (ev: KeyboardEvent): void => {
    if (ev.key === "Escape") {
      edit_design = false
      doRender()
    } else if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
      const btn = mount_element.querySelector(
        "#detail-root .design .editable-actions button",
      ) as HTMLButtonElement | null
      if (btn) {
        btn.click()
      }
    }
  }

  const onDesignSave = async (): Promise<void> => {
    if (!current || pending) {
      return
    }
    const ta = mount_element.querySelector(
      "#detail-root .design textarea",
    ) as HTMLTextAreaElement | null
    const prev = current.design || ""
    const next = ta ? ta.value : ""
    if (next === prev) {
      edit_design = false
      doRender()
      return
    }
    pending = true
    if (ta) {
      ta.disabled = true
    }
    try {
      log("save design %s", String(current?.id || ""))
      const updated = await sendFn("edit-text", {
        id: current.id,
        field: "design",
        value: next,
      })
      if (updated && typeof updated === "object") {
        current = updated as IssueDetail
        edit_design = false
        doRender()
      }
    } catch (err) {
      log("save design failed %s %o", String(current?.id || ""), err)
      current.design = prev
      edit_design = false
      doRender()
      showToast("Failed to save design", "error")
    } finally {
      pending = false
    }
  }

  const onDesignCancel = (): void => {
    edit_design = false
    doRender()
  }

  // Notes inline edit handlers
  const onNotesEdit = (): void => {
    edit_notes = true
    doRender()
  }

  const onNotesKeydown = (ev: KeyboardEvent): void => {
    if (ev.key === "Escape") {
      edit_notes = false
      doRender()
    } else if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
      const btn = mount_element.querySelector(
        "#detail-root .notes .editable-actions button",
      ) as HTMLButtonElement | null
      if (btn) {
        btn.click()
      }
    }
  }

  const onNotesSave = async (): Promise<void> => {
    if (!current || pending) {
      return
    }
    const ta = mount_element.querySelector(
      "#detail-root .notes textarea",
    ) as HTMLTextAreaElement | null
    const prev = current.notes || ""
    const next = ta ? ta.value : ""
    if (next === prev) {
      edit_notes = false
      doRender()
      return
    }
    pending = true
    if (ta) {
      ta.disabled = true
    }
    try {
      log("save notes %s", String(current?.id || ""))
      const updated = await sendFn("edit-text", {
        id: current.id,
        field: "notes",
        value: next,
      })
      if (updated && typeof updated === "object") {
        current = updated as IssueDetail
        edit_notes = false
        doRender()
      }
    } catch (err) {
      log("save notes failed %s %o", String(current?.id || ""), err)
      current.notes = prev
      edit_notes = false
      doRender()
      showToast("Failed to save notes", "error")
    } finally {
      pending = false
    }
  }

  const onNotesCancel = (): void => {
    edit_notes = false
    doRender()
  }

  const onAcceptEdit = (): void => {
    edit_accept = true
    doRender()
  }

  const onAcceptKeydown = (ev: KeyboardEvent): void => {
    if (ev.key === "Escape") {
      edit_accept = false
      doRender()
    } else if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
      const btn = mount_element.querySelector(
        "#detail-root .acceptance .editable-actions button",
      ) as HTMLButtonElement | null
      if (btn) {
        btn.click()
      }
    }
  }

  const onAcceptSave = async (): Promise<void> => {
    if (!current || pending) {
      return
    }
    const ta = mount_element.querySelector(
      "#detail-root .acceptance textarea",
    ) as HTMLTextAreaElement | null
    const prev = current.acceptance || ""
    const next = ta ? ta.value : ""
    if (next === prev) {
      edit_accept = false
      doRender()
      return
    }
    pending = true
    if (ta) {
      ta.disabled = true
    }
    try {
      log("save acceptance %s", String(current?.id || ""))
      const updated = await sendFn("edit-text", {
        id: current.id,
        field: "acceptance",
        value: next,
      })
      if (updated && typeof updated === "object") {
        current = updated as IssueDetail
        edit_accept = false
        doRender()
      }
    } catch (err) {
      log("save acceptance failed %s %o", String(current?.id || ""), err)
      current.acceptance = prev
      edit_accept = false
      doRender()
      showToast("Failed to save acceptance", "error")
    } finally {
      pending = false
    }
  }

  const onAcceptCancel = (): void => {
    edit_accept = false
    doRender()
  }

  // Comment input handlers
  const onCommentInput = (ev: Event): void => {
    const el = ev.currentTarget as HTMLTextAreaElement
    const prev_has_text = comment_text.trim().length > 0
    comment_text = el.value || ""
    const has_text = comment_text.trim().length > 0
    // Re-render when the "has content" state changes to update button disabled state
    if (prev_has_text !== has_text) {
      doRender()
    }
  }

  const onCommentSubmit = async (): Promise<void> => {
    if (!current || comment_pending || !comment_text.trim()) {
      return
    }
    comment_pending = true
    doRender()
    try {
      log("add comment to %s", String(current.id))
      const result = await sendFn("add-comment", {
        id: current.id,
        text: comment_text.trim(),
      })
      if (Array.isArray(result)) {
        // Update comments in current issue
        ;(current as IssueDetail & { comments?: Comment[] }).comments = result
        comment_text = ""
        doRender()
      }
    } catch (err) {
      log("add comment failed %s %o", String(current.id), err)
      showToast("Failed to add comment", "error")
    } finally {
      comment_pending = false
      doRender()
    }
  }

  const onCommentKeydown = (ev: KeyboardEvent): void => {
    if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
      ev.preventDefault()
      onCommentSubmit()
    }
  }

  function depsSection(
    title: "Dependencies" | "Dependents",
    items: DependencyRef[],
  ): TemplateResult {
    const test_id = title === "Dependencies" ? "add-dependency" : "add-dependent"
    return html`
      <div class="props-card">
        <div>
          <div class="props-card__title">${title}</div>
        </div>
        <ul>
          ${!items || items.length === 0 ?
            null
          : items.map(dep => {
              const did = dep.id
              const href = issueHref(did)
              return html`<li data-href=${href} @click=${() => navigateFn(href)}>
                ${createTypeBadge(dep.issue_type || "")}
                <span class="text-truncate">${dep.title || ""}</span>
                <button
                  aria-label=${`Remove dependency ${did}`}
                  @click=${makeDepRemoveClick(did, title)}
                >
                  ×
                </button>
              </li>`
            })}
        </ul>
        <div class="props-card__footer">
          <input type="text" placeholder="Issue ID" data-testid=${test_id} />
          <button @click=${makeDepAddClick(items, title)}>Add</button>
        </div>
      </div>
    `
  }

  function detailTemplate(issue: IssueDetail): TemplateResult {
    const title_zone =
      edit_title ?
        html`<div class="detail-title">
          <h2>
            <input
              type="text"
              aria-label="Edit title"
              .value=${issue.title || ""}
              @keydown=${onTitleInputKeydown}
            />
            <button @click=${onTitleSave}>Save</button>
            <button @click=${onTitleCancel}>Cancel</button>
          </h2>
        </div>`
      : html`<div class="detail-title">
          <h2>
            <span
              class="editable"
              tabindex="0"
              role="button"
              aria-label="Edit title"
              @click=${onTitleSpanClick}
              @keydown=${onTitleKeydown}
              >${issue.title || ""}</span
            >
          </h2>
        </div>`

    const status_select = html`<select
      class=${`badge-select badge--status is-${issue.status || "open"}`}
      @change=${onStatusChange}
      .value=${issue.status || "open"}
      ?disabled=${pending}
    >
      ${(() => {
        const cur = String(issue.status || "open")
        return ["open", "in_progress", "closed"].map(
          s => html`<option value=${s} ?selected=${cur === s}>${statusLabel(s)}</option>`,
        )
      })()}
    </select>`

    const priority_select = html`<select
      class=${`badge-select badge--priority is-p${String(
        typeof issue.priority === "number" ? issue.priority : 2,
      )}`}
      @change=${onPriorityChange}
      .value=${String(typeof issue.priority === "number" ? issue.priority : 2)}
      ?disabled=${pending}
    >
      ${(() => {
        const cur = String(typeof issue.priority === "number" ? issue.priority : 2)
        return priority_levels.map(
          (p, i) =>
            html`<option value=${String(i)} ?selected=${cur === String(i)}>
              ${emojiForPriority(i)} ${p}
            </option>`,
        )
      })()}
    </select>`

    const desc_block =
      edit_desc ?
        html`<div class="description">
          <textarea
            @keydown=${onDescKeydown}
            .value=${issue.description || ""}
            rows="8"
            style="width:100%"
          ></textarea>
          <div class="editable-actions">
            <button @click=${onDescSave}>Save</button>
            <button @click=${onDescCancel}>Cancel</button>
          </div>
        </div>`
      : html`<div
          class="md editable"
          tabindex="0"
          role="button"
          aria-label="Edit description"
          @click=${onDescEdit}
          @keydown=${onDescEditableKeydown}
        >
          ${(() => {
            const text = issue.description || ""
            if (text.trim() === "") {
              return html`<div class="muted">Description</div>`
            }
            return unsafeHTML(renderMarkdown(text))
          })()}
        </div>`

    // Normalize acceptance text: prefer issue.acceptance, fallback to acceptance_criteria from bd
    const acceptance_text = (() => {
      const any_issue = issue as IssueDetail & { acceptance_criteria?: string }
      const raw = String(issue.acceptance || any_issue.acceptance_criteria || "")
      return raw
    })()

    const accept_block =
      edit_accept ?
        html`<div class="acceptance">
          ${acceptance_text.trim().length > 0 ?
            html`<div class="props-card__title">Acceptance Criteria</div>`
          : ""}
          <textarea
            @keydown=${onAcceptKeydown}
            .value=${acceptance_text}
            rows="6"
            style="width:100%"
          ></textarea>
          <div class="editable-actions">
            <button @click=${onAcceptSave}>Save</button>
            <button @click=${onAcceptCancel}>Cancel</button>
          </div>
        </div>`
      : html`<div class="acceptance">
          ${(() => {
            const text = acceptance_text
            const has = text.trim().length > 0
            return html`${has ? html`<div class="props-card__title">Acceptance Criteria</div>` : ""}
              <div
                class="md editable"
                tabindex="0"
                role="button"
                aria-label="Edit acceptance criteria"
                @click=${onAcceptEdit}
                @keydown=${onAcceptEditableKeydown}
              >
                ${has ?
                  unsafeHTML(renderMarkdown(text))
                : html`<div class="muted">Add acceptance criteria…</div>`}
              </div>`
          })()}
        </div>`

    // Notes: editable in-place similar to Description
    const notes_text = String(issue.notes || "")
    const notes_block =
      edit_notes ?
        html`<div class="notes">
          ${notes_text.trim().length > 0 ? html`<div class="props-card__title">Notes</div>` : ""}
          <textarea
            @keydown=${onNotesKeydown}
            .value=${notes_text}
            rows="6"
            style="width:100%"
          ></textarea>
          <div class="editable-actions">
            <button @click=${onNotesSave}>Save</button>
            <button @click=${onNotesCancel}>Cancel</button>
          </div>
        </div>`
      : html`<div class="notes">
          ${(() => {
            const text = notes_text
            const has = text.trim().length > 0
            return html`${has ? html`<div class="props-card__title">Notes</div>` : ""}
              <div
                class="md editable"
                tabindex="0"
                role="button"
                aria-label="Edit notes"
                @click=${onNotesEdit}
                @keydown=${onNotesEditableKeydown}
              >
                ${has ?
                  unsafeHTML(renderMarkdown(text))
                : html`<div class="muted">Add notes…</div>`}
              </div>`
          })()}
        </div>`

    // Labels section
    const labels = Array.isArray(issue.labels) ? issue.labels : []
    const labels_block = html`<div class="props-card labels">
      <div>
        <div class="props-card__title">Labels</div>
      </div>
      <ul>
        ${labels.map(
          l =>
            html`<li>
              <span class="badge" title=${l}
                >${l}
                <button
                  class="icon-button"
                  title="Remove label"
                  aria-label=${"Remove label " + l}
                  @click=${() => onRemoveLabel(l)}
                  style="margin-left:6px"
                >
                  ×
                </button></span
              >
            </li>`,
        )}
      </ul>
      <div class="props-card__footer">
        <input
          type="text"
          placeholder="Label"
          size="12"
          .value=${new_label_text}
          @input=${onLabelInput}
          @keydown=${onLabelKeydown}
        />
        <button @click=${onAddLabel}>Add</button>
      </div>
    </div>`

    // Design section block
    const design_text = String(issue.design || "")
    const design_block =
      edit_design ?
        html`<div class="design">
          ${design_text.trim().length > 0 ? html`<div class="props-card__title">Design</div>` : ""}
          <textarea
            @keydown=${onDesignKeydown}
            .value=${design_text}
            rows="6"
            style="width:100%"
          ></textarea>
          <div class="editable-actions">
            <button @click=${onDesignSave}>Save</button>
            <button @click=${onDesignCancel}>Cancel</button>
          </div>
        </div>`
      : html`<div class="design">
          ${(() => {
            const text = design_text
            const has = text.trim().length > 0
            return html`${has ? html`<div class="props-card__title">Design</div>` : ""}
              <div
                class="md editable"
                tabindex="0"
                role="button"
                aria-label="Edit design"
                @click=${onDesignEdit}
                @keydown=${onDesignEditableKeydown}
              >
                ${has ?
                  unsafeHTML(renderMarkdown(text))
                : html`<div class="muted">Add design…</div>`}
              </div>`
          })()}
        </div>`

    // Comments section
    const comments =
      Array.isArray((issue as IssueDetail & { comments?: Comment[] }).comments) ?
        (issue as IssueDetail & { comments?: Comment[] }).comments!
      : []
    const comments_block = html`<div class="comments">
      <div class="props-card__title">Comments</div>
      ${comments.length === 0 ?
        html`<div class="muted">No comments yet</div>`
      : comments.map(
          c => html`
            <div class="comment-item">
              <div class="comment-header">
                <span class="comment-author">${c.author || "Unknown"}</span>
                <span class="comment-date">${formatCommentDate(c.created_at)}</span>
              </div>
              <div class="comment-text">${c.text}</div>
            </div>
          `,
        )}
      <div class="comment-input">
        <textarea
          placeholder="Add a comment... (Ctrl+Enter to submit)"
          rows="3"
          .value=${comment_text}
          @input=${onCommentInput}
          @keydown=${onCommentKeydown}
          ?disabled=${comment_pending}
        ></textarea>
        <button @click=${onCommentSubmit} ?disabled=${comment_pending || !comment_text.trim()}>
          ${comment_pending ? "Adding..." : "Add Comment"}
        </button>
      </div>
    </div>`

    return html`
      <div class="panel__body" id="detail-root">
        <div class="detail-layout">
          <div class="detail-main">
            ${title_zone} ${desc_block} ${design_block} ${notes_block}
            ${accept_block} ${comments_block}
          </div>
          <div class="detail-side">
            <div class="props-card">
              <div class="props-card__header">
                <div class="props-card__title">Properties</div>
                <button class="delete-issue-btn" title="Delete issue" aria-label="Delete issue" @click=${onDeleteClick}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                  <span class="tooltip">Delete issue</span>
                </button>
              </div>
                <div class="prop">
                  <div class="label">Type</div>
                  <div class="value">
                    ${createTypeBadge((issue as IssueDetail & { issue_type?: string }).issue_type)}
                  </div>
                </div>
                <div class="prop">
                  <div class="label">Status</div>
                  <div class="value">${status_select}</div>
                </div>
                <div class="prop">
                  <div class="label">Priority</div>
                  <div class="value">${priority_select}</div>
                </div>
                <div class="prop assignee">
                  <div class="label">Assignee</div>
                  <div class="value">
                    ${
                      edit_assignee ?
                        html`<input
                            type="text"
                            aria-label="Edit assignee"
                            .value=${(issue as IssueDetail).assignee || ""}
                            size=${Math.min(40, Math.max(12, (issue.assignee || "").length + 3))}
                            @keydown=${(e: KeyboardEvent) => {
                              if (e.key === "Escape") {
                                e.preventDefault()
                                onAssigneeCancel()
                              } else if (e.key === "Enter") {
                                e.preventDefault()
                                onAssigneeSave()
                              }
                            }}
                          />
                          <button class="btn" style="margin-left:6px" @click=${onAssigneeSave}>
                            Save
                          </button>
                          <button class="btn" style="margin-left:6px" @click=${onAssigneeCancel}>
                            Cancel
                          </button>`
                      : html`${(() => {
                          const raw = issue.assignee || ""
                          const has = raw.trim().length > 0
                          const text = has ? raw : "Unassigned"
                          const cls = has ? "editable" : "editable muted"
                          return html`<span
                            class=${cls}
                            tabindex="0"
                            role="button"
                            aria-label="Edit assignee"
                            @click=${onAssigneeSpanClick}
                            @keydown=${onAssigneeKeydown}
                            >${text}</span
                          >`
                        })()}`
                    }
                  </div>
                </div>
              </div>
              ${labels_block}
              ${depsSection("Dependencies", issue.dependencies || [])}
              ${depsSection("Dependents", issue.dependents || [])}
            </div>
          </div>
        </div>
      </div>
    `
  }

  function doRender(): void {
    if (!current) {
      renderPlaceholder(current_id ? "Loading…" : "No issue selected")
      return
    }
    render(detailTemplate(current), mount_element)
  }

  /**
   * Create a click handler for the remove button of a dependency row.
   */
  function makeDepRemoveClick(
    did: string,
    title: "Dependencies" | "Dependents",
  ): (ev: Event) => Promise<void> {
    return async (ev: Event): Promise<void> => {
      ev.stopPropagation()
      if (!current || pending) {
        return
      }
      pending = true
      try {
        if (title === "Dependencies") {
          const updated = await sendFn("dep-remove", {
            a: current.id,
            b: did,
            view_id: current.id,
          })
          if (updated && typeof updated === "object") {
            current = updated as IssueDetail
            doRender()
          }
        } else {
          const updated = await sendFn("dep-remove", {
            a: did,
            b: current.id,
            view_id: current.id,
          })
          if (updated && typeof updated === "object") {
            current = updated as IssueDetail
            doRender()
          }
        }
      } catch (err) {
        log("dep-remove failed %o", err)
      } finally {
        pending = false
      }
    }
  }

  /**
   * Create a click handler for the Add button in a dependency section.
   */
  function makeDepAddClick(
    items: DependencyRef[],
    title: "Dependencies" | "Dependents",
  ): (ev: Event) => Promise<void> {
    return async (ev: Event): Promise<void> => {
      if (!current || pending) {
        return
      }
      const btn = ev.currentTarget as HTMLButtonElement
      const input = btn.previousElementSibling as HTMLInputElement | null
      const target = input ? input.value.trim() : ""
      if (!target || target === current.id) {
        showToast("Enter a different issue id")
        return
      }
      const set = new Set((items || []).map(d => d.id))
      if (set.has(target)) {
        showToast("Link already exists")
        return
      }
      pending = true
      if (btn) {
        btn.disabled = true
      }
      if (input) {
        input.disabled = true
      }
      try {
        if (title === "Dependencies") {
          const updated = await sendFn("dep-add", {
            a: current.id,
            b: target,
            view_id: current.id,
          })
          if (updated && typeof updated === "object") {
            current = updated as IssueDetail
            doRender()
          }
        } else {
          const updated = await sendFn("dep-add", {
            a: target,
            b: current.id,
            view_id: current.id,
          })
          if (updated && typeof updated === "object") {
            current = updated as IssueDetail
            doRender()
          }
        }
      } catch (err) {
        log("dep-add failed %o", err)
        showToast("Failed to add dependency", "error")
      } finally {
        pending = false
      }
    }
  }

  function onTitleInputKeydown(ev: KeyboardEvent): void {
    if (ev.key === "Escape") {
      edit_title = false
      doRender()
    } else if (ev.key === "Enter") {
      ev.preventDefault()
      onTitleSave()
    }
  }

  function onDescEditableKeydown(ev: KeyboardEvent): void {
    if (ev.key === "Enter") {
      onDescEdit()
    }
  }

  function onAcceptEditableKeydown(ev: KeyboardEvent): void {
    if (ev.key === "Enter") {
      onAcceptEdit()
    }
  }

  function onNotesEditableKeydown(ev: KeyboardEvent): void {
    if (ev.key === "Enter") {
      onNotesEdit()
    }
  }

  function onDesignEditableKeydown(ev: KeyboardEvent): void {
    if (ev.key === "Enter") {
      onDesignEdit()
    }
  }

  return {
    async load(id: string): Promise<void> {
      if (!id) {
        renderPlaceholder("No issue selected")
        return
      }
      current_id = String(id)
      // Try from store first; show placeholder while waiting for snapshot
      current = null
      refreshFromStore()
      if (!current) {
        renderPlaceholder("Loading…")
      }
      // Render from current (if available) or keep placeholder until push arrives
      pending = false
      comment_text = ""
      comment_pending = false
      doRender()

      // Fetch comments if not already present
      if (current && !(current as IssueDetail & { comments?: Comment[] }).comments) {
        try {
          const comments = await sendFn("get-comments", { id: current_id })
          if (Array.isArray(comments) && current && current_id === id) {
            ;(current as IssueDetail & { comments?: Comment[] }).comments = comments
            doRender()
          }
        } catch (err) {
          log("fetch comments failed %s %o", id, err)
        }
      }
    },
    clear(): void {
      renderPlaceholder("Select an issue to view details")
    },
    destroy(): void {
      mount_element.replaceChildren()
      if (delete_dialog && delete_dialog.parentNode) {
        delete_dialog.parentNode.removeChild(delete_dialog)
        delete_dialog = null
      }
    },
  }
}
