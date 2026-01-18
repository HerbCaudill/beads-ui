/**
 * Tests for the lit-html store adapter.
 */
import { afterEach, describe, expect, it, vi } from "vitest"

import { useAppStore } from "./index.js"
import { createLitStoreAdapter } from "./lit-adapter.js"

describe("createLitStoreAdapter", () => {
  afterEach(() => {
    // Reset Zustand store to default state between tests
    useAppStore.setState({
      selected_id: null,
      view: "issues",
      filters: { status: "all", search: "", type: "" },
      board: { closed_filter: "today" },
      workspace: { current: null, available: [] },
    })
  })

  describe("getState", () => {
    it("should return the current state from Zustand", () => {
      const store = createLitStoreAdapter()
      const state = store.getState()
      expect(state.selected_id).toBe(null)
      expect(state.view).toBe("issues")
      expect(state.filters).toEqual({ status: "all", search: "", type: "" })
      expect(state.board).toEqual({ closed_filter: "today" })
      expect(state.workspace).toEqual({ current: null, available: [] })
    })

    it("should reflect Zustand state changes", () => {
      const store = createLitStoreAdapter()
      useAppStore.getState().setSelectedId("issue-123")
      expect(store.getState().selected_id).toBe("issue-123")
    })

    it("should not include action methods", () => {
      const store = createLitStoreAdapter()
      const state = store.getState()
      expect((state as unknown as Record<string, unknown>).setSelectedId).toBeUndefined()
      expect((state as unknown as Record<string, unknown>).setState).toBeUndefined()
    })
  })

  describe("setState", () => {
    it("should update Zustand store", () => {
      const store = createLitStoreAdapter()
      store.setState({ selected_id: "issue-456" })
      expect(useAppStore.getState().selected_id).toBe("issue-456")
    })

    it("should merge filters partially", () => {
      const store = createLitStoreAdapter()
      store.setState({ filters: { status: "open" } })
      expect(useAppStore.getState().filters).toEqual({
        status: "open",
        search: "",
        type: "",
      })
    })

    it("should merge board state partially", () => {
      const store = createLitStoreAdapter()
      store.setState({ board: { closed_filter: "7" } })
      expect(useAppStore.getState().board.closed_filter).toBe("7")
    })

    it("should update multiple fields at once", () => {
      const store = createLitStoreAdapter()
      store.setState({
        selected_id: "issue-789",
        view: "board",
        filters: { search: "test" },
      })
      const state = useAppStore.getState()
      expect(state.selected_id).toBe("issue-789")
      expect(state.view).toBe("board")
      expect(state.filters.search).toBe("test")
    })

    it("should update workspace current", () => {
      const store = createLitStoreAdapter()
      const workspace = { path: "/test", database: "/test/.beads/test.db" }
      store.setState({ workspace: { current: workspace } })
      expect(useAppStore.getState().workspace.current).toEqual(workspace)
    })

    it("should update workspace available", () => {
      const store = createLitStoreAdapter()
      const workspaces = [
        { path: "/test1", database: "/test1/.beads/test.db" },
        { path: "/test2", database: "/test2/.beads/test.db" },
      ]
      store.setState({ workspace: { available: workspaces } })
      expect(useAppStore.getState().workspace.available).toEqual(workspaces)
    })
  })

  describe("subscribe", () => {
    it("should call subscriber on state changes", () => {
      const store = createLitStoreAdapter()
      const callback = vi.fn()
      store.subscribe(callback)

      store.setState({ selected_id: "issue-1" })
      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback.mock.calls[0]![0].selected_id).toBe("issue-1")
    })

    it("should return unsubscribe function", () => {
      const store = createLitStoreAdapter()
      const callback = vi.fn()
      const unsubscribe = store.subscribe(callback)

      store.setState({ selected_id: "issue-1" })
      expect(callback).toHaveBeenCalledTimes(1)

      unsubscribe()
      store.setState({ selected_id: "issue-2" })
      expect(callback).toHaveBeenCalledTimes(1) // Should not be called again
    })

    it("should not call subscriber when state is unchanged", () => {
      const store = createLitStoreAdapter()
      const callback = vi.fn()
      store.subscribe(callback)

      // Set the same value
      store.setState({ selected_id: null })
      expect(callback).not.toHaveBeenCalled()
    })

    it("should receive full state object", () => {
      const store = createLitStoreAdapter()
      const callback = vi.fn()
      store.subscribe(callback)

      store.setState({ view: "board" })
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          selected_id: null,
          view: "board",
          filters: { status: "all", search: "", type: "" },
          board: { closed_filter: "today" },
          workspace: { current: null, available: [] },
        }),
      )
    })

    it("should respond to Zustand direct updates", () => {
      const store = createLitStoreAdapter()
      const callback = vi.fn()
      store.subscribe(callback)

      // Update Zustand directly
      useAppStore.getState().setSelectedId("direct-update")
      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback.mock.calls[0]![0].selected_id).toBe("direct-update")
    })

    it("should detect workspace changes", () => {
      const store = createLitStoreAdapter()
      const callback = vi.fn()
      store.subscribe(callback)

      store.setState({ workspace: { current: { path: "/new", database: "/new/.beads/db" } } })
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it("should detect workspace available list changes", () => {
      const store = createLitStoreAdapter()
      const callback = vi.fn()
      store.subscribe(callback)

      store.setState({ workspace: { available: [{ path: "/ws1", database: "/ws1/.beads/db" }] } })
      expect(callback).toHaveBeenCalledTimes(1)
    })
  })

  describe("multiple adapters", () => {
    it("should share the same underlying Zustand store", () => {
      const store1 = createLitStoreAdapter()
      const store2 = createLitStoreAdapter()

      store1.setState({ selected_id: "shared-id" })
      expect(store2.getState().selected_id).toBe("shared-id")
    })

    it("should both receive updates", () => {
      const store1 = createLitStoreAdapter()
      const store2 = createLitStoreAdapter()
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      store1.subscribe(callback1)
      store2.subscribe(callback2)

      store1.setState({ view: "epics" })
      expect(callback1).toHaveBeenCalledTimes(1)
      expect(callback2).toHaveBeenCalledTimes(1)
    })
  })
})
