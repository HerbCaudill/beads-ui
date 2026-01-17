import { describe, expect, test, vi } from "vitest"
import { createSubscriptionIssueStore } from "../data/subscription-issue-store.js"
import { createListView } from "./list.js"
import type { IssueStores } from "../data/list-selectors.js"
import type { Issue } from "../../types/issues.js"
import type { SnapshotMsg, UpsertMsg } from "../../types/subscription-issue-store.js"

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

describe("views/list inline edits", () => {
  test("priority select dispatches update and refreshes row", async () => {
    document.body.innerHTML = '<aside id="mount" class="panel"></aside>'
    const mount = document.getElementById("mount") as HTMLElement

    const initial = [
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

    const spy = { calls: [] as Array<{ type: string; payload: unknown }> }
    let current = [...initial]

    const issueStores = createTestIssueStores()

    const send = vi.fn(async (type: string, payload?: unknown) => {
      spy.calls.push({ type, payload })
      // no list-issues requests in push-only mode
      if (type === "update-priority") {
        const id = (payload as { id: string }).id
        const idx = current.findIndex(x => x.id === id)
        if (idx >= 0) {
          // simulate server-side update, then push an upsert to the store
          const updated = { ...current[idx]!, priority: 4 }
          current[idx] = updated
          issueStores.getStore("tab:issues").applyPush({
            type: "upsert",
            id: "tab:issues",
            revision: 2,
            issue: updated as Issue,
          } as UpsertMsg)
        }
        return {}
      }
      throw new Error("Unexpected")
    })

    issueStores.getStore("tab:issues").applyPush({
      type: "snapshot",
      id: "tab:issues",
      revision: 1,
      issues: current,
    } as SnapshotMsg)

    const view = createListView(
      mount,
      send,
      undefined,
      undefined,
      undefined,
      issueStores as IssueStores,
    )
    await view.load()

    const firstRow = mount.querySelector('tr.issue-row[data-issue-id="UI-1"]') as HTMLElement
    expect(firstRow).toBeTruthy()
    const prio = firstRow.querySelector("select.badge--priority") as HTMLSelectElement
    expect(prio.value).toBe("1")

    // Change to a different priority; handler should call update-priority.
    prio.value = "4"
    prio.dispatchEvent(new Event("change"))

    await Promise.resolve()

    const types = spy.calls.map(c => c.type)
    expect(types).toContain("update-priority")

    const prio2 = mount.querySelector(
      'tr.issue-row[data-issue-id="UI-1"] select.badge--priority',
    ) as HTMLSelectElement
    expect(prio2.value).toBe("4")
  })
})
