/**
 * Tests for the EditableMarkdownField React component.
 */
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { EditableMarkdownField } from "./EditableMarkdownField.js"
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

describe("EditableMarkdownField", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("rendering in read mode", () => {
    it("renders markdown content", () => {
      renderWithContext(
        <EditableMarkdownField
          field="description"
          value="**Bold text** and *italic*"
          label="Description"
          placeholder="Description"
          testId="description-field"
        />,
      )

      // The markdown should be rendered
      const field = screen.getByTestId("description-field")
      expect(field).toBeDefined()

      // Check that strong tag is rendered
      const strongEl = field.querySelector("strong")
      expect(strongEl).toBeDefined()
      expect(strongEl?.textContent).toBe("Bold text")
    })

    it("renders placeholder when value is empty", () => {
      renderWithContext(
        <EditableMarkdownField
          field="description"
          value=""
          label="Description"
          placeholder="Add description..."
          testId="description-field"
        />,
      )

      expect(screen.getByText("Add description...")).toBeDefined()
    })

    it("renders placeholder when value is whitespace only", () => {
      renderWithContext(
        <EditableMarkdownField
          field="notes"
          value="   "
          label="Notes"
          placeholder="Add notes..."
          testId="notes-field"
        />,
      )

      expect(screen.getByText("Add notes...")).toBeDefined()
    })

    it("renders label when content is present", () => {
      renderWithContext(
        <EditableMarkdownField
          field="description"
          value="Some content"
          label="Description"
          placeholder="Description"
          testId="description-field"
        />,
      )

      expect(screen.getByText("Description")).toBeDefined()
    })

    it("does not render label when content is empty", () => {
      renderWithContext(
        <EditableMarkdownField
          field="description"
          value=""
          label="Description"
          placeholder="Add description..."
          testId="description-field"
        />,
      )

      // Label should not be visible when empty
      const label = screen.queryByText("Description")
      expect(label).toBeNull()
    })

    it("applies custom className", () => {
      renderWithContext(
        <EditableMarkdownField
          field="description"
          value="Content"
          label="Description"
          placeholder="Description"
          className="my-custom-class"
          testId="description-field"
        />,
      )

      const field = screen.getByTestId("description-field")
      expect(field.classList.contains("my-custom-class")).toBe(true)
    })

    it("uses label as default className when not provided", () => {
      renderWithContext(
        <EditableMarkdownField
          field="description"
          value="Content"
          label="Design"
          placeholder="Description"
          testId="description-field"
        />,
      )

      const field = screen.getByTestId("description-field")
      expect(field.classList.contains("design")).toBe(true)
    })

    it("renders editable content with correct accessibility attributes", () => {
      renderWithContext(
        <EditableMarkdownField
          field="description"
          value="Content"
          label="Description"
          placeholder="Description"
          testId="description-field"
        />,
      )

      const editable = screen.getByRole("button", { name: "Edit description" })
      expect(editable).toBeDefined()
      expect(editable.getAttribute("tabindex")).toBe("0")
      expect(editable.classList.contains("editable")).toBe(true)
    })
  })

  describe("entering edit mode", () => {
    it("enters edit mode when content is clicked", () => {
      renderWithContext(
        <EditableMarkdownField
          field="description"
          value="Some content"
          label="Description"
          placeholder="Description"
          testId="description-field"
        />,
      )

      const editable = screen.getByRole("button", { name: "Edit description" })
      fireEvent.click(editable)

      // Should now show textarea and buttons
      expect(screen.getByRole("textbox", { name: "Edit description" })).toBeDefined()
      expect(screen.getByRole("button", { name: "Save" })).toBeDefined()
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDefined()
    })

    it("enters edit mode when Enter is pressed", () => {
      renderWithContext(
        <EditableMarkdownField
          field="description"
          value="Some content"
          label="Description"
          placeholder="Description"
          testId="description-field"
        />,
      )

      const editable = screen.getByRole("button", { name: "Edit description" })
      fireEvent.keyDown(editable, { key: "Enter" })

      // Should now show textarea
      expect(screen.getByRole("textbox", { name: "Edit description" })).toBeDefined()
    })

    it("does not enter edit mode on Ctrl+Enter (that's for saving)", () => {
      renderWithContext(
        <EditableMarkdownField
          field="description"
          value="Some content"
          label="Description"
          placeholder="Description"
          testId="description-field"
        />,
      )

      const editable = screen.getByRole("button", { name: "Edit description" })
      fireEvent.keyDown(editable, { key: "Enter", ctrlKey: true })

      // Should not show textarea
      expect(screen.queryByRole("textbox")).toBeNull()
    })

    it("focuses textarea when entering edit mode", () => {
      renderWithContext(
        <EditableMarkdownField
          field="description"
          value="Some content"
          label="Description"
          placeholder="Description"
          testId="description-field"
        />,
      )

      const editable = screen.getByRole("button", { name: "Edit description" })
      fireEvent.click(editable)

      const textarea = screen.getByRole("textbox", { name: "Edit description" })
      expect(document.activeElement).toBe(textarea)
    })

    it("populates textarea with current value when entering edit mode", () => {
      renderWithContext(
        <EditableMarkdownField
          field="description"
          value="Existing content"
          label="Description"
          placeholder="Description"
          testId="description-field"
        />,
      )

      const editable = screen.getByRole("button", { name: "Edit description" })
      fireEvent.click(editable)

      const textarea = screen.getByRole("textbox", {
        name: "Edit description",
      }) as HTMLTextAreaElement
      expect(textarea.value).toBe("Existing content")
    })
  })

  describe("canceling edit", () => {
    it("cancels edit when Escape is pressed", () => {
      renderWithContext(
        <EditableMarkdownField
          field="description"
          value="Original content"
          label="Description"
          placeholder="Description"
          testId="description-field"
        />,
      )

      // Enter edit mode
      const editable = screen.getByRole("button", { name: "Edit description" })
      fireEvent.click(editable)

      // Modify the textarea
      const textarea = screen.getByRole("textbox", { name: "Edit description" })
      fireEvent.change(textarea, { target: { value: "Modified content" } })

      // Press Escape
      fireEvent.keyDown(textarea, { key: "Escape" })

      // Should be back to read mode with original content
      expect(screen.queryByRole("textbox")).toBeNull()
      // The original content should be displayed (as rendered markdown)
    })

    it("cancels edit when Cancel button is clicked", () => {
      renderWithContext(
        <EditableMarkdownField
          field="description"
          value="Original content"
          label="Description"
          placeholder="Description"
          testId="description-field"
        />,
      )

      // Enter edit mode
      const editable = screen.getByRole("button", { name: "Edit description" })
      fireEvent.click(editable)

      // Modify the textarea
      const textarea = screen.getByRole("textbox", { name: "Edit description" })
      fireEvent.change(textarea, { target: { value: "Modified content" } })

      // Click Cancel
      const cancelBtn = screen.getByRole("button", { name: "Cancel" })
      fireEvent.click(cancelBtn)

      // Should be back to read mode
      expect(screen.queryByRole("textbox")).toBeNull()
    })
  })

  describe("saving edit", () => {
    it("saves when Ctrl+Enter is pressed", async () => {
      const { mockTransport } = renderWithContext(
        <EditableMarkdownField
          field="description"
          value="Original content"
          label="Description"
          placeholder="Description"
          testId="description-field"
        />,
      )

      // Enter edit mode
      const editable = screen.getByRole("button", { name: "Edit description" })
      fireEvent.click(editable)

      // Type new content
      const textarea = screen.getByRole("textbox", { name: "Edit description" })
      fireEvent.change(textarea, { target: { value: "New content" } })

      // Press Ctrl+Enter
      await act(async () => {
        fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true })
      })

      // Should have called transport
      expect(mockTransport).toHaveBeenCalledWith("edit-text", {
        id: "test-1",
        field: "description",
        value: "New content",
      })
    })

    it("saves when Cmd+Enter is pressed (Mac)", async () => {
      const { mockTransport } = renderWithContext(
        <EditableMarkdownField
          field="description"
          value="Original content"
          label="Description"
          placeholder="Description"
          testId="description-field"
        />,
      )

      // Enter edit mode
      const editable = screen.getByRole("button", { name: "Edit description" })
      fireEvent.click(editable)

      // Type new content
      const textarea = screen.getByRole("textbox", { name: "Edit description" })
      fireEvent.change(textarea, { target: { value: "New content" } })

      // Press Cmd+Enter (metaKey)
      await act(async () => {
        fireEvent.keyDown(textarea, { key: "Enter", metaKey: true })
      })

      // Should have called transport
      expect(mockTransport).toHaveBeenCalledWith("edit-text", {
        id: "test-1",
        field: "description",
        value: "New content",
      })
    })

    it("saves when Save button is clicked", async () => {
      const { mockTransport } = renderWithContext(
        <EditableMarkdownField
          field="description"
          value="Original content"
          label="Description"
          placeholder="Description"
          testId="description-field"
        />,
      )

      // Enter edit mode
      const editable = screen.getByRole("button", { name: "Edit description" })
      fireEvent.click(editable)

      // Type new content
      const textarea = screen.getByRole("textbox", { name: "Edit description" })
      fireEvent.change(textarea, { target: { value: "New content" } })

      // Click Save
      const saveBtn = screen.getByRole("button", { name: "Save" })
      await act(async () => {
        fireEvent.click(saveBtn)
      })

      // Should have called transport
      expect(mockTransport).toHaveBeenCalledWith("edit-text", {
        id: "test-1",
        field: "description",
        value: "New content",
      })
    })

    it("does not save if content is unchanged", async () => {
      const { mockTransport } = renderWithContext(
        <EditableMarkdownField
          field="description"
          value="Same content"
          label="Description"
          placeholder="Description"
          testId="description-field"
        />,
      )

      // Enter edit mode
      const editable = screen.getByRole("button", { name: "Edit description" })
      fireEvent.click(editable)

      // Don't change anything, just press Ctrl+Enter
      const textarea = screen.getByRole("textbox", { name: "Edit description" })
      await act(async () => {
        fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true })
      })

      // Should not have called transport
      expect(mockTransport).not.toHaveBeenCalled()

      // Should exit edit mode
      expect(screen.queryByRole("textbox")).toBeNull()
    })

    it("does not trim whitespace when saving (preserves formatting)", async () => {
      const { mockTransport } = renderWithContext(
        <EditableMarkdownField
          field="description"
          value="Original"
          label="Description"
          placeholder="Description"
          testId="description-field"
        />,
      )

      // Enter edit mode
      const editable = screen.getByRole("button", { name: "Edit description" })
      fireEvent.click(editable)

      // Type content with whitespace (markdown may use trailing spaces for line breaks)
      const textarea = screen.getByRole("textbox", { name: "Edit description" })
      fireEvent.change(textarea, { target: { value: "Line 1  \nLine 2" } })

      // Press Ctrl+Enter
      await act(async () => {
        fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true })
      })

      // Should preserve the whitespace
      expect(mockTransport).toHaveBeenCalledWith("edit-text", {
        id: "test-1",
        field: "description",
        value: "Line 1  \nLine 2",
      })
    })

    it("shows saving state while request is in progress", async () => {
      // Create a transport that doesn't resolve immediately
      let resolveTransport: () => void
      const mockTransport = vi.fn().mockImplementation(
        () =>
          new Promise<void>(resolve => {
            resolveTransport = resolve
          }),
      )

      renderWithContext(
        <EditableMarkdownField
          field="description"
          value="Original"
          label="Description"
          placeholder="Description"
          testId="description-field"
        />,
        { transport: mockTransport },
      )

      // Enter edit mode
      const editable = screen.getByRole("button", { name: "Edit description" })
      fireEvent.click(editable)

      // Type and save
      const textarea = screen.getByRole("textbox", { name: "Edit description" })
      fireEvent.change(textarea, { target: { value: "New content" } })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Save" }))
      })

      // Should show saving state
      expect(screen.getByRole("button", { name: "Saving..." })).toBeDefined()
      expect(screen.getByRole("textbox", { name: "Edit description" })).toHaveProperty(
        "disabled",
        true,
      )

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
      // Create a transport that rejects
      const mockTransport = vi.fn().mockRejectedValue(new Error("Network error"))

      // Suppress console.error for this test
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

      renderWithContext(
        <EditableMarkdownField
          field="description"
          value="Original"
          label="Description"
          placeholder="Description"
          testId="description-field"
        />,
        { transport: mockTransport },
      )

      // Enter edit mode
      const editable = screen.getByRole("button", { name: "Edit description" })
      fireEvent.click(editable)

      // Type and save
      const textarea = screen.getByRole("textbox", { name: "Edit description" })
      fireEvent.change(textarea, { target: { value: "New content" } })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Save" }))
      })

      // Wait for the error to be handled
      await waitFor(() => {
        // Should still be in edit mode
        expect(screen.getByRole("textbox", { name: "Edit description" })).toBeDefined()
      })

      // The textarea should still have the new value so user can retry
      expect(
        (screen.getByRole("textbox", { name: "Edit description" }) as HTMLTextAreaElement).value,
      ).toBe("New content")

      consoleError.mockRestore()
    })

    it("disables buttons while saving", async () => {
      // Create a transport that doesn't resolve
      const mockTransport = vi.fn().mockImplementation(() => new Promise(() => {}))

      renderWithContext(
        <EditableMarkdownField
          field="description"
          value="Original"
          label="Description"
          placeholder="Description"
          testId="description-field"
        />,
        { transport: mockTransport },
      )

      // Enter edit mode
      const editable = screen.getByRole("button", { name: "Edit description" })
      fireEvent.click(editable)

      // Type and save
      const textarea = screen.getByRole("textbox", { name: "Edit description" })
      fireEvent.change(textarea, { target: { value: "New content" } })

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Save" }))
      })

      // Both buttons should be disabled
      expect(screen.getByRole("button", { name: "Saving..." })).toHaveProperty("disabled", true)
      expect(screen.getByRole("button", { name: "Cancel" })).toHaveProperty("disabled", true)
    })
  })

  describe("different field types", () => {
    it("saves to the correct field: design", async () => {
      const { mockTransport } = renderWithContext(
        <EditableMarkdownField
          field="design"
          value=""
          label="Design"
          placeholder="Add design..."
          testId="design-field"
        />,
      )

      // Enter edit mode
      const editable = screen.getByRole("button", { name: "Edit design" })
      fireEvent.click(editable)

      // Type content
      const textarea = screen.getByRole("textbox", { name: "Edit design" })
      fireEvent.change(textarea, { target: { value: "Design notes" } })

      // Save
      await act(async () => {
        fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true })
      })

      expect(mockTransport).toHaveBeenCalledWith("edit-text", {
        id: "test-1",
        field: "design",
        value: "Design notes",
      })
    })

    it("saves to the correct field: notes", async () => {
      const { mockTransport } = renderWithContext(
        <EditableMarkdownField
          field="notes"
          value=""
          label="Notes"
          placeholder="Add notes..."
          testId="notes-field"
        />,
      )

      // Enter edit mode
      const editable = screen.getByRole("button", { name: "Edit notes" })
      fireEvent.click(editable)

      // Type content
      const textarea = screen.getByRole("textbox", { name: "Edit notes" })
      fireEvent.change(textarea, { target: { value: "My notes" } })

      // Save
      await act(async () => {
        fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true })
      })

      expect(mockTransport).toHaveBeenCalledWith("edit-text", {
        id: "test-1",
        field: "notes",
        value: "My notes",
      })
    })

    it("saves to the correct field: acceptance", async () => {
      const { mockTransport } = renderWithContext(
        <EditableMarkdownField
          field="acceptance"
          value=""
          label="Acceptance Criteria"
          placeholder="Add acceptance criteria..."
          testId="acceptance-field"
        />,
      )

      // Enter edit mode
      const editable = screen.getByRole("button", { name: "Edit acceptance criteria" })
      fireEvent.click(editable)

      // Type content
      const textarea = screen.getByRole("textbox", { name: "Edit acceptance criteria" })
      fireEvent.change(textarea, { target: { value: "- [ ] Criteria 1" } })

      // Save
      await act(async () => {
        fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true })
      })

      expect(mockTransport).toHaveBeenCalledWith("edit-text", {
        id: "test-1",
        field: "acceptance",
        value: "- [ ] Criteria 1",
      })
    })
  })

  describe("markdown rendering", () => {
    it("renders basic markdown syntax", () => {
      // Use actual newlines for the markdown
      const markdownValue = `# Heading

- Item 1
- Item 2`

      renderWithContext(
        <EditableMarkdownField
          field="description"
          value={markdownValue}
          label="Description"
          placeholder="Description"
          testId="description-field"
        />,
      )

      const field = screen.getByTestId("description-field")

      // Check heading is rendered
      const heading = field.querySelector("h1")
      expect(heading).toBeDefined()
      expect(heading?.textContent).toBe("Heading")

      // Check list is rendered
      const listItems = field.querySelectorAll("li")
      expect(listItems.length).toBe(2)
    })

    it("sanitizes potentially dangerous HTML", () => {
      renderWithContext(
        <EditableMarkdownField
          field="description"
          value='<script>alert("xss")</script>Normal text'
          label="Description"
          placeholder="Description"
          testId="description-field"
        />,
      )

      const field = screen.getByTestId("description-field")

      // Script tag should be removed
      const scripts = field.querySelectorAll("script")
      expect(scripts.length).toBe(0)

      // Normal text should still be there
      expect(field.textContent).toContain("Normal text")
    })

    it("renders inline code", () => {
      renderWithContext(
        <EditableMarkdownField
          field="description"
          value="Use `const` for constants"
          label="Description"
          placeholder="Description"
          testId="description-field"
        />,
      )

      const field = screen.getByTestId("description-field")
      const code = field.querySelector("code")
      expect(code).toBeDefined()
      expect(code?.textContent).toBe("const")
    })

    it("renders links", () => {
      renderWithContext(
        <EditableMarkdownField
          field="description"
          value="Visit [example](https://example.com)"
          label="Description"
          placeholder="Description"
          testId="description-field"
        />,
      )

      const field = screen.getByTestId("description-field")
      const link = field.querySelector("a")
      expect(link).toBeDefined()
      expect(link?.getAttribute("href")).toBe("https://example.com")
      expect(link?.textContent).toBe("example")
    })
  })

  describe("edge cases", () => {
    it("handles null issue gracefully during save attempt", async () => {
      const { mockTransport } = renderWithContext(
        <EditableMarkdownField
          field="description"
          value="Content"
          label="Description"
          placeholder="Description"
          testId="description-field"
        />,
        { issue: null },
      )

      // Enter edit mode
      const editable = screen.getByRole("button", { name: "Edit description" })
      fireEvent.click(editable)

      // Try to save
      const textarea = screen.getByRole("textbox", { name: "Edit description" })
      fireEvent.change(textarea, { target: { value: "New content" } })

      await act(async () => {
        fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true })
      })

      // Should not call transport when issue is null
      expect(mockTransport).not.toHaveBeenCalled()
    })
  })
})
