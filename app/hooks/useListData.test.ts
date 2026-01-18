/**
 * Tests for the useListData and useFilterActions hooks.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"

import type { IssueLite } from "../../types/issues.js"
import type { ListSelectors, BoardColumnMode } from "../data/list-selectors.js"
import { useAppStore } from "../store/index.js"
import { setListSelectorsInstance, clearListSelectorsInstance } from "./useListSelectors.js"
import { useListData, useFilterActions } from "./useListData.js"

/**
 * Create a mock issue for testing.
 */
function createMockIssue(id: string, overrides: Partial<IssueLite> = {}): IssueLite {
  return {
    id,
    title: `Issue ${id}`,
    status: "open",
    issue_type: "bug",
    priority: 2,
    created_at: Date.now(),
    updated_at: Date.now(),
    ...overrides,
  }
}

/**
 * Stable empty array for consistent references.
 */
const EMPTY_ARRAY: IssueLite[] = Object.freeze([]) as unknown as IssueLite[]

/**
 * Create a mock list selectors instance for testing.
 */
function createMockSelectors(): ListSelectors & {
  _listeners: Set<() => void>
  _setIssues: (client_id: string, data: IssueLite[]) => void
} {
  const listeners = new Set<() => void>()
  const issues = new Map<string, IssueLite[]>()

  return {
    _listeners: listeners,
    selectIssuesFor: vi.fn((client_id: string) => {
      return issues.get(client_id) || EMPTY_ARRAY
    }),
    selectBoardColumn: vi.fn((_client_id: string, _mode: BoardColumnMode) => {
      return EMPTY_ARRAY
    }),
    selectEpicChildren: vi.fn((_epic_id: string) => {
      return EMPTY_ARRAY
    }),
    subscribe: vi.fn((fn: () => void) => {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    }),
    _setIssues: (client_id: string, data: IssueLite[]) => {
      issues.set(client_id, data)
    },
  }
}

