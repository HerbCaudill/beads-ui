/**
 * Tests for the useListSelectors hook.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"

import type { IssueLite } from "../../types/issues.js"
import type { ListSelectors, BoardColumnMode } from "../data/list-selectors.js"
import {
  setListSelectorsInstance,
  getListSelectorsInstance,
  clearListSelectorsInstance,
  useIssuesFor,
  useBoardColumn,
  useEpicChildren,
  useListSelectorsAvailable,
} from "./useListSelectors.js"

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
 * Cast is required because ListSelectors interface returns mutable arrays.
 */
const EMPTY_ARRAY: IssueLite[] = Object.freeze([]) as unknown as IssueLite[]

/**
 * Create a mock list selectors instance for testing.
 */
function createMockSelectors(): ListSelectors & { _listeners: Set<() => void> } {
  const listeners = new Set<() => void>()
  const issues = new Map<string, IssueLite[]>()
  const boardColumns = new Map<string, Map<BoardColumnMode, IssueLite[]>>()
  const epicChildren = new Map<string, IssueLite[]>()

  return {
    _listeners: listeners,
    selectIssuesFor: vi.fn((client_id: string) => {
      return issues.get(client_id) || EMPTY_ARRAY
    }),
    selectBoardColumn: vi.fn((client_id: string, mode: BoardColumnMode) => {
      const columns = boardColumns.get(client_id)
      return columns?.get(mode) || EMPTY_ARRAY
    }),
    selectEpicChildren: vi.fn((epic_id: string) => {
      return epicChildren.get(epic_id) || EMPTY_ARRAY
    }),
    subscribe: vi.fn((fn: () => void) => {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    }),
    // Test helpers to set data
    _setIssues: (client_id: string, data: IssueLite[]) => {
      issues.set(client_id, data)
    },
    _setBoardColumn: (client_id: string, mode: BoardColumnMode, data: IssueLite[]) => {
      if (!boardColumns.has(client_id)) {
        boardColumns.set(client_id, new Map())
      }
      boardColumns.get(client_id)!.set(mode, data)
    },
    _setEpicChildren: (epic_id: string, data: IssueLite[]) => {
      epicChildren.set(epic_id, data)
    },
  } as ListSelectors & {
    _listeners: Set<() => void>
    _setIssues: (client_id: string, data: IssueLite[]) => void
    _setBoardColumn: (client_id: string, mode: BoardColumnMode, data: IssueLite[]) => void
    _setEpicChildren: (epic_id: string, data: IssueLite[]) => void
  }
}

