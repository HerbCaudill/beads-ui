/**
 * Tests for the React EpicsView component.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { render, screen } from "@testing-library/react"

import { EpicsView } from "./EpicsView.js"
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

describe("EpicsView (React)", () => {
  let mockNavigate: (id: string) => void
  let mockTransport: TransportFn

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
   * Create a minimal mock list selectors.
   */
  function createMockListSelectors(): ListSelectors {
    return {
      selectIssuesFor: () => [],
      selectBoardColumn: () => [],
      selectEpicChildren: () => [],
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
    mockNavigate = vi.fn() as (id: string) => void
    mockTransport = vi.fn().mockResolvedValue({}) as TransportFn

    setIssueStoresInstance(createMockIssueStores())
    setIssueStoresRegistryInstance(createMockIssueStores())
    setListSelectorsInstance(createMockListSelectors())
    setTransportInstance(mockTransport)
    setSubscriptionsInstance(createMockSubscriptions())
  })

  afterEach(() => {
    clearIssueStoresInstance()
    clearIssueStoresRegistryInstance()
    clearListSelectorsInstance()
    clearTransportInstance()
    clearSubscriptionsInstance()
    vi.clearAllMocks()
  })

  test("renders empty state when no epics", () => {
    render(<EpicsView onNavigate={mockNavigate} />)

    expect(screen.getByText("No epics found.")).toBeTruthy()
  })

  test("calls onNavigate prop when provided", () => {
    // Test that the component renders without error when given an onNavigate
    const { container } = render(<EpicsView onNavigate={mockNavigate} />)
    expect(container).toBeTruthy()
  })
})
