/**
 * @vitest-environment jsdom
 *
 * Tests for the BoardColumn React component.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { BoardColumn } from "./BoardColumn.js"
import {
  setListSelectorsInstance,
  setTransportInstance,
  clearListSelectorsInstance,
  clearTransportInstance,
} from "../hooks/index.js"
import type { ListSelectors } from "../data/list-selectors.js"
import type { TransportFn } from "../hooks/index.js"
import type { IssueLite } from "../../types/issues.js"

describe("BoardColumn", () => {
  let navigate_spy: (id: string) => void
  let transport_spy: TransportFn
  let mock_issues: IssueLite[]

  /**
   * Create mock list selectors that return the given issues.
   */
  function createMockListSelectors(issues: IssueLite[]): ListSelectors {
    return {
      selectIssuesFor: () => issues,
      selectBoardColumn: () => issues,
      selectEpicChildren: () => [],
      subscribe: () => () => {},
    }
  }

  beforeEach(() => {
    navigate_spy = vi.fn() as (id: string) => void
    transport_spy = vi.fn().mockResolvedValue({}) as TransportFn

    mock_issues = [
      { id: "UI-1", title: "First Issue", priority: 1 },
      { id: "UI-2", title: "Second Issue", priority: 2 },
    ]

    setListSelectorsInstance(createMockListSelectors(mock_issues))
    setTransportInstance(transport_spy)
  })

  afterEach(() => {
    cleanup()
    clearListSelectorsInstance()
    clearTransportInstance()
    vi.clearAllMocks()
  })

  it("renders column header with title", () => {
    render(
      <BoardColumn
        title="Ready"
        columnId="ready-col"
        mode="ready"
        clientId="tab:board:ready"
        onNavigate={navigate_spy}
      />,
    )

    expect(screen.getByText("Ready")).toBeDefined()
  })

  it("renders count badge with issue count", () => {
    render(
      <BoardColumn
        title="Ready"
        columnId="ready-col"
        mode="ready"
        clientId="tab:board:ready"
        onNavigate={navigate_spy}
      />,
    )

    expect(screen.getByText("2")).toBeDefined()
    expect(screen.getByLabelText("2 issues")).toBeDefined()
  })

  it("renders count badge with singular label for 1 issue", () => {
    setListSelectorsInstance(createMockListSelectors([{ id: "UI-1", title: "Only Issue" }]))

    render(
      <BoardColumn
        title="Ready"
        columnId="ready-col"
        mode="ready"
        clientId="tab:board:ready"
        onNavigate={navigate_spy}
      />,
    )

    expect(screen.getByLabelText("1 issue")).toBeDefined()
  })

  it("renders BoardCard components for each issue", () => {
    render(
      <BoardColumn
        title="Ready"
        columnId="ready-col"
        mode="ready"
        clientId="tab:board:ready"
        onNavigate={navigate_spy}
      />,
    )

    expect(screen.getByText("First Issue")).toBeDefined()
    expect(screen.getByText("Second Issue")).toBeDefined()
  })

  it("renders closed filter dropdown for closed column", () => {
    render(
      <BoardColumn
        title="Closed"
        columnId="closed-col"
        mode="closed"
        clientId="tab:board:closed"
        onNavigate={navigate_spy}
        closedFilter="today"
      />,
    )

    expect(screen.getByLabelText("Filter closed issues")).toBeDefined()
    expect(screen.getByText("Today")).toBeDefined()
    expect(screen.getByText("Last 3 days")).toBeDefined()
    expect(screen.getByText("Last 7 days")).toBeDefined()
  })

  it("does not render filter dropdown for non-closed columns", () => {
    render(
      <BoardColumn
        title="Ready"
        columnId="ready-col"
        mode="ready"
        clientId="tab:board:ready"
        onNavigate={navigate_spy}
      />,
    )

    expect(screen.queryByLabelText("Filter closed issues")).toBeNull()
  })

  it("calls onClosedFilterChange when filter is changed", () => {
    const filter_change_spy = vi.fn()

    render(
      <BoardColumn
        title="Closed"
        columnId="closed-col"
        mode="closed"
        clientId="tab:board:closed"
        onNavigate={navigate_spy}
        closedFilter="today"
        onClosedFilterChange={filter_change_spy}
      />,
    )

    const select = screen.getByLabelText("Filter closed issues")
    fireEvent.change(select, { target: { value: "7" } })

    expect(filter_change_spy).toHaveBeenCalledWith("7")
  })

  it("has correct accessibility attributes", () => {
    render(
      <BoardColumn
        title="Ready"
        columnId="ready-col"
        mode="ready"
        clientId="tab:board:ready"
        onNavigate={navigate_spy}
      />,
    )

    const column = document.getElementById("ready-col")
    expect(column).toBeDefined()

    const header = screen.getByRole("heading", { level: 2 })
    expect(header).toBeDefined()

    const list = screen.getByRole("list")
    expect(list.getAttribute("aria-labelledby")).toBe("ready-col-header")
  })

  it("updates status via transport on drop", async () => {
    render(
      <BoardColumn
        title="Ready"
        columnId="ready-col"
        mode="ready"
        clientId="tab:board:ready"
        onNavigate={navigate_spy}
      />,
    )

    const column = document.getElementById("ready-col")!

    const data_transfer = {
      getData: vi.fn().mockReturnValue("UI-999"),
      dropEffect: "",
    }

    fireEvent.drop(column, { dataTransfer: data_transfer })

    // Wait for async transport call
    await vi.waitFor(() => {
      expect(transport_spy).toHaveBeenCalledWith("update-status", {
        id: "UI-999",
        status: "open",
      })
    })
  })

  it("maps column ID to correct status on drop", async () => {
    const { rerender } = render(
      <BoardColumn
        title="In Progress"
        columnId="in-progress-col"
        mode="in_progress"
        clientId="tab:board:in-progress"
        onNavigate={navigate_spy}
      />,
    )

    const column = document.getElementById("in-progress-col")!

    const data_transfer = {
      getData: vi.fn().mockReturnValue("UI-999"),
      dropEffect: "",
    }

    fireEvent.drop(column, { dataTransfer: data_transfer })

    await vi.waitFor(() => {
      expect(transport_spy).toHaveBeenCalledWith("update-status", {
        id: "UI-999",
        status: "in_progress",
      })
    })
  })

  it("adds drag-over class on dragenter", () => {
    render(
      <BoardColumn
        title="Ready"
        columnId="ready-col"
        mode="ready"
        clientId="tab:board:ready"
        onNavigate={navigate_spy}
      />,
    )

    const column = document.getElementById("ready-col")!

    fireEvent.dragEnter(column)

    expect(column.classList.contains("board-column--drag-over")).toBe(true)
  })

  it("removes drag-over class on dragleave", () => {
    render(
      <BoardColumn
        title="Ready"
        columnId="ready-col"
        mode="ready"
        clientId="tab:board:ready"
        onNavigate={navigate_spy}
      />,
    )

    const column = document.getElementById("ready-col")!

    fireEvent.dragEnter(column)
    expect(column.classList.contains("board-column--drag-over")).toBe(true)

    fireEvent.dragLeave(column)
    expect(column.classList.contains("board-column--drag-over")).toBe(false)
  })

  it("removes drag-over class on drop", async () => {
    render(
      <BoardColumn
        title="Ready"
        columnId="ready-col"
        mode="ready"
        clientId="tab:board:ready"
        onNavigate={navigate_spy}
      />,
    )

    const column = document.getElementById("ready-col")!

    fireEvent.dragEnter(column)
    expect(column.classList.contains("board-column--drag-over")).toBe(true)

    const data_transfer = {
      getData: vi.fn().mockReturnValue("UI-999"),
      dropEffect: "",
    }

    fireEvent.drop(column, { dataTransfer: data_transfer })

    expect(column.classList.contains("board-column--drag-over")).toBe(false)
  })

  it("navigates on Enter key when card is focused", () => {
    render(
      <BoardColumn
        title="Ready"
        columnId="ready-col"
        mode="ready"
        clientId="tab:board:ready"
        onNavigate={navigate_spy}
      />,
    )

    const cards = screen.getAllByRole("listitem")
    const first_card = cards[0]!

    fireEvent.keyDown(first_card, { key: "Enter" })

    expect(navigate_spy).toHaveBeenCalledWith("UI-1")
  })

  it("navigates on Space key when card is focused", () => {
    render(
      <BoardColumn
        title="Ready"
        columnId="ready-col"
        mode="ready"
        clientId="tab:board:ready"
        onNavigate={navigate_spy}
      />,
    )

    const cards = screen.getAllByRole("listitem")
    const first_card = cards[0]!

    fireEvent.keyDown(first_card, { key: " " })

    expect(navigate_spy).toHaveBeenCalledWith("UI-1")
  })

  it("first card has tabIndex 0, others have -1", () => {
    render(
      <BoardColumn
        title="Ready"
        columnId="ready-col"
        mode="ready"
        clientId="tab:board:ready"
        onNavigate={navigate_spy}
      />,
    )

    const cards = screen.getAllByRole("listitem")
    expect(cards[0]!.getAttribute("tabindex")).toBe("0")
    expect(cards[1]!.getAttribute("tabindex")).toBe("-1")
  })

  it("filters closed issues by today filter", () => {
    const now = Date.now()
    const yesterday = now - 25 * 60 * 60 * 1000 // 25 hours ago

    const closed_issues: IssueLite[] = [
      { id: "UI-1", title: "Closed Today", closed_at: now },
      { id: "UI-2", title: "Closed Yesterday", closed_at: yesterday },
    ]

    setListSelectorsInstance(createMockListSelectors(closed_issues))

    render(
      <BoardColumn
        title="Closed"
        columnId="closed-col"
        mode="closed"
        clientId="tab:board:closed"
        onNavigate={navigate_spy}
        closedFilter="today"
      />,
    )

    expect(screen.getByText("Closed Today")).toBeDefined()
    expect(screen.queryByText("Closed Yesterday")).toBeNull()
  })

  it("filters closed issues by 3 day filter", () => {
    const now = Date.now()
    const two_days_ago = now - 2 * 24 * 60 * 60 * 1000
    const five_days_ago = now - 5 * 24 * 60 * 60 * 1000

    const closed_issues: IssueLite[] = [
      { id: "UI-1", title: "Recent", closed_at: two_days_ago },
      { id: "UI-2", title: "Old", closed_at: five_days_ago },
    ]

    setListSelectorsInstance(createMockListSelectors(closed_issues))

    render(
      <BoardColumn
        title="Closed"
        columnId="closed-col"
        mode="closed"
        clientId="tab:board:closed"
        onNavigate={navigate_spy}
        closedFilter="3"
      />,
    )

    expect(screen.getByText("Recent")).toBeDefined()
    expect(screen.queryByText("Old")).toBeNull()
  })

  it("renders empty list when no issues", () => {
    setListSelectorsInstance(createMockListSelectors([]))

    render(
      <BoardColumn
        title="Ready"
        columnId="ready-col"
        mode="ready"
        clientId="tab:board:ready"
        onNavigate={navigate_spy}
      />,
    )

    const list = screen.getByRole("list")
    expect(list.children.length).toBe(0)
    expect(screen.getByText("0")).toBeDefined()
    expect(screen.getByLabelText("0 issues")).toBeDefined()
  })
})