describe("useListData", () => {
  beforeEach(() => {
    clearListSelectorsInstance()
    // Reset store to defaults
    useAppStore.setState({
      filters: { status: "all", search: "", type: "" },
    })
  })

  afterEach(() => {
    clearListSelectorsInstance()
  })

  it("returns empty issues when selectors are not set", () => {
    const { result } = renderHook(() => useListData())
    expect(result.current.issues).toEqual([])
    expect(result.current.totalCount).toBe(0)
    expect(result.current.filteredCount).toBe(0)
    expect(result.current.hasActiveFilters).toBe(false)
  })

  it("returns issues from selector with default client ID", () => {
    const selectors = createMockSelectors()
    const issues = [createMockIssue("1"), createMockIssue("2")]
    selectors._setIssues("tab:issues", issues)
    setListSelectorsInstance(selectors)

    const { result } = renderHook(() => useListData())
    expect(result.current.issues).toEqual(issues)
    expect(result.current.totalCount).toBe(2)
    expect(result.current.filteredCount).toBe(2)
    expect(selectors.selectIssuesFor).toHaveBeenCalledWith("tab:issues")
  })

  it("returns issues with custom client ID", () => {
    const selectors = createMockSelectors()
    const issues = [createMockIssue("1")]
    selectors._setIssues("custom:list", issues)
    setListSelectorsInstance(selectors)

    const { result } = renderHook(() => useListData("custom:list"))
    expect(result.current.issues).toEqual(issues)
    expect(selectors.selectIssuesFor).toHaveBeenCalledWith("custom:list")
  })

  describe("status filtering", () => {
    it("filters by status when set", () => {
      const selectors = createMockSelectors()
      const issues = [
        createMockIssue("1", { status: "open" }),
        createMockIssue("2", { status: "closed" }),
        createMockIssue("3", { status: "in_progress" }),
      ]
      selectors._setIssues("tab:issues", issues)
      setListSelectorsInstance(selectors)

      // Set status filter to "open"
      act(() => {
        useAppStore.getState().setFilters({ status: "open" })
      })

      const { result } = renderHook(() => useListData())
      expect(result.current.issues.length).toBe(1)
      expect(result.current.issues[0]?.id).toBe("1")
      expect(result.current.hasActiveFilters).toBe(true)
      expect(result.current.totalCount).toBe(3)
      expect(result.current.filteredCount).toBe(1)
    })

    it("shows all issues when status is 'all'", () => {
      const selectors = createMockSelectors()
      const issues = [
        createMockIssue("1", { status: "open" }),
        createMockIssue("2", { status: "closed" }),
      ]
      selectors._setIssues("tab:issues", issues)
      setListSelectorsInstance(selectors)

      useAppStore.setState({ filters: { status: "all", search: "", type: "" } })

      const { result } = renderHook(() => useListData())
      expect(result.current.issues.length).toBe(2)
      expect(result.current.hasActiveFilters).toBe(false)
    })

    it("does not filter when status is 'ready'", () => {
      const selectors = createMockSelectors()
      const issues = [
        createMockIssue("1", { status: "open" }),
        createMockIssue("2", { status: "closed" }),
      ]
      selectors._setIssues("tab:issues", issues)
      setListSelectorsInstance(selectors)

      act(() => {
        useAppStore.getState().setFilters({ status: "ready" })
      })

      const { result } = renderHook(() => useListData())
      // "ready" is a special UI state, not filtered by status field
      expect(result.current.issues.length).toBe(2)
    })
  })

  describe("search filtering", () => {
    it("filters by search text in title", () => {
      const selectors = createMockSelectors()
      const issues = [
        createMockIssue("abc-1", { title: "Fix login bug" }),
        createMockIssue("abc-2", { title: "Add logout feature" }),
        createMockIssue("abc-3", { title: "Update dashboard" }),
      ]
      selectors._setIssues("tab:issues", issues)
      setListSelectorsInstance(selectors)

      act(() => {
        useAppStore.getState().setFilters({ search: "log" })
      })

      const { result } = renderHook(() => useListData())
      expect(result.current.issues.length).toBe(2)
      expect(result.current.hasActiveFilters).toBe(true)
    })

    it("filters by search text in id", () => {
      const selectors = createMockSelectors()
      const issues = [
        createMockIssue("bug-123", { title: "First" }),
        createMockIssue("feat-456", { title: "Second" }),
      ]
      selectors._setIssues("tab:issues", issues)
      setListSelectorsInstance(selectors)

      act(() => {
        useAppStore.getState().setFilters({ search: "bug" })
      })

      const { result } = renderHook(() => useListData())
      expect(result.current.issues.length).toBe(1)
      expect(result.current.issues[0]?.id).toBe("bug-123")
    })

    it("search is case insensitive", () => {
      const selectors = createMockSelectors()
      const issues = [
        createMockIssue("1", { title: "Fix BUG" }),
        createMockIssue("2", { title: "other" }),
      ]
      selectors._setIssues("tab:issues", issues)
      setListSelectorsInstance(selectors)

      act(() => {
        useAppStore.getState().setFilters({ search: "bug" })
      })

      const { result } = renderHook(() => useListData())
      expect(result.current.issues.length).toBe(1)
    })
  })

  describe("type filtering", () => {
    it("filters by issue type", () => {
      const selectors = createMockSelectors()
      const issues = [
        createMockIssue("1", { issue_type: "bug" }),
        createMockIssue("2", { issue_type: "feature" }),
        createMockIssue("3", { issue_type: "bug" }),
      ]
      selectors._setIssues("tab:issues", issues)
      setListSelectorsInstance(selectors)

      act(() => {
        useAppStore.getState().setFilters({ type: "bug" })
      })

      const { result } = renderHook(() => useListData())
      expect(result.current.issues.length).toBe(2)
      expect(result.current.hasActiveFilters).toBe(true)
    })
  })

  describe("combined filtering", () => {
    it("applies all filters together", () => {
      const selectors = createMockSelectors()
      const issues = [
        createMockIssue("1", { status: "open", issue_type: "bug", title: "Login bug" }),
        createMockIssue("2", { status: "open", issue_type: "feature", title: "Login feature" }),
        createMockIssue("3", { status: "closed", issue_type: "bug", title: "Login fix" }),
        createMockIssue("4", { status: "open", issue_type: "bug", title: "Dashboard bug" }),
      ]
      selectors._setIssues("tab:issues", issues)
      setListSelectorsInstance(selectors)

      act(() => {
        useAppStore.getState().setFilters({ status: "open", type: "bug", search: "login" })
      })

      const { result } = renderHook(() => useListData())
      expect(result.current.issues.length).toBe(1)
      expect(result.current.issues[0]?.id).toBe("1")
    })
  })

  describe("sorting", () => {
    it("sorts closed issues by closed_at descending", () => {
      const selectors = createMockSelectors()
      const now = Date.now()
      const issues = [
        createMockIssue("1", { status: "closed", closed_at: now - 1000 }),
        createMockIssue("2", { status: "closed", closed_at: now }),
        createMockIssue("3", { status: "closed", closed_at: now - 2000 }),
      ]
      selectors._setIssues("tab:issues", issues)
      setListSelectorsInstance(selectors)

      act(() => {
        useAppStore.getState().setFilters({ status: "closed" })
      })

      const { result } = renderHook(() => useListData())
      expect(result.current.issues.length).toBe(3)
      // Should be sorted by closed_at desc: 2, 1, 3
      expect(result.current.issues[0]?.id).toBe("2")
      expect(result.current.issues[1]?.id).toBe("1")
      expect(result.current.issues[2]?.id).toBe("3")
    })
  })

  describe("reactive updates", () => {
    it("re-renders when filter state changes", () => {
      const selectors = createMockSelectors()
      const issues = [
        createMockIssue("1", { status: "open" }),
        createMockIssue("2", { status: "closed" }),
      ]
      selectors._setIssues("tab:issues", issues)
      setListSelectorsInstance(selectors)

      const { result, rerender } = renderHook(() => useListData())
      expect(result.current.issues.length).toBe(2)

      act(() => {
        useAppStore.getState().setFilters({ status: "open" })
      })
      rerender()

      expect(result.current.issues.length).toBe(1)
    })

    it("re-renders when selector data changes", () => {
      const selectors = createMockSelectors()
      const issues1 = [createMockIssue("1")]
      selectors._setIssues("tab:issues", issues1)
      setListSelectorsInstance(selectors)

      const { result, rerender } = renderHook(() => useListData())
      expect(result.current.issues.length).toBe(1)

      // Update data and notify
      const issues2 = [createMockIssue("1"), createMockIssue("2")]
      selectors._setIssues("tab:issues", issues2)
      act(() => {
        for (const listener of selectors._listeners) {
          listener()
        }
      })
      rerender()

      expect(result.current.issues.length).toBe(2)
    })
  })
})

