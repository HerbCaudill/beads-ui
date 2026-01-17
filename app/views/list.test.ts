import { describe, expect, test } from "vitest"
import { createSubscriptionIssueStore } from "../data/subscription-issue-store.js"
import { createListView } from "./list.js"
import type { IssueStores } from "../data/list-selectors.js"
import type { Issue } from "../../types/issues.js"
import type { SnapshotMsg } from "../../types/subscription-issue-store.js"
import type { Store } from "../state.js"

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

/**
 * Check if a filter option is checked in a dropdown.
 */
function isFilterChecked(mount: HTMLElement, dropdownIndex: number, optionText: string): boolean {
  const dropdowns = mount.querySelectorAll(".filter-dropdown")
  const dropdown = dropdowns[dropdownIndex]
  if (!dropdown) return false
  const option = Array.from(dropdown.querySelectorAll(".filter-dropdown__option")).find(opt =>
    opt.textContent?.includes(optionText),
  )
  const checkbox = option?.querySelector('input[type="checkbox"]') as HTMLInputElement
  return checkbox?.checked ?? false
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

describe("views/list", () => {
  test("renders issues from push stores and navigates on row click", async () => {
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
        status: "closed",
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
      hash => {
        window.location.hash = hash
      },
      undefined,
      undefined,
      issueStores as IssueStores,
    )
    await view.load()
    const rows = mount.querySelectorAll("tr.issue-row")
    expect(rows.length).toBe(2)

    // badge present
    const badges = mount.querySelectorAll(".type-badge")
    expect(badges.length).toBeGreaterThanOrEqual(2)

    const first = rows[0] as HTMLElement
    first.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    expect(window.location.hash).toBe("#/issues?issue=UI-1")
  })

  test("filters by status and search", async () => {
    document.body.innerHTML = '<aside id="mount" class="panel"></aside>'
    const mount = document.getElementById("mount") as HTMLElement
    const issues = [
      { id: "UI-1", title: "Alpha", status: "open", priority: 1 },
      { id: "UI-2", title: "Beta", status: "in_progress", priority: 2 },
      { id: "UI-3", title: "Gamma", status: "closed", priority: 3 },
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
    const input = mount.querySelector('input[type="search"]') as HTMLInputElement

    // Filter by status using dropdown checkbox
    toggleFilter(mount, 0, "Open")
    await Promise.resolve()
    expect(mount.querySelectorAll("tr.issue-row").length).toBe(1)

    // Clear status filter and search
    toggleFilter(mount, 0, "Open") // toggle off to show all
    await Promise.resolve()
    input.value = "ga"
    input.dispatchEvent(new Event("input"))
    const visible = Array.from(mount.querySelectorAll("tr.issue-row")).map(el => ({
      id: el.getAttribute("data-issue-id") || "",
      text: el.textContent || "",
    }))
    expect(visible.length).toBe(1)
    expect(visible[0]!.id).toBe("UI-3")
    expect(visible[0]!.text.toLowerCase()).toContain("gamma")
  })

  test("filters by issue type and combines with search", async () => {
    document.body.innerHTML = '<aside id="mount" class="panel"></aside>'
    const mount = document.getElementById("mount") as HTMLElement
    const issues = [
      {
        id: "UI-1",
        title: "Alpha",
        status: "open",
        priority: 1,
        issue_type: "bug",
      },
      {
        id: "UI-2",
        title: "Beta",
        status: "open",
        priority: 2,
        issue_type: "feature",
      },
      {
        id: "UI-3",
        title: "Gamma",
        status: "open",
        priority: 3,
        issue_type: "bug",
      },
      {
        id: "UI-4",
        title: "Delta",
        status: "open",
        priority: 2,
        issue_type: "task",
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

    // Initially shows all
    expect(mount.querySelectorAll("tr.issue-row").length).toBe(4)

    // Select bug using dropdown
    toggleFilter(mount, 1, "Bug")
    await Promise.resolve()
    const bug_only = Array.from(mount.querySelectorAll("tr.issue-row")).map(
      el => el.getAttribute("data-issue-id") || "",
    )
    expect(bug_only).toEqual(["UI-1", "UI-3"])

    // Toggle off bug, toggle on feature
    toggleFilter(mount, 1, "Bug")
    toggleFilter(mount, 1, "Feature")
    await Promise.resolve()
    const feature_only = Array.from(mount.querySelectorAll("tr.issue-row")).map(
      el => el.getAttribute("data-issue-id") || "",
    )
    expect(feature_only).toEqual(["UI-2"])

    // Toggle off feature, toggle on bug, combine with search
    toggleFilter(mount, 1, "Feature")
    toggleFilter(mount, 1, "Bug")
    const input = mount.querySelector('input[type="search"]') as HTMLInputElement
    input.value = "ga"
    input.dispatchEvent(new Event("input"))
    await Promise.resolve()
    const filtered = Array.from(mount.querySelectorAll("tr.issue-row")).map(
      el => el.getAttribute("data-issue-id") || "",
    )
    expect(filtered).toEqual(["UI-3"])
  })

  test("applies type filters after Ready reload", async () => {
    document.body.innerHTML = '<aside id="mount" class="panel"></aside>'
    const mount = document.getElementById("mount") as HTMLElement

    const allIssues = [
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
        issue_type: "feature",
      },
      {
        id: "UI-3",
        title: "Three",
        status: "open",
        priority: 2,
        issue_type: "bug",
      },
    ] as Issue[]
    const readyIssues = [
      {
        id: "UI-2",
        title: "Two",
        status: "open",
        priority: 2,
        issue_type: "feature",
      },
      {
        id: "UI-3",
        title: "Three",
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
      issues: allIssues,
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
    const statusSelect = mount.querySelector("select") as HTMLSelectElement
    statusSelect.value = "ready"
    statusSelect.dispatchEvent(new Event("change"))
    // switch subscription key and apply ready membership
    issueStores.getStore("tab:issues").applyPush({
      type: "snapshot",
      id: "tab:issues",
      revision: 2,
      issues: readyIssues,
    } as SnapshotMsg)
    await view.load()

    // Apply type filter (feature) using dropdown checkbox
    toggleFilter(mount, 1, "Feature")
    await Promise.resolve()

    const rows = Array.from(mount.querySelectorAll("tr.issue-row")).map(
      el => el.getAttribute("data-issue-id") || "",
    )
    expect(rows).toEqual(["UI-2"])

    // No RPC calls expected; derived from stores
  })

  test("initializes type filter from store and reflects in controls", async () => {
    document.body.innerHTML = '<aside id="mount" class="panel"></aside>'
    const mount = document.getElementById("mount") as HTMLElement

    const issues = [
      {
        id: "UI-1",
        title: "Alpha",
        status: "open",
        priority: 1,
        issue_type: "bug",
      },
      {
        id: "UI-2",
        title: "Beta",
        status: "open",
        priority: 2,
        issue_type: "feature",
      },
      {
        id: "UI-3",
        title: "Gamma closed",
        status: "closed",
        priority: 3,
        issue_type: "bug",
      },
    ] as Issue[]

    interface StoreState {
      selected_id: string | null
      filters: { status: string; search: string; type: string }
    }

    const store = {
      state: {
        selected_id: null,
        filters: { status: "all", search: "", type: "bug" },
      } as StoreState,
      subs: [] as ((s: StoreState) => void)[],
      getState() {
        return this.state
      },
      setState(patch: Partial<StoreState>) {
        this.state = {
          ...this.state,
          ...(patch || {}),
          filters: { ...this.state.filters, ...(patch.filters || {}) },
        }
        for (const fn of this.subs) {
          fn(this.state)
        }
      },
      subscribe(fn: (s: StoreState) => void) {
        this.subs.push(fn)
        return () => {
          this.subs = this.subs.filter(f => f !== fn)
        }
      },
    }

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
      store as unknown as Store,
      undefined,
      issueStores as IssueStores,
    )
    await view.load()

    // Only bug issues visible
    const rows = Array.from(mount.querySelectorAll("tr.issue-row")).map(
      el => el.getAttribute("data-issue-id") || "",
    )
    expect(rows).toEqual(["UI-1", "UI-3"])

    // Bug checkbox should be checked in the types dropdown
    expect(isFilterChecked(mount, 1, "Bug")).toBe(true)
  })

  test("ready filter via select composes from push membership", async () => {
    document.body.innerHTML = '<aside id="mount" class="panel"></aside>'
    const mount = document.getElementById("mount") as HTMLElement

    const allIssues = [
      { id: "UI-1", title: "One", status: "open", priority: 1 },
      { id: "UI-2", title: "Two", status: "open", priority: 2 },
    ] as Issue[]
    const readyIssues = [{ id: "UI-2", title: "Two", status: "open", priority: 2 }] as Issue[]

    const issueStores = createTestIssueStores()
    issueStores.getStore("tab:issues").applyPush({
      type: "snapshot",
      id: "tab:issues",
      revision: 1,
      issues: allIssues,
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
    expect(mount.querySelectorAll("tr.issue-row").length).toBe(2)

    const select = mount.querySelector("select") as HTMLSelectElement
    select.value = "ready"
    select.dispatchEvent(new Event("change"))
    issueStores.getStore("tab:issues").applyPush({
      type: "snapshot",
      id: "tab:issues",
      revision: 2,
      issues: readyIssues,
    } as SnapshotMsg)
    await view.load()
    expect(mount.querySelectorAll("tr.issue-row").length).toBe(1)
  })

  test("switching ready → all reloads full list", async () => {
    document.body.innerHTML = '<aside id="mount" class="panel"></aside>'
    const mount = document.getElementById("mount") as HTMLElement

    const allIssues = [
      { id: "UI-1", title: "One", status: "open", priority: 1 },
      { id: "UI-2", title: "Two", status: "closed", priority: 2 },
    ] as Issue[]
    const readyIssues = [{ id: "UI-2", title: "Two", status: "closed", priority: 2 }] as Issue[]

    // No RPC calls are made in push-only mode

    const issueStores = createTestIssueStores()
    issueStores.getStore("tab:issues").applyPush({
      type: "snapshot",
      id: "tab:issues",
      revision: 1,
      issues: allIssues,
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
    expect(mount.querySelectorAll("tr.issue-row").length).toBe(2)

    const select = mount.querySelector("select") as HTMLSelectElement

    // Switch to ready (subscription now maps to ready-issues)
    select.value = "ready"
    select.dispatchEvent(new Event("change"))
    issueStores.getStore("tab:issues").applyPush({
      type: "snapshot",
      id: "tab:issues",
      revision: 2,
      issues: readyIssues,
    } as SnapshotMsg)
    await view.load()
    expect(mount.querySelectorAll("tr.issue-row").length).toBe(1)

    // Switch back to all; view should compose from all-issues membership
    select.value = "all"
    select.dispatchEvent(new Event("change"))
    issueStores.getStore("tab:issues").applyPush({
      type: "snapshot",
      id: "tab:issues",
      revision: 3,
      issues: allIssues,
    } as SnapshotMsg)
    await view.load()
    expect(mount.querySelectorAll("tr.issue-row").length).toBe(2)

    // No RPC calls are expected in push-only model
  })

  test("applies persisted filters from store on initial load", async () => {
    document.body.innerHTML = '<aside id="mount" class="panel"></aside>'
    const mount = document.getElementById("mount") as HTMLElement

    const issues = [
      { id: "UI-1", title: "Alpha", status: "open", priority: 1 },
      { id: "UI-2", title: "Gamma", status: "open", priority: 2 },
      { id: "UI-3", title: "Gamma closed", status: "closed", priority: 3 },
    ] as Issue[]

    interface StoreState {
      selected_id: string | null
      filters: { status: string[]; search: string }
    }

    const store = {
      state: { selected_id: null, filters: { status: ["open"], search: "ga" } } as StoreState,
      subs: [] as ((s: StoreState) => void)[],
      getState() {
        return this.state
      },
      setState(patch: Partial<StoreState>) {
        this.state = {
          ...this.state,
          ...(patch || {}),
          filters: { ...this.state.filters, ...(patch.filters || {}) },
        }
        for (const fn of this.subs) {
          fn(this.state)
        }
      },
      subscribe(fn: (s: StoreState) => void) {
        this.subs.push(fn)
        return () => {
          this.subs = this.subs.filter(f => f !== fn)
        }
      },
    }

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
      store as unknown as Store,
      undefined,
      issueStores as IssueStores,
    )
    await view.load()

    // Expect only UI-2 ("Gamma" open) to be visible
    const items = Array.from(mount.querySelectorAll("tr.issue-row")).map(el => ({
      id: el.getAttribute("data-issue-id") || "",
      text: el.textContent || "",
    }))
    expect(items.length).toBe(1)
    expect(items[0]!.id).toBe("UI-2")

    // Controls reflect persisted filters
    expect(isFilterChecked(mount, 0, "Open")).toBe(true)
    const input = mount.querySelector('input[type="search"]') as HTMLInputElement
    expect(input.value).toBe("ga")
  })

  test("filters by multiple statuses with dropdown checkboxes", async () => {
    document.body.innerHTML = '<aside id="mount" class="panel"></aside>'
    const mount = document.getElementById("mount") as HTMLElement
    const issues = [
      { id: "UI-1", title: "Alpha", status: "open", priority: 1 },
      { id: "UI-2", title: "Beta", status: "in_progress", priority: 2 },
      { id: "UI-3", title: "Gamma", status: "closed", priority: 3 },
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

    // Click Open checkbox to select it
    toggleFilter(mount, 0, "Open")
    await Promise.resolve()

    // Should show only open issues
    let rows = Array.from(mount.querySelectorAll("tr.issue-row")).map(
      el => el.getAttribute("data-issue-id") || "",
    )
    expect(rows).toEqual(["UI-1"])

    // Click In progress checkbox to add it (multi-select)
    toggleFilter(mount, 0, "In progress")
    await Promise.resolve()

    // Should show both open and in_progress
    rows = Array.from(mount.querySelectorAll("tr.issue-row")).map(
      el => el.getAttribute("data-issue-id") || "",
    )
    expect(rows).toEqual(["UI-1", "UI-2"])
  })

  test("filters by multiple types with dropdown checkboxes", async () => {
    document.body.innerHTML = '<aside id="mount" class="panel"></aside>'
    const mount = document.getElementById("mount") as HTMLElement
    const issues = [
      { id: "UI-1", title: "A", status: "open", issue_type: "bug" },
      { id: "UI-2", title: "B", status: "open", issue_type: "feature" },
      { id: "UI-3", title: "C", status: "open", issue_type: "task" },
      { id: "UI-4", title: "D", status: "open", issue_type: "epic" },
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

    // Click Bug checkbox
    toggleFilter(mount, 1, "Bug")
    await Promise.resolve()

    let rows = Array.from(mount.querySelectorAll("tr.issue-row")).map(
      el => el.getAttribute("data-issue-id") || "",
    )
    expect(rows).toEqual(["UI-1"])

    // Click Feature checkbox to add it
    toggleFilter(mount, 1, "Feature")
    await Promise.resolve()

    rows = Array.from(mount.querySelectorAll("tr.issue-row")).map(
      el => el.getAttribute("data-issue-id") || "",
    )
    expect(rows).toEqual(["UI-1", "UI-2"])
  })

  test("deselecting all checkboxes shows all issues", async () => {
    document.body.innerHTML = '<aside id="mount" class="panel"></aside>'
    const mount = document.getElementById("mount") as HTMLElement
    const issues = [
      { id: "UI-1", title: "A", status: "open" },
      { id: "UI-2", title: "B", status: "closed" },
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

    // Initially all shown
    expect(mount.querySelectorAll("tr.issue-row").length).toBe(2)

    // Click Open checkbox to filter
    toggleFilter(mount, 0, "Open")
    await Promise.resolve()
    expect(mount.querySelectorAll("tr.issue-row").length).toBe(1)

    // Click Open checkbox again to deselect - should show all
    toggleFilter(mount, 0, "Open")
    await Promise.resolve()
    expect(mount.querySelectorAll("tr.issue-row").length).toBe(2)
  })
})
