/**
 * Tests for the ListView React component.
 */
import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ListView } from "./ListView.js"
import { useAppStore } from "../store/index.js"
import { setListSelectorsInstance, clearListSelectorsInstance } from "../hooks/useListSelectors.js"
import { setTransportInstance, clearTransportInstance } from "../hooks/use-transport.js"
import type { ListSelectors } from "../data/list-selectors.js"

import type { IssueLite } from "../../types/issues.js"

/**
 * Extended issue type for testing with IssueRow fields.
 */
interface TestIssue extends IssueLite {
  assignee?: string
  dependency_count?: number
  dependent_count?: number
}

/**
 * Create mock issues for testing.
 */
function createMockIssues(): TestIssue[] {
  return [
    {
      id: "test-1",
      title: "First issue",
      status: "open" as const,
      priority: 1,
      issue_type: "bug",
      assignee: "alice",
      dependency_count: 0,
      dependent_count: 0,
    },
    {
      id: "test-2",
      title: "Second issue",
      status: "in_progress" as const,
      priority: 2,
      issue_type: "feature",
      assignee: "bob",
      dependency_count: 1,
      dependent_count: 2,
    },
    {
      id: "test-3",
      title: "Third issue",
      status: "closed" as const,
      priority: 0,
      issue_type: "task",
      assignee: "",
      dependency_count: 0,
      dependent_count: 0,
    },
  ]
}

/**
 * Create a mock ListSelectors instance.
 *
 * @param issues - Optional issues to return from selectors.
 */
function createMockSelectors(issues: TestIssue[] = createMockIssues()): ListSelectors {
  const subscribers: Set<() => void> = new Set()

  return {
    selectIssuesFor: () => issues as IssueLite[],
    selectBoardColumn: () => [],
    selectEpicChildren: () => [],
    subscribe: (cb: () => void) => {
      subscribers.add(cb)
      return () => {
        subscribers.delete(cb)
      }
    },
  }
}

