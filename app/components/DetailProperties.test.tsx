/**
 * @vitest-environment jsdom
 *
 * Tests for the DetailProperties React component.
 */
import { cleanup, render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { DetailProperties } from "./DetailProperties.js"
import { DetailContext, type DetailContextValue } from "./DetailView.js"
import type { IssueDetail } from "../../types/issues.js"

/**
 * Create a mock issue for testing.
 */
function createMockIssue(overrides: Partial<IssueDetail> = {}): IssueDetail {
  return {
    id: "test-1",
    title: "Test Issue",
    description: "Test description",
    status: "open",
    priority: 2,
    issue_type: "bug",
    assignee: "alice",
    labels: [],
    dependencies: [],
    dependents: [],
    comments: [],
    ...overrides,
  }
}

/**
 * Wrapper component that provides the DetailContext.
 */
function renderWithContext(ui: React.ReactElement, contextValue: Partial<DetailContextValue> = {}) {
  const mockTransport = vi.fn().mockResolvedValue(undefined)
  const mockNavigate = vi.fn()

  const value: DetailContextValue = {
    issue: createMockIssue(),
    loading: false,
    transport: mockTransport,
    onNavigate: mockNavigate,
    ...contextValue,
  }

  return {
    ...render(<DetailContext.Provider value={value}>{ui}</DetailContext.Provider>),
    mockTransport,
    mockNavigate,
  }
}

describe("DetailProperties", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe("rendering", () => {
    it("renders with testId when provided", () => {
      renderWithContext(<DetailProperties testId="props" />)

      expect(screen.getByTestId("props")).toBeDefined()
    })

    it("renders Properties title", () => {
      renderWithContext(<DetailProperties />)

      expect(screen.getByText("Properties")).toBeDefined()
    })

    it("renders type badge", () => {
      const issue = createMockIssue({ issue_type: "feature" })
      renderWithContext(<DetailProperties />, { issue })

      expect(screen.getByText("Feature")).toBeDefined()
    })

    it("renders status dropdown with correct value", () => {
      const issue = createMockIssue({ status: "in_progress" })
      renderWithContext(<DetailProperties />, { issue })

      const select = screen.getByDisplayValue("In progress")
      expect(select).toBeDefined()
    })

    it("renders priority dropdown with correct value", () => {
      const issue = createMockIssue({ priority: 1 })
      renderWithContext(<DetailProperties />, { issue })

      // Priority 1 is "High" with emoji - query by class directly
      const select = document.querySelector("select.badge--priority") as HTMLSelectElement
      expect(select).toBeDefined()
      expect(select.classList.contains("is-p1")).toBe(true)
      expect(select.value).toBe("1")
    })

    it("renders assignee", () => {
      const issue = createMockIssue({ assignee: "bob" })
      renderWithContext(<DetailProperties />, { issue })

      expect(screen.getByText("bob")).toBeDefined()
    })

    it("renders Unassigned when no assignee", () => {
      const issue = createMockIssue({ assignee: "" })
      renderWithContext(<DetailProperties />, { issue })

      expect(screen.getByText("Unassigned")).toBeDefined()
    })

    it("renders delete button", () => {
      renderWithContext(<DetailProperties />)

      expect(screen.getByRole("button", { name: "Delete issue" })).toBeDefined()
    })
  })

  describe("type badge", () => {
    it("renders bug type correctly", () => {
      const issue = createMockIssue({ issue_type: "bug" })
      renderWithContext(<DetailProperties />, { issue })

      const badge = screen.getByText("Bug")
      expect(badge.classList.contains("type-badge--bug")).toBe(true)
    })

    it("renders task type correctly", () => {
      const issue = createMockIssue({ issue_type: "task" })
      renderWithContext(<DetailProperties />, { issue })

      const badge = screen.getByText("Task")
      expect(badge.classList.contains("type-badge--task")).toBe(true)
    })

    it("renders epic type correctly", () => {
      const issue = createMockIssue({ issue_type: "epic" })
      renderWithContext(<DetailProperties />, { issue })

      const badge = screen.getByText("Epic")
      expect(badge.classList.contains("type-badge--epic")).toBe(true)
    })

    it("renders neutral badge for unknown type", () => {
      const issue = createMockIssue({ issue_type: "unknown" })
      renderWithContext(<DetailProperties />, { issue })

      const badge = screen.getByText("\u2014") // em-dash
      expect(badge.classList.contains("type-badge--neutral")).toBe(true)
    })
  })

  describe("status change", () => {
    it("calls transport when status changes", async () => {
      const issue = createMockIssue({ status: "open" })
      const { mockTransport } = renderWithContext(<DetailProperties />, { issue })

      const select = screen.getByDisplayValue("Open")
      await act(async () => {
        fireEvent.change(select, { target: { value: "in_progress" } })
      })

      expect(mockTransport).toHaveBeenCalledWith("update-status", {
        id: "test-1",
        status: "in_progress",
      })
    })

    it("does not call transport when status is unchanged", async () => {
      const issue = createMockIssue({ status: "open" })
      const { mockTransport } = renderWithContext(<DetailProperties />, { issue })

      const select = screen.getByDisplayValue("Open")
      await act(async () => {
        fireEvent.change(select, { target: { value: "open" } })
      })

      expect(mockTransport).not.toHaveBeenCalled()
    })

    it("disables select while pending", async () => {
      const issue = createMockIssue({ status: "open" })

      // Create a transport that doesn't resolve
      const mockTransport = vi.fn().mockImplementation(() => new Promise(() => {}))
      renderWithContext(<DetailProperties />, { issue, transport: mockTransport })

      const select = screen.getByDisplayValue("Open") as HTMLSelectElement
      await act(async () => {
        fireEvent.change(select, { target: { value: "in_progress" } })
      })

      expect(select.disabled).toBe(true)
    })
  })

  describe("priority change", () => {
    it("calls transport when priority changes", async () => {
      const issue = createMockIssue({ priority: 2 })
      const { mockTransport } = renderWithContext(<DetailProperties />, { issue })

      const select = document.querySelector("select.badge--priority") as HTMLSelectElement
      await act(async () => {
        fireEvent.change(select, { target: { value: "4" } })
      })

      expect(mockTransport).toHaveBeenCalledWith("update-priority", {
        id: "test-1",
        priority: 4,
      })
    })

    it("does not call transport when priority is unchanged", async () => {
      const issue = createMockIssue({ priority: 2 })
      const { mockTransport } = renderWithContext(<DetailProperties />, { issue })

      const select = document.querySelector("select.badge--priority") as HTMLSelectElement
      await act(async () => {
        fireEvent.change(select, { target: { value: "2" } })
      })

      expect(mockTransport).not.toHaveBeenCalled()
    })
  })

  describe("assignee edit", () => {
    it("enters edit mode when clicking assignee", () => {
      const issue = createMockIssue({ assignee: "alice" })
      renderWithContext(<DetailProperties />, { issue })

      const span = screen.getByRole("button", { name: "Edit assignee" })
      fireEvent.click(span)

      expect(screen.getByRole("textbox", { name: "Edit assignee" })).toBeDefined()
    })

    it("enters edit mode when pressing Enter on assignee", () => {
      const issue = createMockIssue({ assignee: "alice" })
      renderWithContext(<DetailProperties />, { issue })

      const span = screen.getByRole("button", { name: "Edit assignee" })
      fireEvent.keyDown(span, { key: "Enter" })

      expect(screen.getByRole("textbox", { name: "Edit assignee" })).toBeDefined()
    })

    it("focuses input when entering edit mode", () => {
      const issue = createMockIssue({ assignee: "alice" })
      renderWithContext(<DetailProperties />, { issue })

      const span = screen.getByRole("button", { name: "Edit assignee" })
      fireEvent.click(span)

      const input = screen.getByRole("textbox", { name: "Edit assignee" })
      expect(document.activeElement).toBe(input)
    })

    it("pre-fills input with current assignee", () => {
      const issue = createMockIssue({ assignee: "alice" })
      renderWithContext(<DetailProperties />, { issue })

      const span = screen.getByRole("button", { name: "Edit assignee" })
      fireEvent.click(span)

      const input = screen.getByRole("textbox", { name: "Edit assignee" }) as HTMLInputElement
      expect(input.value).toBe("alice")
    })

    it("cancels edit when pressing Escape", () => {
      const issue = createMockIssue({ assignee: "alice" })
      renderWithContext(<DetailProperties />, { issue })

      const span = screen.getByRole("button", { name: "Edit assignee" })
      fireEvent.click(span)

      const input = screen.getByRole("textbox", { name: "Edit assignee" })
      fireEvent.change(input, { target: { value: "bob" } })
      fireEvent.keyDown(input, { key: "Escape" })

      expect(screen.getByText("alice")).toBeDefined()
      expect(screen.queryByRole("textbox")).toBeNull()
    })

    it("cancels edit when clicking Cancel button", () => {
      const issue = createMockIssue({ assignee: "alice" })
      renderWithContext(<DetailProperties />, { issue })

      const span = screen.getByRole("button", { name: "Edit assignee" })
      fireEvent.click(span)

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

      expect(screen.getByText("alice")).toBeDefined()
      expect(screen.queryByRole("textbox")).toBeNull()
    })

    it("saves assignee when pressing Enter", async () => {
      const issue = createMockIssue({ assignee: "alice" })
      const { mockTransport } = renderWithContext(<DetailProperties />, { issue })

      const span = screen.getByRole("button", { name: "Edit assignee" })
      fireEvent.click(span)

      const input = screen.getByRole("textbox", { name: "Edit assignee" })
      fireEvent.change(input, { target: { value: "bob" } })

      await act(async () => {
        fireEvent.keyDown(input, { key: "Enter" })
      })

      expect(mockTransport).toHaveBeenCalledWith("update-assignee", {
        id: "test-1",
        assignee: "bob",
      })
    })

    it("saves assignee when clicking Save button", async () => {
      const issue = createMockIssue({ assignee: "alice" })
      const { mockTransport } = renderWithContext(<DetailProperties />, { issue })

      const span = screen.getByRole("button", { name: "Edit assignee" })
      fireEvent.click(span)

      const input = screen.getByRole("textbox", { name: "Edit assignee" })
      fireEvent.change(input, { target: { value: "bob" } })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Save" }))
      })

      expect(mockTransport).toHaveBeenCalledWith("update-assignee", {
        id: "test-1",
        assignee: "bob",
      })
    })

    it("does not save if assignee is unchanged", async () => {
      const issue = createMockIssue({ assignee: "alice" })
      const { mockTransport } = renderWithContext(<DetailProperties />, { issue })

      const span = screen.getByRole("button", { name: "Edit assignee" })
      fireEvent.click(span)

      const input = screen.getByRole("textbox", { name: "Edit assignee" })

      await act(async () => {
        fireEvent.keyDown(input, { key: "Enter" })
      })

      expect(mockTransport).not.toHaveBeenCalled()
    })

    it("trims whitespace when saving assignee", async () => {
      const issue = createMockIssue({ assignee: "alice" })
      const { mockTransport } = renderWithContext(<DetailProperties />, { issue })

      const span = screen.getByRole("button", { name: "Edit assignee" })
      fireEvent.click(span)

      const input = screen.getByRole("textbox", { name: "Edit assignee" })
      fireEvent.change(input, { target: { value: "  bob  " } })

      await act(async () => {
        fireEvent.keyDown(input, { key: "Enter" })
      })

      expect(mockTransport).toHaveBeenCalledWith("update-assignee", {
        id: "test-1",
        assignee: "bob",
      })
    })

    it("shows Unassigned with muted class when assignee is empty", () => {
      const issue = createMockIssue({ assignee: "" })
      renderWithContext(<DetailProperties />, { issue })

      const span = screen.getByText("Unassigned")
      expect(span.classList.contains("muted")).toBe(true)
    })

    it("can clear assignee to empty string", async () => {
      const issue = createMockIssue({ assignee: "alice" })
      const { mockTransport } = renderWithContext(<DetailProperties />, { issue })

      const span = screen.getByRole("button", { name: "Edit assignee" })
      fireEvent.click(span)

      const input = screen.getByRole("textbox", { name: "Edit assignee" })
      fireEvent.change(input, { target: { value: "" } })

      await act(async () => {
        fireEvent.keyDown(input, { key: "Enter" })
      })

      expect(mockTransport).toHaveBeenCalledWith("update-assignee", {
        id: "test-1",
        assignee: "",
      })
    })

    it("shows saving state while request is in progress", async () => {
      const issue = createMockIssue({ assignee: "alice" })

      let resolveTransport: () => void
      const mockTransport = vi.fn().mockImplementation(
        () =>
          new Promise<void>(resolve => {
            resolveTransport = resolve
          }),
      )

      renderWithContext(<DetailProperties />, { issue, transport: mockTransport })

      const span = screen.getByRole("button", { name: "Edit assignee" })
      fireEvent.click(span)

      const input = screen.getByRole("textbox", { name: "Edit assignee" })
      fireEvent.change(input, { target: { value: "bob" } })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Save" }))
      })

      expect(screen.getByRole("button", { name: "Saving..." })).toBeDefined()
      expect(input).toHaveProperty("disabled", true)

      await act(async () => {
        resolveTransport!()
      })

      await waitFor(() => {
        expect(screen.queryByRole("textbox")).toBeNull()
      })
    })

    it("stays in edit mode if save fails", async () => {
      const issue = createMockIssue({ assignee: "alice" })
      const mockTransport = vi.fn().mockRejectedValue(new Error("Network error"))

      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

      renderWithContext(<DetailProperties />, { issue, transport: mockTransport })

      const span = screen.getByRole("button", { name: "Edit assignee" })
      fireEvent.click(span)

      const input = screen.getByRole("textbox", { name: "Edit assignee" })
      fireEvent.change(input, { target: { value: "bob" } })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Save" }))
      })

      await waitFor(() => {
        expect(screen.getByRole("textbox", { name: "Edit assignee" })).toBeDefined()
      })

      consoleError.mockRestore()
    })
  })

  describe("delete button", () => {
    it("calls onDelete when delete button is clicked", () => {
      const onDelete = vi.fn()
      renderWithContext(<DetailProperties onDelete={onDelete} />)

      fireEvent.click(screen.getByRole("button", { name: "Delete issue" }))

      expect(onDelete).toHaveBeenCalled()
    })

    it("does not propagate click event", () => {
      const onDelete = vi.fn()
      const parentClick = vi.fn()

      renderWithContext(
        <div onClick={parentClick}>
          <DetailProperties onDelete={onDelete} />
        </div>,
      )

      fireEvent.click(screen.getByRole("button", { name: "Delete issue" }))

      expect(onDelete).toHaveBeenCalled()
      expect(parentClick).not.toHaveBeenCalled()
    })
  })

  describe("edge cases", () => {
    it("handles null issue gracefully", () => {
      renderWithContext(<DetailProperties />, { issue: null })

      // Should render with defaults
      expect(screen.getByText("Properties")).toBeDefined()
      expect(screen.getByText("Unassigned")).toBeDefined()
    })

    it("handles missing issue_type gracefully", () => {
      const issue = { ...createMockIssue(), issue_type: undefined } as unknown as IssueDetail
      renderWithContext(<DetailProperties />, { issue })

      // Should show em-dash for unknown type
      expect(screen.getByText("\u2014")).toBeDefined()
    })

    it("handles null priority gracefully", () => {
      const issue = { ...createMockIssue(), priority: null } as unknown as IssueDetail
      renderWithContext(<DetailProperties />, { issue })

      // Should default to priority 2
      const select = document.querySelector("select.badge--priority") as HTMLSelectElement
      expect(select.value).toBe("2")
    })
  })
})