describe("useFilterActions", () => {
  beforeEach(() => {
    useAppStore.setState({
      filters: { status: "all", search: "", type: "" },
    })
  })

  it("setStatusFilter updates status", () => {
    const { result } = renderHook(() => useFilterActions())

    act(() => {
      result.current.setStatusFilter("open")
    })

    expect(useAppStore.getState().filters.status).toBe("open")
  })

  it("setTypeFilter updates type", () => {
    const { result } = renderHook(() => useFilterActions())

    act(() => {
      result.current.setTypeFilter("bug")
    })

    expect(useAppStore.getState().filters.type).toBe("bug")
  })

  it("setSearchText updates search", () => {
    const { result } = renderHook(() => useFilterActions())

    act(() => {
      result.current.setSearchText("login")
    })

    expect(useAppStore.getState().filters.search).toBe("login")
  })

  it("clearFilters resets all filters", () => {
    useAppStore.setState({
      filters: { status: "open", search: "test", type: "bug" },
    })

    const { result } = renderHook(() => useFilterActions())

    act(() => {
      result.current.clearFilters()
    })

    const filters = useAppStore.getState().filters
    expect(filters.status).toBe("all")
    expect(filters.search).toBe("")
    expect(filters.type).toBe("")
  })

  it("toggleStatus toggles status on", () => {
    const { result } = renderHook(() => useFilterActions())

    act(() => {
      result.current.toggleStatus("open")
    })

    expect(useAppStore.getState().filters.status).toBe("open")
  })

  it("toggleStatus toggles status off", () => {
    useAppStore.setState({
      filters: { status: "open", search: "", type: "" },
    })

    const { result } = renderHook(() => useFilterActions())

    act(() => {
      result.current.toggleStatus("open")
    })

    expect(useAppStore.getState().filters.status).toBe("all")
  })
})