describe("ListView", () => {
  const mock_navigate = vi.fn()
  const mock_transport = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    // Reset store to default state
    useAppStore.setState({
      filters: {
        status: "all",
        search: "",
        type: "",
      },
    })

    // Set up mock instances
    setListSelectorsInstance(createMockSelectors())
    setTransportInstance(mock_transport)
  })

  afterEach(() => {
    vi.clearAllMocks()
    clearListSelectorsInstance()
    clearTransportInstance()
  })

  describe("rendering", () => {
    it("renders the filter bar", () => {
      render(<ListView onNavigate={mock_navigate} />)
      expect(screen.getByText("Status: Any")).toBeDefined()
      expect(screen.getByText("Types: Any")).toBeDefined()
      expect(screen.getByPlaceholderText("Search…")).toBeDefined()
    })

    it("renders the table headers", () => {
      render(<ListView onNavigate={mock_navigate} />)
      expect(screen.getByText("ID")).toBeDefined()
      expect(screen.getByText("Type")).toBeDefined()
      expect(screen.getByText("Title")).toBeDefined()
      expect(screen.getByText("Status")).toBeDefined()
      expect(screen.getByText("Assignee")).toBeDefined()
      expect(screen.getByText("Priority")).toBeDefined()
      expect(screen.getByText("Deps")).toBeDefined()
    })

    it("renders issue rows", () => {
      render(<ListView onNavigate={mock_navigate} />)
      expect(screen.getByText("First issue")).toBeDefined()
      expect(screen.getByText("Second issue")).toBeDefined()
      expect(screen.getByText("Third issue")).toBeDefined()
    })

    it("renders empty state when no issues", () => {
      clearListSelectorsInstance()
      setListSelectorsInstance(createMockSelectors([]))

      render(<ListView onNavigate={mock_navigate} />)
      expect(screen.getByText("No issues")).toBeDefined()
    })

    it("applies testId when provided", () => {
      render(<ListView onNavigate={mock_navigate} testId="list-view" />)
      expect(screen.getByTestId("list-view")).toBeDefined()
    })

    it("has correct aria attributes on table", () => {
      render(<ListView onNavigate={mock_navigate} />)
      const table = screen.getByRole("grid")
      expect(table.getAttribute("aria-rowcount")).toBe("3")
      expect(table.getAttribute("aria-colcount")).toBe("7")
    })
  })

  describe("navigation", () => {
    it("calls onNavigate when row is clicked", () => {
      render(<ListView onNavigate={mock_navigate} />)

      const rows = screen.getAllByRole("row")
      // First row is header, second is first data row
      const data_row = rows[1]
      if (data_row) {
        fireEvent.click(data_row)
        expect(mock_navigate).toHaveBeenCalledWith("test-1")
      }
    })
  })

  describe("filtering", () => {
    it("filters by status", () => {
      useAppStore.setState({
        filters: {
          status: ["open"] as unknown as "open",
          search: "",
          type: "",
        },
      })

      render(<ListView onNavigate={mock_navigate} />)

      expect(screen.getByText("First issue")).toBeDefined()
      expect(screen.queryByText("Second issue")).toBeNull()
      expect(screen.queryByText("Third issue")).toBeNull()
    })

    it("filters by search text", () => {
      useAppStore.setState({
        filters: {
          status: "all",
          search: "Second",
          type: "",
        },
      })

      render(<ListView onNavigate={mock_navigate} />)

      expect(screen.queryByText("First issue")).toBeNull()
      expect(screen.getByText("Second issue")).toBeDefined()
      expect(screen.queryByText("Third issue")).toBeNull()
    })

    it("filters by type", () => {
      useAppStore.setState({
        filters: {
          status: "all",
          search: "",
          type: ["bug"] as unknown as string,
        },
      })

      render(<ListView onNavigate={mock_navigate} />)

      expect(screen.getByText("First issue")).toBeDefined()
      expect(screen.queryByText("Second issue")).toBeNull()
      expect(screen.queryByText("Third issue")).toBeNull()
    })
  })

  describe("inline editing", () => {
    it("calls transport for title update", async () => {
      render(<ListView onNavigate={mock_navigate} />)

      // Find the first editable title
      const editable = screen.getByText("First issue")
      fireEvent.click(editable)

      // Find the input and change value
      const input = screen.getByDisplayValue("First issue")
      fireEvent.change(input, { target: { value: "Updated title" } })
      fireEvent.blur(input)

      // Wait for async update
      await vi.waitFor(() => {
        expect(mock_transport).toHaveBeenCalledWith("edit-text", {
          id: "test-1",
          field: "title",
          value: "Updated title",
        })
      })
    })

    it("calls transport for status update", async () => {
      render(<ListView onNavigate={mock_navigate} />)

      // Find a status select and change it
      const status_selects = screen.getAllByRole("combobox")
      const first_status = status_selects.find(el => el.classList.contains("badge--status"))

      if (first_status) {
        fireEvent.change(first_status, { target: { value: "closed" } })

        await vi.waitFor(() => {
          expect(mock_transport).toHaveBeenCalledWith("update-status", {
            id: "test-1",
            status: "closed",
          })
        })
      }
    })

    it("calls transport for priority update", async () => {
      render(<ListView onNavigate={mock_navigate} />)

      // Find a priority select and change it
      const priority_selects = screen.getAllByRole("combobox")
      const first_priority = priority_selects.find(el => el.classList.contains("badge--priority"))

      if (first_priority) {
        fireEvent.change(first_priority, { target: { value: "0" } })

        await vi.waitFor(() => {
          expect(mock_transport).toHaveBeenCalledWith("update-priority", {
            id: "test-1",
            priority: 0,
          })
        })
      }
    })
  })

  describe("dependency indicators", () => {
    it("shows dependency count indicator", () => {
      render(<ListView onNavigate={mock_navigate} />)

      // Second issue has dependency_count: 1 and dependent_count: 2
      const dep_indicator = screen.getByTitle("1 dependency")
      expect(dep_indicator).toBeDefined()
    })

    it("shows dependent count indicator", () => {
      render(<ListView onNavigate={mock_navigate} />)

      // Second issue has dependent_count: 2
      const dep_indicator = screen.getByTitle("2 dependents")
      expect(dep_indicator).toBeDefined()
    })
  })

  describe("keyboard navigation", () => {
    it("ArrowDown selects next issue", () => {
      useAppStore.setState({ selected_id: "test-1" })
      render(<ListView onNavigate={mock_navigate} testId="list-view" />)

      const listView = screen.getByTestId("list-view")
      fireEvent.keyDown(listView, { key: "ArrowDown" })

      // Check store was updated
      expect(useAppStore.getState().selected_id).toBe("test-2")
    })

    it("ArrowUp selects previous issue", () => {
      useAppStore.setState({ selected_id: "test-2" })
      render(<ListView onNavigate={mock_navigate} testId="list-view" />)

      const listView = screen.getByTestId("list-view")
      fireEvent.keyDown(listView, { key: "ArrowUp" })

      expect(useAppStore.getState().selected_id).toBe("test-1")
    })

    it("Enter navigates to selected issue", () => {
      useAppStore.setState({ selected_id: "test-2" })
      render(<ListView onNavigate={mock_navigate} testId="list-view" />)

      const listView = screen.getByTestId("list-view")
      fireEvent.keyDown(listView, { key: "Enter" })

      expect(mock_navigate).toHaveBeenCalledWith("test-2")
    })

    it("ArrowDown at end stays on last issue", () => {
      useAppStore.setState({ selected_id: "test-3" })
      render(<ListView onNavigate={mock_navigate} testId="list-view" />)

      const listView = screen.getByTestId("list-view")
      fireEvent.keyDown(listView, { key: "ArrowDown" })

      expect(useAppStore.getState().selected_id).toBe("test-3")
    })

    it("ArrowUp at start stays on first issue", () => {
      useAppStore.setState({ selected_id: "test-1" })
      render(<ListView onNavigate={mock_navigate} testId="list-view" />)

      const listView = screen.getByTestId("list-view")
      fireEvent.keyDown(listView, { key: "ArrowUp" })

      expect(useAppStore.getState().selected_id).toBe("test-1")
    })

    it("ArrowDown moves focus to same column in next row when inside a cell", () => {
      render(<ListView onNavigate={mock_navigate} testId="list-view" />)

      // Focus the editable title in the first row
      const first_title = screen.getByText("First issue")
      first_title.focus()
      expect(document.activeElement).toBe(first_title)

      // Press ArrowDown
      fireEvent.keyDown(first_title, { key: "ArrowDown", bubbles: true })

      // Should now be focused on second row's title
      const second_title = screen.getByText("Second issue")
      expect(document.activeElement).toBe(second_title)
    })

    it("does not intercept ArrowDown inside select controls", () => {
      render(<ListView onNavigate={mock_navigate} testId="list-view" />)

      // Focus a status select
      const status_selects = screen.getAllByRole("combobox")
      const first_status = status_selects.find(el => el.classList.contains("badge--status"))

      if (first_status) {
        first_status.focus()
        fireEvent.keyDown(first_status, { key: "ArrowDown", bubbles: true })

        // Focus should remain on the select (native behavior preserved)
        expect(document.activeElement).toBe(first_status)
      }
    })
  })
})
