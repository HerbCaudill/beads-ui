import { describe, expect, test } from "vitest"
import { createSubscriptionIssueStore } from "../data/subscription-issue-store.js"
import { createListView } from "./list.js"
import type { IssueStores } from "../data/list-selectors.js"
import type { Issue } from "../../types/issues.js"
import type { SnapshotMsg } from "../../types/subscription-issue-store.js"

function createTestIssueStores() {
  const stores = new Map<string, ReturnType<typeof createSubscriptionIssueStore>>()
  const listeners = new Set<() => void>()
  function getStore(id: string) {
    let s = stores.get(id)
    if (!s) {
      s = createSubscriptionIssueStore(id)
      stores.set(id, s)
      s.subscribe(() => {
        for (const fn of Array.from(listeners)) {
          try {
            fn()
          } catch {
            /* ignore */
          }
        }
      })
    }
    return s
  }
  return {
    getStore,
    snapshotFor(id: string) {
      return getStore(id).snapshot().slice()
    },
    subscribe(fn: () => void) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }
}

describe("views/list navigation", () => {
  test("ArrowDown moves focus to same column in next row", async () => {
    document.body.innerHTML = '<aside id="mount" class="panel"></aside>'
    const mount = document.getElementById("mount") as HTMLElement
    const issues = [
      {
        id: "UI-1",
        title: "One",
        status: "open",
        priority: 1,
        issue_type: "task",
      },
      {
        id: "UI-2",
        title: "Two",
        status: "open",
        priority: 2,
        issue_type: "bug",
      },
      {
        id: "UI-3",
        title: "Three",
        status: "open",
        priority: 3,
        issue_type: "feature",
      },
    ] as Issue[]
    const issueStores = createTestIssueStores()
    issueStores.getStore("tab:issues").applyPush({
      type: "snapshot",
      id: "tab:issues",
      revision: 1,
      issues,
    } as SnapshotMsg)
    const view = createListView(
      mount,
      async () => [],
      undefined,
      undefined,
      undefined,
      issueStores as IssueStores,
    )
    await view.load()

    // Focus Title cell (3rd column) in first row
    const first_title = mount.querySelector(
      "tbody tr.issue-row:nth-child(1) td:nth-child(3) .editable",
    ) as HTMLElement
    first_title.focus()
    expect(document.activeElement).toBe(first_title)

    // Press ArrowDown → expect Title cell in next row to gain focus
    first_title.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }))

    const second_title = mount.querySelector(
      "tbody tr.issue-row:nth-child(2) td:nth-child(3) .editable",
    ) as HTMLElement
    expect(document.activeElement).toBe(second_title)
  })

  test("ArrowUp moves focus to same column in previous row", async () => {
    document.body.innerHTML = '<aside id="mount" class="panel"></aside>'
    const mount = document.getElementById("mount") as HTMLElement
    const issues = [
      {
        id: "UI-1",
        title: "One",
        status: "open",
        priority: 1,
        issue_type: "task",
      },
      {
        id: "UI-2",
        title: "Two",
        status: "open",
        priority: 2,
        issue_type: "bug",
      },
      {
        id: "UI-3",
        title: "Three",
        status: "open",
        priority: 3,
        issue_type: "feature",
      },
    ] as Issue[]
    const issueStores = createTestIssueStores()
    issueStores.getStore("tab:issues").applyPush({
      type: "snapshot",
      id: "tab:issues",
      revision: 1,
      issues,
    } as SnapshotMsg)
    const view = createListView(
      mount,
      async () => [],
      undefined,
      undefined,
      undefined,
      issueStores as IssueStores,
    )
    await view.load()

    const third_title = mount.querySelector(
      "tbody tr.issue-row:nth-child(3) td:nth-child(3) .editable",
    ) as HTMLElement
    third_title.focus()
    third_title.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }))

    const second_title = mount.querySelector(
      "tbody tr.issue-row:nth-child(2) td:nth-child(3) .editable",
    ) as HTMLElement
    expect(document.activeElement).toBe(second_title)
  })

  test("does not intercept inside select controls", async () => {
    document.body.innerHTML = '<aside id="mount" class="panel"></aside>'
    const mount = document.getElementById("mount") as HTMLElement
    const issues = [
      {
        id: "UI-1",
        title: "One",
        status: "open",
        priority: 1,
        issue_type: "task",
      },
      {
        id: "UI-2",
        title: "Two",
        status: "open",
        priority: 2,
        issue_type: "bug",
      },
    ] as Issue[]
    const issueStores = createTestIssueStores()
    issueStores.getStore("tab:issues").applyPush({
      type: "snapshot",
      id: "tab:issues",
      revision: 1,
      issues,
    } as SnapshotMsg)
    const view = createListView(
      mount,
      async () => [],
      undefined,
      undefined,
      undefined,
      issueStores as IssueStores,
    )
    await view.load()

    // Focus Status select (4th column) in first row
    const status_select = mount.querySelector(
      "tbody tr.issue-row:nth-child(1) td:nth-child(4) select",
    ) as HTMLSelectElement
    status_select.focus()
    status_select.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }))

    // Expect focus to remain on the same select (native behavior preserved)
    expect(document.activeElement).toBe(status_select)
  })

  test("preserves column when moving from ID button", async () => {
    document.body.innerHTML = '<aside id="mount" class="panel"></aside>'
    const mount = document.getElementById("mount") as HTMLElement
    const issues = [
      {
        id: "UI-1",
        title: "One",
        status: "open",
        priority: 1,
        issue_type: "task",
      },
      {
        id: "UI-2",
        title: "Two",
        status: "open",
        priority: 2,
        issue_type: "bug",
      },
    ] as Issue[]
    const issueStores = createTestIssueStores()
    issueStores.getStore("tab:issues").applyPush({
      type: "snapshot",
      id: "tab:issues",
      revision: 1,
      issues,
    } as SnapshotMsg)
    const view = createListView(
      mount,
      async () => [],
      undefined,
      undefined,
      undefined,
      issueStores as IssueStores,
    )
    await view.load()

    const id_btn_row1 = mount.querySelector(
      "tbody tr.issue-row:nth-child(1) td:nth-child(1) button",
    ) as HTMLButtonElement
    id_btn_row1.focus()
    id_btn_row1.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }))

    const id_btn_row2 = mount.querySelector(
      "tbody tr.issue-row:nth-child(2) td:nth-child(1) button",
    ) as HTMLButtonElement
    expect(document.activeElement).toBe(id_btn_row2)
  })
})
