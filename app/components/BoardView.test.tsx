/**
 * @vitest-environment jsdom
 *
 * Tests for the BoardView React component.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { BoardView } from "./BoardView.js"
import {
  setListSelectorsInstance,
  setTransportInstance,
  clearListSelectorsInstance,
  clearTransportInstance,
} from "../hooks/index.js"
import { useAppStore } from "../store/index.js"
import type { ListSelectors } from "../data/list-selectors.js"
import type { TransportFn } from "../hooks/index.js"
import type { IssueLite } from "../../types/issues.js"

describe("BoardView", () => {
  let navigate_spy: (id: string) => void
  let transport_spy: TransportFn

  /**
   * Create mock list selectors that return different issues per mode.
   */
  function createMockListSelectors(issues_by_mode: Record<string, IssueLite[]>): ListSelectors {
    return {
      selectIssuesFor: () => [],
      selectBoardColumn: (_clientId: string, mode: string) => issues_by_mode[mode] || [],
      selectEpicChildren: () => [],
      subscribe: () => () => {},
    }
  }

  beforeEach(() => {
    navigate_spy = vi.fn() as (id: string) => void
    transport_spy = vi.fn().mockResolvedValue({}) as TransportFn

    // Reset store to default state
    useAppStore.setState({
      board: { closed_filter: "today" },
    })

    setListSelectorsInstance(
      createMockListSelectors({
        blocked: [{ id: "B-1", title: "Blocked Issue", priority: 1 }],
        ready: [
          { id: "R-1", title: "Ready Issue 1", priority: 1 },
          { id: "R-2", title: "Ready Issue 2", priority: 2 },
        ],
        in_progress: [{ id: "P-1", title: "In Progress Issue", priority: 1 }],
        closed: [{ id: "C-1", title: "Closed Issue", closed_at: Date.now() }],
      }),
    )
    setTransportInstance(transport_spy)
  })

  afterEach(() => {
    cleanup()
    clearListSelectorsInstance()
    clearTransportInstance()
    vi.clearAllMocks()
  })

  it("renders four columns", () => {
    render(<BoardView onNavigate={navigate_spy} />)

    expect(screen.getByText("Blocked")).toBeDefined()
    expect(screen.getByText("Ready")).toBeDefined()
    expect(screen.getByText("In Progress")).toBeDefined()
    expect(screen.getByText("Closed")).toBeDefined()
  })

  it("renders cards in each column", () => {
    render(<BoardView onNavigate={navigate_spy} />)

    expect(screen.getByText("Blocked Issue")).toBeDefined()
    expect(screen.getByText("Ready Issue 1")).toBeDefined()
    expect(screen.getByText("Ready Issue 2")).toBeDefined()
    expect(screen.getByText("In Progress Issue")).toBeDefined()
    expect(screen.getByText("Closed Issue")).toBeDefined()
  })

  it("has correct column IDs", () => {
    render(<BoardView onNavigate={navigate_spy} />)

    expect(document.getElementById("blocked-col")).toBeDefined()
    expect(document.getElementById("ready-col")).toBeDefined()
    expect(document.getElementById("in-progress-col")).toBeDefined()
    expect(document.getElementById("closed-col")).toBeDefined()
  })

  it("renders closed filter dropdown in closed column", () => {
    render(<BoardView onNavigate={navigate_spy} />)

    expect(screen.getByLabelText("Filter closed issues")).toBeDefined()
  })

  it("reads initial closed filter from store", () => {
    useAppStore.setState({
      board: { closed_filter: "7" },
    })

    render(<BoardView onNavigate={navigate_spy} />)

    const select = screen.getByLabelText("Filter closed issues") as HTMLSelectElement
    expect(select.value).toBe("7")
  })

  it("updates store when closed filter changes", () => {
    render(<BoardView onNavigate={navigate_spy} />)

    const select = screen.getByLabelText("Filter closed issues")
    fireEvent.change(select, { target: { value: "3" } })

    expect(useAppStore.getState().board.closed_filter).toBe("3")
  })

  it("navigates on card click", () => {
    render(<BoardView onNavigate={navigate_spy} />)

    const card = screen.getByText("Ready Issue 1").closest(".board-card")!
    fireEvent.click(card)

    expect(navigate_spy).toHaveBeenCalledWith("R-1")
  })

  it("ArrowRight moves focus to next column with cards", () => {
    render(<BoardView onNavigate={navigate_spy} />)

    const blocked_card = document
      .getElementById("blocked-col")!
      .querySelector(".board-card") as HTMLElement
    const ready_card = document
      .getElementById("ready-col")!
      .querySelector(".board-card") as HTMLElement

    blocked_card.focus()
    expect(document.activeElement).toBe(blocked_card)

    fireEvent.keyDown(blocked_card, { key: "ArrowRight" })
    expect(document.activeElement).toBe(ready_card)
  })

  it("ArrowLeft moves focus to previous column with cards", () => {
    render(<BoardView onNavigate={navigate_spy} />)

    const blocked_card = document
      .getElementById("blocked-col")!
      .querySelector(".board-card") as HTMLElement
    const ready_card = document
      .getElementById("ready-col")!
      .querySelector(".board-card") as HTMLElement

    ready_card.focus()
    expect(document.activeElement).toBe(ready_card)

    fireEvent.keyDown(ready_card, { key: "ArrowLeft" })
    expect(document.activeElement).toBe(blocked_card)
  })

  it("ArrowRight skips empty columns", () => {
    // Setup with empty ready column
    setListSelectorsInstance(
      createMockListSelectors({
        blocked: [{ id: "B-1", title: "Blocked Issue", priority: 1 }],
        ready: [], // Empty
        in_progress: [{ id: "P-1", title: "In Progress Issue", priority: 1 }],
        closed: [],
      }),
    )

    render(<BoardView onNavigate={navigate_spy} />)

    const blocked_card = document
      .getElementById("blocked-col")!
      .querySelector(".board-card") as HTMLElement
    const in_progress_card = document
      .getElementById("in-progress-col")!
      .querySelector(".board-card") as HTMLElement

    blocked_card.focus()
    fireEvent.keyDown(blocked_card, { key: "ArrowRight" })

    // Should skip empty Ready column and land on In Progress
    expect(document.activeElement).toBe(in_progress_card)
  })

  it("does not intercept keyboard events from form controls", () => {
    render(<BoardView onNavigate={navigate_spy} />)

    const select = screen.getByLabelText("Filter closed issues") as HTMLSelectElement
    select.focus()

    // ArrowRight in select should not cause column navigation
    const initial_element = document.activeElement
    fireEvent.keyDown(select, { key: "ArrowRight" })

    // Focus should remain on the select
    expect(document.activeElement).toBe(initial_element)
  })

  it("has board-root class for styling", () => {
    const { container } = render(<BoardView onNavigate={navigate_spy} />)

    expect(container.querySelector(".board-root")).toBeDefined()
  })

  it("has panel__body class for layout", () => {
    const { container } = render(<BoardView onNavigate={navigate_spy} />)

    expect(container.querySelector(".panel__body")).toBeDefined()
  })
})
