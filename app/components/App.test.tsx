/**
 * Tests for the React App shell component.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, cleanup } from "@testing-library/react"

import { useAppStore } from "../store/index.js"
import { App } from "./App.js"
import {
  setIssueStoresInstance,
  setListSelectorsInstance,
  setTransportInstance,
  setSubscriptionsInstance,
  setIssueStoresRegistryInstance,
  clearIssueStoresInstance,
  clearListSelectorsInstance,
  clearTransportInstance,
  clearSubscriptionsInstance,
  clearIssueStoresRegistryInstance,
} from "../hooks/index.js"
import type { SubscriptionIssueStoresRegistry } from "../data/subscription-issue-stores.js"
import type { SubscriptionStore } from "../data/subscriptions-store.js"
import type { ListSelectors } from "../data/list-selectors.js"
import type { TransportFn } from "../hooks/index.js"

describe("App component", () => {
  /**
   * Create a minimal mock issue stores registry.
   */
  function createMockIssueStores(): SubscriptionIssueStoresRegistry {
    return {
      register: () => () => {},
      unregister: () => {},
      getStore: () => null,
      snapshotFor: () => [],
      subscribe: () => () => {},
    }
  }

  /**
   * Cached empty array to prevent infinite re-render loops.
   * useSyncExternalStore requires getSnapshot to return the same reference
   * when the data hasn't changed.
   */
  const CACHED_EMPTY: never[] = []

  /**
   * Create a minimal mock list selectors.
   */
  function createMockListSelectors(): ListSelectors {
    return {
      selectIssuesFor: () => CACHED_EMPTY,
      selectBoardColumn: () => CACHED_EMPTY,
      selectEpicChildren: () => CACHED_EMPTY,
      subscribe: () => () => {},
    }
  }

  /**
   * Create a minimal mock subscriptions.
   */
  function createMockSubscriptions(): SubscriptionStore {
    return {
      subscribeList: async () => async () => {},
      _applyDelta: () => {},
      _subKeyOf: () => "",
      selectors: {
        getIds: () => [],
        has: () => false,
        count: () => 0,
        getItemsById: () => ({}),
      },
    }
  }

  beforeEach(() => {
    // Set up DOM containers that the app expects
    document.body.innerHTML = `
      <div id="epics-root"></div>
      <div id="board-root"></div>
      <div id="issues-root"></div>
      <div id="react-root"></div>
    `
    // Reset store to initial state
    useAppStore.setState({
      view: "issues",
      selected_id: null,
      filters: { status: "all", search: "", type: "" },
      board: { closed_filter: "today" },
      workspace: { current: null, available: [] },
    })

    // Set up mock instances
    const mockTransport = vi.fn().mockResolvedValue({}) as TransportFn
    setIssueStoresInstance(createMockIssueStores())
    setIssueStoresRegistryInstance(createMockIssueStores())
    setListSelectorsInstance(createMockListSelectors())
    setTransportInstance(mockTransport)
    setSubscriptionsInstance(createMockSubscriptions())
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ""
    clearIssueStoresInstance()
    clearIssueStoresRegistryInstance()
    clearListSelectorsInstance()
    clearTransportInstance()
    clearSubscriptionsInstance()
    vi.clearAllMocks()
  })

  it("renders without crashing", () => {
    const { container } = render(<App />)
    expect(container).toBeDefined()
  })

  it("renders EpicsView into epics-root when view is epics", () => {
    // Set view before rendering
    useAppStore.setState({ view: "epics" })
    render(<App />)

    // EpicsView renders its empty state
    const epics_root = document.getElementById("epics-root")
    expect(epics_root?.textContent).toContain("No epics found")
  })

  it("renders BoardView into board-root when view is board", () => {
    // Set view before rendering
    useAppStore.setState({ view: "board" })
    render(<App />)

    // BoardView renders its columns
    const board_root = document.getElementById("board-root")
    expect(board_root?.textContent).toContain("Blocked")
    expect(board_root?.textContent).toContain("Ready")
    expect(board_root?.textContent).toContain("In Progress")
    expect(board_root?.textContent).toContain("Closed")
  })

  it("does not render board content when view is not board", () => {
    // Set view to issues before rendering
    useAppStore.setState({ view: "issues" })
    render(<App />)

    // BoardView should not render when view is issues
    const board_root = document.getElementById("board-root")
    expect(board_root?.textContent).toBe("")
  })

  it("does not render epics content when view is board", () => {
    // Set view before rendering
    useAppStore.setState({ view: "board" })
    render(<App />)

    // EpicsView should not render when view is board
    const epics_root = document.getElementById("epics-root")
    expect(epics_root?.textContent).toBe("")
  })

  it("renders neither board nor epics when view is issues", () => {
    // Set view before rendering
    useAppStore.setState({ view: "issues" })
    render(<App />)

    // Neither view should render
    const board_root = document.getElementById("board-root")
    const epics_root = document.getElementById("epics-root")
    expect(board_root?.textContent).toBe("")
    expect(epics_root?.textContent).toBe("")
  })
})
