/**
 * Tests for the useIssueStores hook.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Issue, IssueLite } from "../../types/issues.js"
import type { SubscriptionIssueStoresRegistry } from "../data/subscription-issue-stores.js"
import {
  setIssueStoresInstance,
  getIssueStoresInstance,
  clearIssueStoresInstance,
  useIssueStore,
  useIssue,
  useIssueStoresAvailable,
  useIssueStoreLite,
} from "./use-issue-stores.js"
import { renderHook, act } from "@testing-library/react"

/**
 * Create a mock issue for testing.
 */
function createMockIssue(id: string, title: string): Issue {
  return {
    id,
    title,
    status: "open",
    issue_type: "bug",
    priority: 2,
    created_at: Date.now(),
    updated_at: Date.now(),
    dependencies: [],
    labels: [],
    assignee: null,
  }
}

/**
 * Create a mock store for testing.
 */
function createMockStore(id: string, issues: Issue[]) {
  return {
    id,
    snapshot: () => issues,
    getById: (issue_id: string) => issues.find(i => i.id === issue_id),
    subscribe: vi.fn(() => vi.fn()),
    applyPush: vi.fn(),
    size: () => issues.length,
    dispose: vi.fn(),
  }
}

/**
 * Create a mock registry for testing.
 */
function createMockRegistry(): SubscriptionIssueStoresRegistry & { _listeners: Set<() => void> } {
  const stores = new Map<string, ReturnType<typeof createMockStore>>()
  const listeners = new Set<() => void>()

  return {
    _listeners: listeners,
    register: vi.fn((client_id: string) => {
      if (!stores.has(client_id)) {
        stores.set(client_id, createMockStore(client_id, []))
      }
      return () => {}
    }),
    unregister: vi.fn((client_id: string) => {
      stores.delete(client_id)
    }),
    getStore: vi.fn((client_id: string) => stores.get(client_id) || null),
    snapshotFor: vi.fn((client_id: string): IssueLite[] => {
      const store = stores.get(client_id)
      return store ? (store.snapshot() as IssueLite[]) : []
    }),
    subscribe: vi.fn((fn: () => void) => {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    }),
  }
}

describe("use-issue-stores", () => {
  beforeEach(() => {
    clearIssueStoresInstance()
  })

  afterEach(() => {
    clearIssueStoresInstance()
  })

  describe("setIssueStoresInstance", () => {
    it("sets the registry instance", () => {
      const registry = createMockRegistry()
      setIssueStoresInstance(registry)
      expect(getIssueStoresInstance()).toBe(registry)
    })
  })

  describe("clearIssueStoresInstance", () => {
    it("clears the registry instance", () => {
      const registry = createMockRegistry()
      setIssueStoresInstance(registry)
      clearIssueStoresInstance()
      expect(getIssueStoresInstance()).toBe(null)
    })
  })

  describe("useIssueStoresAvailable", () => {
    it("returns false when registry is not set", () => {
      const { result } = renderHook(() => useIssueStoresAvailable())
      expect(result.current).toBe(false)
    })

    it("returns true when registry is set", () => {
      const registry = createMockRegistry()
      setIssueStoresInstance(registry)

      const { result } = renderHook(() => useIssueStoresAvailable())
      expect(result.current).toBe(true)
    })
  })

  describe("useIssueStore", () => {
    it("returns empty array when registry is not set", () => {
      const { result } = renderHook(() => useIssueStore("test"))
      expect(result.current).toEqual([])
    })

    it("returns empty array when store does not exist", () => {
      const registry = createMockRegistry()
      setIssueStoresInstance(registry)

      const { result } = renderHook(() => useIssueStore("nonexistent"))
      expect(result.current).toEqual([])
    })

    it("returns issues from store", () => {
      const registry = createMockRegistry()
      const issues = [createMockIssue("1", "Test Issue")]
      const store = createMockStore("test", issues)

      // Override getStore to return our mock
      vi.mocked(registry.getStore).mockImplementation((id: string) => {
        return id === "test" ? store : null
      })

      setIssueStoresInstance(registry)

      const { result } = renderHook(() => useIssueStore("test"))
      expect(result.current).toEqual(issues)
    })

    it("subscribes to registry changes", () => {
      const registry = createMockRegistry()
      setIssueStoresInstance(registry)

      renderHook(() => useIssueStore("test"))
      expect(registry.subscribe).toHaveBeenCalled()
    })

    it("updates when store changes", () => {
      const registry = createMockRegistry()
      const issues1 = [createMockIssue("1", "First")]
      const issues2 = [createMockIssue("1", "First"), createMockIssue("2", "Second")]

      let current_issues = issues1
      const store = {
        ...createMockStore("test", issues1),
        snapshot: () => current_issues,
      }

      vi.mocked(registry.getStore).mockImplementation((id: string) => {
        return id === "test" ? store : null
      })

      setIssueStoresInstance(registry)

      const { result, rerender } = renderHook(() => useIssueStore("test"))
      expect(result.current).toEqual(issues1)

      // Simulate store change
      current_issues = issues2
      act(() => {
        for (const listener of registry._listeners) {
          listener()
        }
      })
      rerender()

      expect(result.current).toEqual(issues2)
    })
  })

  describe("useIssue", () => {
    it("returns undefined when registry is not set", () => {
      const { result } = renderHook(() => useIssue("test", "issue-1"))
      expect(result.current).toBeUndefined()
    })

    it("returns undefined when store does not exist", () => {
      const registry = createMockRegistry()
      setIssueStoresInstance(registry)

      const { result } = renderHook(() => useIssue("nonexistent", "issue-1"))
      expect(result.current).toBeUndefined()
    })

    it("returns undefined when issue does not exist in store", () => {
      const registry = createMockRegistry()
      const store = createMockStore("test", [])

      vi.mocked(registry.getStore).mockImplementation((id: string) => {
        return id === "test" ? store : null
      })

      setIssueStoresInstance(registry)

      const { result } = renderHook(() => useIssue("test", "nonexistent"))
      expect(result.current).toBeUndefined()
    })

    it("returns issue when found in store", () => {
      const registry = createMockRegistry()
      const issue = createMockIssue("issue-1", "Test Issue")
      const store = createMockStore("test", [issue])

      vi.mocked(registry.getStore).mockImplementation((id: string) => {
        return id === "test" ? store : null
      })

      setIssueStoresInstance(registry)

      const { result } = renderHook(() => useIssue("test", "issue-1"))
      expect(result.current).toEqual(issue)
    })
  })

  describe("useIssueStoreLite", () => {
    it("returns issues typed as IssueLite", () => {
      const registry = createMockRegistry()
      const issues = [createMockIssue("1", "Test Issue")]
      const store = createMockStore("test", issues)

      vi.mocked(registry.getStore).mockImplementation((id: string) => {
        return id === "test" ? store : null
      })

      setIssueStoresInstance(registry)

      const { result } = renderHook(() => useIssueStoreLite("test"))
      expect(result.current).toEqual(issues)
      // TypeScript ensures the return type is readonly IssueLite[]
    })
  })
})
