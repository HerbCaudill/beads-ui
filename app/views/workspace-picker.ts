import { html, render, TemplateResult } from "lit-html"
import type { Store, WorkspaceInfo } from "../state.js"
import { debug } from "../utils/logging.js"

/**
 * Extract the project name from a workspace path. Returns just the directory
 * name (e.g., 'myproject' from '/home/user/code/myproject').
 *
 * @param workspace_path - Full path to workspace.
 * @returns Project directory name.
 */
function getProjectName(workspace_path: string): string {
  if (!workspace_path) return "Unknown"
  const parts = workspace_path.split("/").filter(Boolean)
  return parts.length > 0 ? parts[parts.length - 1]! : "Unknown"
}

/**
 * View API returned by createWorkspacePicker.
 */
export interface WorkspacePickerAPI {
  destroy: () => void
}

/**
 * Create the workspace picker dropdown component.
 *
 * @param mount_element - Element to render into.
 * @param store - Application state store.
 * @param onWorkspaceChange - Callback when workspace is changed.
 * @returns View API with destroy method.
 */
export function createWorkspacePicker(
  mount_element: HTMLElement,
  store: Store,
  onWorkspaceChange: (workspace_path: string) => Promise<void>,
): WorkspacePickerAPI {
  const log = debug("views:workspace-picker")
  let unsubscribe: (() => void) | null = null
  let is_switching = false

  /**
   * Handle workspace selection change.
   *
   * @param ev - Change event from select element.
   */
  async function onChange(ev: Event): Promise<void> {
    const select = ev.target as HTMLSelectElement
    const new_path = select.value
    const s = store.getState()
    const current_path = s.workspace?.current?.path || ""

    if (new_path && new_path !== current_path) {
      log("switching workspace to %s", new_path)
      is_switching = true
      doRender()
      try {
        await onWorkspaceChange(new_path)
      } catch (err) {
        log("workspace switch failed: %o", err)
      } finally {
        is_switching = false
        doRender()
      }
    }
  }

  function template(): TemplateResult {
    const s = store.getState()
    const current = s.workspace?.current
    const available = s.workspace?.available || []

    // Don't render if no workspaces available
    if (available.length === 0) {
      return html``
    }

    // If only one workspace, show it as a simple label
    if (available.length === 1) {
      const ws = available[0]!
      const name = getProjectName(ws.path)
      return html`
        <div class="workspace-picker workspace-picker--single">
          <span class="workspace-picker__label" title="${ws.path}">${name}</span>
        </div>
      `
    }

    // Multiple workspaces: show dropdown
    const current_path = current?.path || ""
    return html`
      <div class="workspace-picker">
        <select
          class="workspace-picker__select"
          @change=${onChange}
          ?disabled=${is_switching}
          aria-label="Select project workspace"
        >
          ${available.map(
            (ws: WorkspaceInfo) => html`
              <option value="${ws.path}" ?selected=${ws.path === current_path} title="${ws.path}">
                ${getProjectName(ws.path)}
              </option>
            `,
          )}
        </select>
        ${is_switching ?
          html`<span class="workspace-picker__loading" aria-hidden="true"></span>`
        : ""}
      </div>
    `
  }

  function doRender(): void {
    render(template(), mount_element)
  }

  doRender()
  unsubscribe = store.subscribe(() => doRender())

  return {
    destroy(): void {
      if (unsubscribe) {
        unsubscribe()
        unsubscribe = null
      }
      render(html``, mount_element)
    },
  }
}