describe("useListSelectors", () => {
  beforeEach(() => {
    clearListSelectorsInstance()
  })

  afterEach(() => {
    clearListSelectorsInstance()
  })

  describe("setListSelectorsInstance", () => {
    it("sets the selectors instance", () => {
      const selectors = createMockSelectors()
      setListSelectorsInstance(selectors)
      expect(getListSelectorsInstance()).toBe(selectors)
    })
  })

  describe("clearListSelectorsInstance", () => {
    it("clears the selectors instance", () => {
      const selectors = createMockSelectors()
      setListSelectorsInstance(selectors)
      clearListSelectorsInstance()
      expect(getListSelectorsInstance()).toBe(null)
    })
  })

  describe("useListSelectorsAvailable", () => {
    it("returns false when selectors are not set", () => {
      const { result } = renderHook(() => useListSelectorsAvailable())
      expect(result.current).toBe(false)
    })

    it("returns true when selectors are set", () => {
      const selectors = createMockSelectors()
      setListSelectorsInstance(selectors)

      const { result } = renderHook(() => useListSelectorsAvailable())
      expect(result.current).toBe(true)
    })
  })

  describe("useIssuesFor", () => {
    it("returns empty array when selectors are not set", () => {
      const { result } = renderHook(() => useIssuesFor("tab:issues"))
      expect(result.current).toEqual([])
    })

    it("returns issues from selector", () => {
      const selectors = createMockSelectors() as ReturnType<typeof createMockSelectors> & {
        _setIssues: (client_id: string, data: IssueLite[]) => void
      }
      const issues = [createMockIssue("1"), createMockIssue("2")]
      selectors._setIssues("tab:issues", issues)

      setListSelectorsInstance(selectors)

      const { result } = renderHook(() => useIssuesFor("tab:issues"))
      expect(result.current).toEqual(issues)
      expect(selectors.selectIssuesFor).toHaveBeenCalledWith("tab:issues")
    })

    it("subscribes to selector changes", () => {
      const selectors = createMockSelectors()
      setListSelectorsInstance(selectors)

      renderHook(() => useIssuesFor("tab:issues"))
      expect(selectors.subscribe).toHaveBeenCalled()
    })

    it("updates when data changes", () => {
      const selectors = createMockSelectors() as ReturnType<typeof createMockSelectors> & {
        _setIssues: (client_id: string, data: IssueLite[]) => void
      }
      const issues1 = [createMockIssue("1")]
      const issues2 = [createMockIssue("1"), createMockIssue("2")]

      selectors._setIssues("tab:issues", issues1)
      setListSelectorsInstance(selectors)

      const { result, rerender } = renderHook(() => useIssuesFor("tab:issues"))
      expect(result.current).toEqual(issues1)

      // Simulate data change
      selectors._setIssues("tab:issues", issues2)
      act(() => {
        for (const listener of selectors._listeners) {
          listener()
        }
      })
      rerender()

      expect(result.current).toEqual(issues2)
    })
  })

  describe("useBoardColumn", () => {
    it("returns empty array when selectors are not set", () => {
      const { result } = renderHook(() => useBoardColumn("tab:board:ready", "ready"))
      expect(result.current).toEqual([])
    })

    it("returns issues from selector for each mode", () => {
      const selectors = createMockSelectors() as ReturnType<typeof createMockSelectors> & {
        _setBoardColumn: (client_id: string, mode: BoardColumnMode, data: IssueLite[]) => void
      }
      const readyIssues = [createMockIssue("r1")]
      const blockedIssues = [createMockIssue("b1")]
      const inProgressIssues = [createMockIssue("ip1")]
      const closedIssues = [createMockIssue("c1")]

      selectors._setBoardColumn("tab:board:ready", "ready", readyIssues)
      selectors._setBoardColumn("tab:board:blocked", "blocked", blockedIssues)
      selectors._setBoardColumn("tab:board:in-progress", "in_progress", inProgressIssues)
      selectors._setBoardColumn("tab:board:closed", "closed", closedIssues)

      setListSelectorsInstance(selectors)

      const { result: readyResult } = renderHook(() => useBoardColumn("tab:board:ready", "ready"))
      expect(readyResult.current).toEqual(readyIssues)
      expect(selectors.selectBoardColumn).toHaveBeenCalledWith("tab:board:ready", "ready")

      const { result: blockedResult } = renderHook(() =>
        useBoardColumn("tab:board:blocked", "blocked"),
      )
      expect(blockedResult.current).toEqual(blockedIssues)

      const { result: inProgressResult } = renderHook(() =>
        useBoardColumn("tab:board:in-progress", "in_progress"),
      )
      expect(inProgressResult.current).toEqual(inProgressIssues)

      const { result: closedResult } = renderHook(() =>
        useBoardColumn("tab:board:closed", "closed"),
      )
      expect(closedResult.current).toEqual(closedIssues)
    })

    it("subscribes to selector changes", () => {
      const selectors = createMockSelectors()
      setListSelectorsInstance(selectors)

      renderHook(() => useBoardColumn("tab:board:ready", "ready"))
      expect(selectors.subscribe).toHaveBeenCalled()
    })
  })

  describe("useEpicChildren", () => {
    it("returns empty array when selectors are not set", () => {
      const { result } = renderHook(() => useEpicChildren("epic-1"))
      expect(result.current).toEqual([])
    })

    it("returns children from selector", () => {
      const selectors = createMockSelectors() as ReturnType<typeof createMockSelectors> & {
        _setEpicChildren: (epic_id: string, data: IssueLite[]) => void
      }
      const children = [createMockIssue("child-1"), createMockIssue("child-2")]
      selectors._setEpicChildren("epic-1", children)

      setListSelectorsInstance(selectors)

      const { result } = renderHook(() => useEpicChildren("epic-1"))
      expect(result.current).toEqual(children)
      expect(selectors.selectEpicChildren).toHaveBeenCalledWith("epic-1")
    })

    it("subscribes to selector changes", () => {
      const selectors = createMockSelectors()
      setListSelectorsInstance(selectors)

      renderHook(() => useEpicChildren("epic-1"))
      expect(selectors.subscribe).toHaveBeenCalled()
    })

    it("updates when data changes", () => {
      const selectors = createMockSelectors() as ReturnType<typeof createMockSelectors> & {
        _setEpicChildren: (epic_id: string, data: IssueLite[]) => void
      }
      const children1 = [createMockIssue("child-1")]
      const children2 = [createMockIssue("child-1"), createMockIssue("child-2")]

      selectors._setEpicChildren("epic-1", children1)
      setListSelectorsInstance(selectors)

      const { result, rerender } = renderHook(() => useEpicChildren("epic-1"))
      expect(result.current).toEqual(children1)

      // Simulate data change
      selectors._setEpicChildren("epic-1", children2)
      act(() => {
        for (const listener of selectors._listeners) {
          listener()
        }
      })
      rerender()

      expect(result.current).toEqual(children2)
    })
  })
})
