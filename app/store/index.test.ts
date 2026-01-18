/**
 * Tests for the Zustand store.
 */
import { afterEach, describe, expect, it, vi } from "vitest"

import { getAppState, subscribeAppStore, useAppStore } from "./index.js"

describe("useAppStore", () => {
  afterEach(() => {
    // Reset store to default state between tests
    useAppStore.setState({
      selected_id: null,
      view: "issues",
      filters: { status: "all", search: "", type: "" },
      board: { closed_filter: "today" },
      workspace: { current: null, available: [] },
    })
  })

  describe("initial state", () => {
    it("should have default values", () => {
      const state = useAppStore.getState()
      expect(state.selected_id).toBe(null)
      expect(state.view).toBe("issues")
      expect(state.filters).toEqual({ status: "all", search: "", type: "" })
      expect(state.board).toEqual({ closed_filter: "today" })
      expect(state.workspace).toEqual({ current: null, available: [] })
    })
  })

  describe("setSelectedId", () => {
    it("should update selected_id", () => {
      useAppStore.getState().setSelectedId("issue-123")
      expect(useAppStore.getState().selected_id).toBe("issue-123")
    })

    it("should allow setting to null", () => {
      useAppStore.getState().setSelectedId("issue-123")
      useAppStore.getState().setSelectedId(null)
      expect(useAppStore.getState().selected_id).toBe(null)
    })
  })

  describe("setView", () => {
    it("should update view", () => {
      useAppStore.getState().setView("board")
      expect(useAppStore.getState().view).toBe("board")
    })
  })

  describe("setFilters", () => {
    it("should update filters partially", () => {
      useAppStore.getState().setFilters({ status: "open" })
      expect(useAppStore.getState().filters).toEqual({
        status: "open",
        search: "",
        type: "",
      })
    })

    it("should merge with existing filters", () => {
      useAppStore.getState().setFilters({ search: "bug" })
      useAppStore.getState().setFilters({ status: "closed" })
      expect(useAppStore.getState().filters).toEqual({
        status: "closed",
        search: "bug",
        type: "",
      })
    })
  })

  describe("setBoard", () => {
    it("should update board state partially", () => {
      useAppStore.getState().setBoard({ closed_filter: "7" })
      expect(useAppStore.getState().board.closed_filter).toBe("7")
    })
  })

  describe("setWorkspace", () => {
    it("should update workspace current", () => {
      const workspace = { path: "/test", database: "/test/.beads/test.db" }
      useAppStore.getState().setWorkspace({ current: workspace })
      expect(useAppStore.getState().workspace.current).toEqual(workspace)
    })

    it("should update workspace available", () => {
      const workspaces = [
        { path: "/test1", database: "/test1/.beads/test.db" },
        { path: "/test2", database: "/test2/.beads/test.db" },
      ]
      useAppStore.getState().setWorkspace({ available: workspaces })
      expect(useAppStore.getState().workspace.available).toEqual(workspaces)
    })

    it("should preserve unchanged workspace fields", () => {
      const workspace = { path: "/test", database: "/test/.beads/test.db" }
      useAppStore.getState().setWorkspace({ current: workspace })
      useAppStore.getState().setWorkspace({ available: [workspace] })
      expect(useAppStore.getState().workspace.current).toEqual(workspace)
      expect(useAppStore.getState().workspace.available).toEqual([workspace])
    })
  })

  describe("setState (batch update)", () => {
    it("should update multiple fields at once", () => {
      useAppStore.getState().setState({
        selected_id: "issue-456",
        view: "epics",
        filters: { status: "in_progress" },
      })
      const state = useAppStore.getState()
      expect(state.selected_id).toBe("issue-456")
      expect(state.view).toBe("epics")
      expect(state.filters.status).toBe("in_progress")
    })
  })
})

describe("getAppState", () => {
  afterEach(() => {
    useAppStore.setState({
      selected_id: null,
      view: "issues",
      filters: { status: "all", search: "", type: "" },
      board: { closed_filter: "today" },
      workspace: { current: null, available: [] },
    })
  })

  it("should return current state without actions", () => {
    useAppStore.getState().setSelectedId("test-id")
    const state = getAppState()
    expect(state.selected_id).toBe("test-id")
    // Should not have action methods
    expect((state as unknown as Record<string, unknown>).setSelectedId).toBeUndefined()
  })
})

describe("subscribeAppStore", () => {
  afterEach(() => {
    useAppStore.setState({
      selected_id: null,
      view: "issues",
      filters: { status: "all", search: "", type: "" },
      board: { closed_filter: "today" },
      workspace: { current: null, available: [] },
    })
  })

  it("should subscribe to selected state changes", () => {
    const callback = vi.fn()
    const unsubscribe = subscribeAppStore(s => s.selected_id, callback)

    useAppStore.getState().setSelectedId("issue-1")
    expect(callback).toHaveBeenCalledWith("issue-1", null)

    useAppStore.getState().setSelectedId("issue-2")
    expect(callback).toHaveBeenCalledWith("issue-2", "issue-1")

    unsubscribe()
    useAppStore.getState().setSelectedId("issue-3")
    expect(callback).toHaveBeenCalledTimes(2) // Should not be called after unsubscribe
  })

  it("should only fire when selected value changes", () => {
    const callback = vi.fn()
    subscribeAppStore(s => s.view, callback)

    useAppStore.getState().setSelectedId("issue-1") // Changes selected_id, not view
    expect(callback).not.toHaveBeenCalled()

    useAppStore.getState().setView("board")
    expect(callback).toHaveBeenCalledWith("board", "issues")
  })
})
