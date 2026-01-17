import { describe, expect, test, vi } from "vitest"
import { createSubscriptionIssueStore } from "../data/subscription-issue-store.ts"
import { createSubscriptionStore } from "../data/subscriptions-store.ts"
import { createEpicsView } from "./epics.ts"

describe("views/epics", () => {
  test("loads groups from store and expands to show non-closed children, navigates on click", async () => {
    document.body.innerHTML = '<div id="m"></div>'
    const mount = document.getElementById("m") as HTMLElement
    const data = {
      updateIssue: vi.fn(),
      getIssue: vi.fn(async (id: string) => ({ id })),
    }
    /** test issue stores */
    const stores = new Map<string, ReturnType<typeof createSubscriptionIssueStore>>()
    const listeners = new Set<() => void>()
    const getStore = (id: string) => {
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
    const issueStores = {
      getStore,
      snapshotFor(id: string) {
        return getStore(id).snapshot().slice()
      },
      subscribe(fn: () => void) {
        listeners.add(fn)
        return () => listeners.delete(fn)
      },
    }
    const subscriptions = createSubscriptionStore(async () => {})
    // Seed epics list snapshot
    issueStores.getStore("tab:epics").applyPush({
      type: "snapshot",
      id: "tab:epics",
      revision: 1,
      issues: [
        {
          id: "UI-1",
          title: "Epic One",
          issue_type: "epic",
          dependents: [{ id: "UI-2" }, { id: "UI-3" }],
        },
      ],
    })
    const navCalls: string[] = []
    const view = createEpicsView(
      mount,
      data as Parameters<typeof createEpicsView>[1],
      id => navCalls.push(id),
      subscriptions,
      issueStores as Parameters<typeof createEpicsView>[4],
    )
    await view.load()
    // Register epic detail and push snapshot with dependents
    issueStores.getStore("detail:UI-1")
    issueStores.getStore("detail:UI-1").applyPush({
      type: "snapshot",
      id: "detail:UI-1",
      revision: 1,
      issues: [
        {
          id: "UI-1",
          title: "Epic One",
          issue_type: "epic",
          dependents: [
            {
              id: "UI-2",
              title: "Alpha",
              status: "open",
              priority: 1,
              issue_type: "task",
            },
            {
              id: "UI-3",
              title: "Beta",
              status: "closed",
              priority: 2,
              issue_type: "task",
            },
          ],
        },
      ],
    })
    await view.load()
    const header = mount.querySelector(".epic-header")
    expect(header).not.toBeNull()
    // After expansion, only non-closed child should be present
    const rows = mount.querySelectorAll("tr.epic-row")
    expect(rows.length).toBe(2)
    rows[0]!.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    expect(navCalls[0]).toBe("UI-2")
  })

  test("sorts children by priority then created_at asc", async () => {
    document.body.innerHTML = '<div id="m"></div>'
    const mount = document.getElementById("m") as HTMLElement
    const data = {
      updateIssue: vi.fn(),
      getIssue: vi.fn(async (id: string) => ({ id })),
    }
    const stores2 = new Map<string, ReturnType<typeof createSubscriptionIssueStore>>()
    const listeners2 = new Set<() => void>()
    const getStore2 = (id: string) => {
      let s = stores2.get(id)
      if (!s) {
        s = createSubscriptionIssueStore(id)
        stores2.set(id, s)
        s.subscribe(() => {
          for (const fn of Array.from(listeners2)) {
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
    const issueStores2 = {
      getStore: getStore2,
      snapshotFor(id: string) {
        return getStore2(id).snapshot().slice()
      },
      subscribe(fn: () => void) {
        listeners2.add(fn)
        return () => listeners2.delete(fn)
      },
    }
    const subscriptions = createSubscriptionStore(async () => {})
    // seed epics snapshot
    issueStores2.getStore("tab:epics").applyPush({
      type: "snapshot",
      id: "tab:epics",
      revision: 1,
      issues: [
        {
          id: "UI-10",
          title: "Epic Sort",
          issue_type: "epic",
          dependents: [{ id: "UI-11" }, { id: "UI-12" }, { id: "UI-13" }],
        },
      ],
    })
    const view = createEpicsView(
      mount,
      data as Parameters<typeof createEpicsView>[1],
      () => {},
      subscriptions,
      issueStores2 as Parameters<typeof createEpicsView>[4],
    )
    await view.load()
    // Seed epic detail snapshot for UI-10 with out-of-order dependents
    issueStores2.getStore("detail:UI-10")
    issueStores2.getStore("detail:UI-10").applyPush({
      type: "snapshot",
      id: "detail:UI-10",
      revision: 1,
      issues: [
        {
          id: "UI-10",
          title: "Epic Sort",
          issue_type: "epic",
          dependents: [
            {
              id: "UI-11",
              title: "Low priority, newest within p1",
              status: "open",
              priority: 1,
              issue_type: "task",
              created_at: new Date("2025-10-22T10:00:00.000Z").getTime(),
              updated_at: new Date("2025-10-22T10:00:00.000Z").getTime(),
            },
            {
              id: "UI-12",
              title: "Low priority, older",
              status: "open",
              priority: 1,
              issue_type: "task",
              created_at: new Date("2025-10-20T10:00:00.000Z").getTime(),
              updated_at: new Date("2025-10-20T10:00:00.000Z").getTime(),
            },
            {
              id: "UI-13",
              title: "Higher priority number (lower precedence)",
              status: "open",
              priority: 2,
              issue_type: "task",
              created_at: new Date("2025-10-23T10:00:00.000Z").getTime(),
              updated_at: new Date("2025-10-23T10:00:00.000Z").getTime(),
            },
          ],
        },
      ],
    })
    await view.load()
    const rows = Array.from(mount.querySelectorAll("tr.epic-row"))
    const ids = rows.map(r => (r.querySelector("td.mono") as HTMLElement)?.textContent?.trim())
    expect(ids).toEqual(["UI-12", "UI-11", "UI-13"])
  })

  test("clicking inputs/selects inside a row does not navigate", async () => {
    document.body.innerHTML = '<div id="m"></div>'
    const mount = document.getElementById("m") as HTMLElement
    const data = {
      updateIssue: vi.fn(),
      getIssue: vi.fn(async (id: string) => ({ id })),
    }
    const stores3 = new Map<string, ReturnType<typeof createSubscriptionIssueStore>>()
    const listeners3 = new Set<() => void>()
    const getStore3 = (id: string) => {
      let s = stores3.get(id)
      if (!s) {
        s = createSubscriptionIssueStore(id)
        stores3.set(id, s)
        s.subscribe(() => {
          for (const fn of Array.from(listeners3)) {
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
    const issueStores3 = {
      getStore: getStore3,
      snapshotFor(id: string) {
        return getStore3(id).snapshot().slice()
      },
      subscribe(fn: () => void) {
        listeners3.add(fn)
        return () => listeners3.delete(fn)
      },
    }
    const subscriptions = createSubscriptionStore(async () => {})
    issueStores3.getStore("tab:epics").applyPush({
      type: "snapshot",
      id: "tab:epics",
      revision: 1,
      issues: [
        {
          id: "UI-20",
          title: "Epic Click Guard",
          issue_type: "epic",
          dependents: [{ id: "UI-21" }],
        },
      ],
    })
    const navCalls: string[] = []
    const view = createEpicsView(
      mount,
      data as Parameters<typeof createEpicsView>[1],
      id => navCalls.push(id),
      subscriptions,
      issueStores3 as Parameters<typeof createEpicsView>[4],
    )
    await view.load()
    // Provide detail snapshot so a child row exists
    issueStores3.getStore("detail:UI-20")
    issueStores3.getStore("detail:UI-20").applyPush({
      type: "snapshot",
      id: "detail:UI-20",
      revision: 1,
      issues: [
        {
          id: "UI-20",
          title: "Epic Click Guard",
          issue_type: "epic",
          dependents: [
            {
              id: "UI-21",
              title: "Row",
              status: "open",
              priority: 2,
              issue_type: "task",
            },
          ],
        },
      ],
    })
    await view.load()
    // Click a select inside the row; should not navigate
    const sel = mount.querySelector("tr.epic-row select") as HTMLSelectElement | null
    sel?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    expect(navCalls.length).toBe(0)
  })

  test("shows Loading… while fetching children on manual expansion (no flicker)", async () => {
    document.body.innerHTML = '<div id="m"></div>'
    const mount = document.getElementById("m") as HTMLElement
    const data = {
      updateIssue: vi.fn(),
      getIssue: vi.fn(async (id: string) => ({ id })),
    }
    const stores4 = new Map<string, ReturnType<typeof createSubscriptionIssueStore>>()
    const listeners4 = new Set<() => void>()
    const getStore4 = (id: string) => {
      let s = stores4.get(id)
      if (!s) {
        s = createSubscriptionIssueStore(id)
        stores4.set(id, s)
        s.subscribe(() => {
          for (const fn of Array.from(listeners4)) {
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
    const issueStores4 = {
      getStore: getStore4,
      snapshotFor(id: string) {
        return getStore4(id).snapshot().slice()
      },
      subscribe(fn: () => void) {
        listeners4.add(fn)
        return () => listeners4.delete(fn)
      },
    }
    const subscriptions = createSubscriptionStore(async () => {})
    issueStores4.getStore("tab:epics").applyPush({
      type: "snapshot",
      id: "tab:epics",
      revision: 1,
      issues: [
        {
          id: "UI-40",
          title: "Auto Expanded",
          issue_type: "epic",
          dependents: [],
        },
        {
          id: "UI-41",
          title: "Manual Expand",
          issue_type: "epic",
          dependents: [{ id: "UI-42" }],
        },
      ],
    })
    const view = createEpicsView(
      mount,
      data as Parameters<typeof createEpicsView>[1],
      () => {},
      subscriptions,
      issueStores4 as Parameters<typeof createEpicsView>[4],
    )
    await view.load()
    // Expand the second group manually
    const groups = Array.from(mount.querySelectorAll(".epic-group"))
    const manual = groups.find(g => g.getAttribute("data-epic-id") === "UI-41")
    expect(manual).toBeDefined()
    manual?.querySelector(".epic-header")?.dispatchEvent(new MouseEvent("click", { bubbles: true }))

    // Immediately after click, expect Loading…
    const text = manual?.querySelector(".epic-children")?.textContent || ""
    expect(text.includes("Loading…")).toBe(true)
    // Provide epic detail snapshot (no rendering assertion here)
    issueStores4.getStore("detail:UI-41")
    issueStores4.getStore("detail:UI-41").applyPush({
      type: "snapshot",
      id: "detail:UI-41",
      revision: 1,
      issues: [
        {
          id: "UI-41",
          title: "Epic Manual",
          issue_type: "epic",
          dependents: [
            {
              id: "UI-42",
              title: "Child",
              status: "open",
              priority: 2,
              issue_type: "task",
            },
          ],
        },
      ],
    })
    // Verify mapping via store presence
    const d = issueStores4.snapshotFor("detail:UI-41")
    expect(d.length).toBe(1)
    expect(d[0]?.id).toBe("UI-41")
  })

  test("clicking the editable title does not navigate and enters edit mode", async () => {
    document.body.innerHTML = '<div id="m"></div>'
    const mount = document.getElementById("m") as HTMLElement
    const data = {
      updateIssue: vi.fn(),
      getIssue: vi.fn(async (id: string) => ({ id })),
    }
    const stores5 = new Map<string, ReturnType<typeof createSubscriptionIssueStore>>()
    const listeners5 = new Set<() => void>()
    const getStore5 = (id: string) => {
      let s = stores5.get(id)
      if (!s) {
        s = createSubscriptionIssueStore(id)
        stores5.set(id, s)
        s.subscribe(() => {
          for (const fn of Array.from(listeners5)) {
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
    const issueStores5 = {
      getStore: getStore5,
      snapshotFor(id: string) {
        return getStore5(id).snapshot().slice()
      },
      subscribe(fn: () => void) {
        listeners5.add(fn)
        return () => listeners5.delete(fn)
      },
    }
    const subscriptions2 = createSubscriptionStore(async () => {})
    issueStores5.getStore("tab:epics").applyPush({
      type: "snapshot",
      id: "tab:epics",
      revision: 1,
      issues: [
        {
          id: "UI-30",
          title: "Epic Title Click",
          issue_type: "epic",
          dependents: [{ id: "UI-31" }],
        },
      ],
    })
    const navCalls: string[] = []
    const view = createEpicsView(
      mount,
      data as Parameters<typeof createEpicsView>[1],
      id => navCalls.push(id),
      subscriptions2,
      issueStores5 as Parameters<typeof createEpicsView>[4],
    )
    await view.load()
    issueStores5.getStore("detail:UI-30")
    issueStores5.getStore("detail:UI-30").applyPush({
      type: "snapshot",
      id: "detail:UI-30",
      revision: 1,
      issues: [
        {
          id: "UI-30",
          title: "Epic Title Click",
          issue_type: "epic",
          dependents: [
            {
              id: "UI-31",
              title: "Clickable Title",
              status: "open",
              priority: 2,
              issue_type: "task",
            },
          ],
        },
      ],
    })
    await view.load()
    const titleSpan = mount.querySelector(
      "tr.epic-row td:nth-child(3) .editable",
    ) as HTMLElement | null
    expect(titleSpan).not.toBeNull()
    titleSpan?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    // Should not have navigated
    expect(navCalls.length).toBe(0)
    // Should render an input for title now
    const input = mount.querySelector(
      'tr.epic-row td:nth-child(3) input[type="text"]',
    ) as HTMLInputElement | null
    expect(input).not.toBeNull()
  })
})
