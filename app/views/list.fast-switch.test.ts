import { describe, expect, test } from "vitest"
import { createSubscriptionIssueStore } from "../data/subscription-issue-store.js"
import { createListView } from "./list.js"
import type { IssueStores } from "../data/list-selectors.js"
import type { Issue } from "../../types/issues.js"
import type { SnapshotMsg } from "../../types/subscription-issue-store.js"

/**
 * Helper to toggle a filter option in a dropdown.
 */
function toggleFilter(mount: HTMLElement, dropdownIndex: number, optionText: string) {
  const dropdowns = mount.querySelectorAll(".filter-dropdown")
  const dropdown = dropdowns[dropdownIndex]
  if (!dropdown) return
  // Open the dropdown
  const trigger = dropdown.querySelector(".filter-dropdown__trigger") as HTMLButtonElement
  trigger.click()
  // Find and click the checkbox
  const option = Array.from(dropdown.querySelectorAll(".filter-dropdown__option")).find(opt =>
    opt.textContent?.includes(optionText),
  )
  const checkbox = option?.querySelector('input[type="checkbox"]') as HTMLInputElement
  checkbox.click()
}

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

describe("list view — fast filter switches", () => {
  test("ignores out-of-order snapshots and renders from push-only store", async () => {
    document.body.innerHTML = '<aside id="mount" class="panel"></aside>'
    const mount = document.getElementById("mount") as HTMLElement

    const issueStores = createTestIssueStores()
    // Initial empty snapshot for default "all"
    issueStores.getStore("tab:issues").applyPush({
      type: "snapshot",
      id: "tab:issues",
      revision: 1,
      issues: [],
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
    expect(mount.querySelectorAll("tr.issue-row").length).toBe(0)

    // Simulate quick switch: ready -> in_progress while snapshots arrive out-of-order
    toggleFilter(mount, 0, "Ready")
    toggleFilter(mount, 0, "In progress")

    const inProg = [
      {
        id: "P-1",
        title: "prog 1",
        status: "in_progress",
        created_at: 200,
        updated_at: 200,
      },
      {
        id: "P-2",
        title: "prog 2",
        status: "in_progress",
        created_at: 210,
        updated_at: 210,
      },
    ] as Issue[]
    const ready = [
      {
        id: "R-1",
        title: "ready 1",
        status: "open",
        created_at: 100,
        updated_at: 100,
      },
    ] as Issue[]

    // Newer revision first
    issueStores.getStore("tab:issues").applyPush({
      type: "snapshot",
      id: "tab:issues",
      revision: 3,
      issues: inProg,
    } as SnapshotMsg)
    await Promise.resolve()
    // Stale snapshot second
    issueStores.getStore("tab:issues").applyPush({
      type: "snapshot",
      id: "tab:issues",
      revision: 2,
      issues: ready,
    } as SnapshotMsg)
    await Promise.resolve()

    const snapshot = issueStores.snapshotFor("tab:issues")
    const ids = snapshot.map(it => it.id)
    expect(ids).toEqual(["P-1", "P-2"])

    const rows = Array.from(mount.querySelectorAll("tr.issue-row")).map(
      el => el.getAttribute("data-issue-id") || "",
    )
    expect(rows).toEqual(["P-1", "P-2"])
  })
})
