/**
 * Tests for the DetailHeader React component.
 */
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { DetailHeader } from "./DetailHeader.js"
import { DetailContext, type DetailContextValue } from "./DetailView.js"
import type { IssueDetail } from "../../types/issues.js"

/**
 * Create a mock issue for testing.
 */
function createMockIssue(overrides: Partial<IssueDetail> = {}): IssueDetail {
  return {
    id: "test-1",
    title: "Test Issue Title",
    description: "Test description",
    status: "open",
    priority: 1,
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

describe("DetailHeader", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("rendering", () => {
    it("renders the issue title", () => {
      const issue = createMockIssue({ title: "My Test Title" })
      renderWithContext(<DetailHeader testId="header" />, { issue })

      expect(screen.getByText("My Test Title")).toBeDefined()
    })

    it("renders (no title) when title is empty", () => {
      const issue = createMockIssue({ title: "" })
      renderWithContext(<DetailHeader testId="header" />, { issue })

      expect(screen.getByText("(no title)")).toBeDefined()
    })

    it("renders with testId when provided", () => {
      renderWithContext(<DetailHeader testId="my-header" />)

      expect(screen.getByTestId("my-header")).toBeDefined()
    })

    it("renders the title as an editable span with correct accessibility attributes", () => {
      renderWithContext(<DetailHeader testId="header" />)

      const span = screen.getByRole("button", { name: "Edit title" })
      expect(span).toBeDefined()
      expect(span.getAttribute("tabindex")).toBe("0")
      expect(span.classList.contains("editable")).toBe(true)
    })
  })

  describe("entering edit mode", () => {
    it("enters edit mode when title is clicked", () => {
      renderWithContext(<DetailHeader testId="header" />)

      const span = screen.getByRole("button", { name: "Edit title" })
      fireEvent.click(span)

      // Should now show input and buttons
      expect(screen.getByRole("textbox", { name: "Edit title" })).toBeDefined()
      expect(screen.getByRole("button", { name: "Save" })).toBeDefined()
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDefined()
    })

    it("enters edit mode when Enter is pressed on title", () => {
      renderWithContext(<DetailHeader testId="header" />)

      const span = screen.getByRole("button", { name: "Edit title" })
      fireEvent.keyDown(span, { key: "Enter" })

      // Should now show input
      expect(screen.getByRole("textbox", { name: "Edit title" })).toBeDefined()
    })

    it("focuses input when entering edit mode", () => {
      const issue = createMockIssue({ title: "Existing Title" })
      renderWithContext(<DetailHeader testId="header" />, { issue })

      const span = screen.getByRole("button", { name: "Edit title" })
      fireEvent.click(span)

      const input = screen.getByRole("textbox", { name: "Edit title" }) as HTMLInputElement
      expect(document.activeElement).toBe(input)
      expect(input.value).toBe("Existing Title")
    })
  })

  describe("canceling edit", () => {
    it("cancels edit when Escape is pressed", () => {
      const issue = createMockIssue({ title: "Original Title" })
      renderWithContext(<DetailHeader testId="header" />, { issue })

      // Enter edit mode
      const span = screen.getByRole("button", { name: "Edit title" })
      fireEvent.click(span)

      // Modify the input
      const input = screen.getByRole("textbox", { name: "Edit title" })
      fireEvent.change(input, { target: { value: "Modified Title" } })

      // Press Escape
      fireEvent.keyDown(input, { key: "Escape" })

      // Should be back to read mode with original title
      expect(screen.getByText("Original Title")).toBeDefined()
      expect(screen.queryByRole("textbox")).toBeNull()
    })

    it("cancels edit when Cancel button is clicked", () => {
      const issue = createMockIssue({ title: "Original Title" })
      renderWithContext(<DetailHeader testId="header" />, { issue })

      // Enter edit mode
      const span = screen.getByRole("button", { name: "Edit title" })
      fireEvent.click(span)

      // Modify the input
      const input = screen.getByRole("textbox", { name: "Edit title" })
      fireEvent.change(input, { target: { value: "Modified Title" } })

      // Click Cancel
      const cancelBtn = screen.getByRole("button", { name: "Cancel" })
      fireEvent.click(cancelBtn)

      // Should be back to read mode with original title
      expect(screen.getByText("Original Title")).toBeDefined()
      expect(screen.queryByRole("textbox")).toBeNull()
    })
  })

  describe("saving edit", () => {
    it("saves when Enter is pressed", async () => {
      const issue = createMockIssue({ title: "Original Title" })
      const { mockTransport } = renderWithContext(<DetailHeader testId="header" />, { issue })

      // Enter edit mode
      const span = screen.getByRole("button", { name: "Edit title" })
      fireEvent.click(span)

      // Type new title
      const input = screen.getByRole("textbox", { name: "Edit title" })
      fireEvent.change(input, { target: { value: "New Title" } })

      // Press Enter
      await act(async () => {
        fireEvent.keyDown(input, { key: "Enter" })
      })

      // Should have called transport
      expect(mockTransport).toHaveBeenCalledWith("edit-text", {
        id: "test-1",
        field: "title",
        value: "New Title",
      })
    })

    it("saves when Save button is clicked", async () => {
      const issue = createMockIssue({ title: "Original Title" })
      const { mockTransport } = renderWithContext(<DetailHeader testId="header" />, { issue })

      // Enter edit mode
      const span = screen.getByRole("button", { name: "Edit title" })
      fireEvent.click(span)

      // Type new title
      const input = screen.getByRole("textbox", { name: "Edit title" })
      fireEvent.change(input, { target: { value: "New Title" } })

      // Click Save
      const saveBtn = screen.getByRole("button", { name: "Save" })
      await act(async () => {
        fireEvent.click(saveBtn)
      })

      // Should have called transport
      expect(mockTransport).toHaveBeenCalledWith("edit-text", {
        id: "test-1",
        field: "title",
        value: "New Title",
      })
    })

    it("does not save if title is unchanged", async () => {
      const issue = createMockIssue({ title: "Same Title" })
      const { mockTransport } = renderWithContext(<DetailHeader testId="header" />, { issue })

      // Enter edit mode
      const span = screen.getByRole("button", { name: "Edit title" })
      fireEvent.click(span)

      // Don't change anything, just press Enter
      const input = screen.getByRole("textbox", { name: "Edit title" })
      await act(async () => {
        fireEvent.keyDown(input, { key: "Enter" })
      })

      // Should not have called transport
      expect(mockTransport).not.toHaveBeenCalled()

      // Should exit edit mode
      expect(screen.queryByRole("textbox")).toBeNull()
    })

    it("trims whitespace when saving", async () => {
      const issue = createMockIssue({ title: "Original" })
      const { mockTransport } = renderWithContext(<DetailHeader testId="header" />, { issue })

      // Enter edit mode
      const span = screen.getByRole("button", { name: "Edit title" })
      fireEvent.click(span)

      // Type new title with whitespace
      const input = screen.getByRole("textbox", { name: "Edit title" })
      fireEvent.change(input, { target: { value: "  Trimmed Title  " } })

      // Press Enter
      await act(async () => {
        fireEvent.keyDown(input, { key: "Enter" })
      })

      // Should have called transport with trimmed value
      expect(mockTransport).toHaveBeenCalledWith("edit-text", {
        id: "test-1",
        field: "title",
        value: "Trimmed Title",
      })
    })

    it("shows saving state while request is in progress", async () => {
      const issue = createMockIssue({ title: "Original" })

      // Create a transport that doesn't resolve immediately
      let resolveTransport: () => void
      const mockTransport = vi.fn().mockImplementation(
        () =>
          new Promise<void>(resolve => {
            resolveTransport = resolve
          }),
      )

      renderWithContext(<DetailHeader testId="header" />, { issue, transport: mockTransport })

      // Enter edit mode
      const span = screen.getByRole("button", { name: "Edit title" })
      fireEvent.click(span)

      // Type and save
      const input = screen.getByRole("textbox", { name: "Edit title" })
      fireEvent.change(input, { target: { value: "New Title" } })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Save" }))
      })

      // Should show saving state
      expect(screen.getByRole("button", { name: "Saving..." })).toBeDefined()
      expect(screen.getByRole("textbox", { name: "Edit title" })).toHaveProperty("disabled", true)

      // Resolve the promise
      await act(async () => {
        resolveTransport!()
      })

      await waitFor(() => {
        // After saving, should exit edit mode
        expect(screen.queryByRole("textbox")).toBeNull()
      })
    })

    it("stays in edit mode if save fails", async () => {
      const issue = createMockIssue({ title: "Original" })

      // Create a transport that rejects
      const mockTransport = vi.fn().mockRejectedValue(new Error("Network error"))

      // Suppress console.error for this test
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

      renderWithContext(<DetailHeader testId="header" />, { issue, transport: mockTransport })

      // Enter edit mode
      const span = screen.getByRole("button", { name: "Edit title" })
      fireEvent.click(span)

      // Type and save
      const input = screen.getByRole("textbox", { name: "Edit title" })
      fireEvent.change(input, { target: { value: "New Title" } })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Save" }))
      })

      // Wait for the error to be handled
      await waitFor(() => {
        // Should still be in edit mode
        expect(screen.getByRole("textbox", { name: "Edit title" })).toBeDefined()
      })

      // The input should still have the new value so user can retry
      expect((screen.getByRole("textbox", { name: "Edit title" }) as HTMLInputElement).value).toBe(
        "New Title",
      )

      consoleError.mockRestore()
    })

    it("disables buttons while saving", async () => {
      const issue = createMockIssue({ title: "Original" })

      // Create a transport that doesn't resolve
      const mockTransport = vi.fn().mockImplementation(() => new Promise(() => {}))

      renderWithContext(<DetailHeader testId="header" />, { issue, transport: mockTransport })

      // Enter edit mode
      const span = screen.getByRole("button", { name: "Edit title" })
      fireEvent.click(span)

      // Type and save
      const input = screen.getByRole("textbox", { name: "Edit title" })
      fireEvent.change(input, { target: { value: "New Title" } })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Save" }))
      })

      // Both buttons should be disabled
      expect(screen.getByRole("button", { name: "Saving..." })).toHaveProperty("disabled", true)
      expect(screen.getByRole("button", { name: "Cancel" })).toHaveProperty("disabled", true)
    })
  })

  describe("edge cases", () => {
    it("handles null issue gracefully", () => {
      renderWithContext(<DetailHeader testId="header" />, { issue: null })

      // Should render (no title) when issue is null
      expect(screen.getByText("(no title)")).toBeDefined()
    })
  })
})
