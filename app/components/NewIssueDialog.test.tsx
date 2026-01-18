/**
 * Tests for the NewIssueDialog component.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { clearTransportInstance, setTransportInstance } from "../hooks/use-transport.js"
import { NewIssueDialog } from "./NewIssueDialog.js"

// Mock the HTMLDialogElement methods that aren't available in jsdom
beforeEach(() => {
  // Mock showModal if not available
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute("open", "")
    })
  }
  // Mock close if not available
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute("open")
    })
  }

  // Clear localStorage between tests
  window.localStorage.clear()
})

afterEach(() => {
  vi.clearAllMocks()
  clearTransportInstance()
  window.localStorage.clear()
})

/**
 * Helper to type into an input using fireEvent.
 */
function typeIntoInput(element: HTMLElement, value: string): void {
  fireEvent.change(element, { target: { value } })
}

describe("NewIssueDialog", () => {
  const mockOnClose = vi.fn()
  const mockOnCreated = vi.fn()
  const mockTransport = vi.fn()

  beforeEach(() => {
    setTransportInstance(mockTransport)
    mockTransport.mockResolvedValue({})
  })

  describe("rendering", () => {
    it("renders nothing when not open", () => {
      const { container } = render(<NewIssueDialog isOpen={false} onClose={mockOnClose} />)

      expect(container.querySelector("dialog")).toBeNull()
    })

    it("renders dialog when open", () => {
      render(<NewIssueDialog isOpen={true} onClose={mockOnClose} />)

      const dialog = document.querySelector("dialog")
      expect(dialog).toBeDefined()
    })

    it("renders with correct id and attributes", () => {
      render(<NewIssueDialog isOpen={true} onClose={mockOnClose} />)

      const dialog = document.querySelector("dialog")
      expect(dialog?.id).toBe("new-issue-dialog")
      expect(dialog?.getAttribute("role")).toBe("dialog")
      expect(dialog?.getAttribute("aria-modal")).toBe("true")
    })

    it("renders header with title", () => {
      render(<NewIssueDialog isOpen={true} onClose={mockOnClose} />)

      expect(screen.getByText("New Issue")).toBeDefined()
    })

    it("renders close button in header", () => {
      render(<NewIssueDialog isOpen={true} onClose={mockOnClose} />)

      const closeButton = screen.getByRole("button", { name: "Close" })
      expect(closeButton).toBeDefined()
    })

    it("renders with testId when provided", () => {
      render(<NewIssueDialog isOpen={true} onClose={mockOnClose} testId="my-dialog" />)

      expect(screen.getByTestId("my-dialog")).toBeDefined()
    })
  })

  describe("form fields", () => {
    it("renders title input", () => {
      render(<NewIssueDialog isOpen={true} onClose={mockOnClose} />)

      const input = screen.getByLabelText("Title")
      expect(input).toBeDefined()
      expect(input.getAttribute("placeholder")).toBe("Short summary")
    })

    it("renders type select with options", () => {
      render(<NewIssueDialog isOpen={true} onClose={mockOnClose} />)

      const select = screen.getByLabelText("Issue type")
      expect(select).toBeDefined()

      // Check for options
      const options = select.querySelectorAll("option")
      expect(options.length).toBe(6) // "— Select —" + 5 types
      expect(options[0]?.textContent).toBe("— Select —")
      expect(options[1]?.textContent).toBe("Bug")
      expect(options[2]?.textContent).toBe("Feature")
      expect(options[3]?.textContent).toBe("Task")
      expect(options[4]?.textContent).toBe("Epic")
      expect(options[5]?.textContent).toBe("Chore")
    })

    it("renders priority select with options", () => {
      render(<NewIssueDialog isOpen={true} onClose={mockOnClose} />)

      const select = screen.getByLabelText("Priority")
      expect(select).toBeDefined()

      const options = select.querySelectorAll("option")
      expect(options.length).toBe(5) // 0-4
      expect(options[0]?.textContent).toBe("0 – Critical")
      expect(options[1]?.textContent).toBe("1 – High")
      expect(options[2]?.textContent).toBe("2 – Medium")
      expect(options[3]?.textContent).toBe("3 – Low")
      expect(options[4]?.textContent).toBe("4 – Backlog")
    })

    it("renders labels input", () => {
      render(<NewIssueDialog isOpen={true} onClose={mockOnClose} />)

      const input = document.getElementById("new-labels")
      expect(input).toBeDefined()
      expect(input?.getAttribute("placeholder")).toBe("comma,separated")
    })

    it("renders description textarea", () => {
      render(<NewIssueDialog isOpen={true} onClose={mockOnClose} />)

      const textarea = document.getElementById("new-description")
      expect(textarea).toBeDefined()
      expect(textarea?.getAttribute("placeholder")).toBe("Optional markdown description")
    })

    it("renders cancel and create buttons", () => {
      render(<NewIssueDialog isOpen={true} onClose={mockOnClose} />)

      expect(screen.getByRole("button", { name: /Cancel/i })).toBeDefined()
      expect(screen.getByRole("button", { name: /Create/i })).toBeDefined()
    })
  })

  describe("opening and closing", () => {
    it("calls showModal when opening", () => {
      const showModalSpy = vi.spyOn(HTMLDialogElement.prototype, "showModal")

      render(<NewIssueDialog isOpen={true} onClose={mockOnClose} />)

      expect(showModalSpy).toHaveBeenCalled()
    })

    it("calls onClose when close button clicked", () => {
      render(<NewIssueDialog isOpen={true} onClose={mockOnClose} />)

      const closeButton = screen.getByRole("button", { name: "Close" })
      fireEvent.click(closeButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it("calls onClose when cancel button clicked", () => {
      render(<NewIssueDialog isOpen={true} onClose={mockOnClose} />)

      const cancelButton = screen.getByRole("button", { name: /Cancel/i })
      fireEvent.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it("calls onClose on cancel event (Escape key)", () => {
      render(<NewIssueDialog isOpen={true} onClose={mockOnClose} />)

      const dialog = document.querySelector("dialog")!
      const cancelEvent = new Event("cancel", { bubbles: false, cancelable: true })
      dialog.dispatchEvent(cancelEvent)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it("calls onClose on backdrop click", () => {
      render(<NewIssueDialog isOpen={true} onClose={mockOnClose} />)

      const dialog = document.querySelector("dialog")!
      fireEvent.mouseDown(dialog)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it("does not close when clicking inside container", () => {
      render(<NewIssueDialog isOpen={true} onClose={mockOnClose} />)

      const form = document.getElementById("new-issue-form")!
      fireEvent.mouseDown(form)

      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe("form validation", () => {
    it("shows error when title is empty", async () => {
      render(<NewIssueDialog isOpen={true} onClose={mockOnClose} />)

      const form = document.getElementById("new-issue-form")!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByText("Title is required")).toBeDefined()
      })

      expect(mockTransport).not.toHaveBeenCalled()
    })

    it("shows error when title is whitespace only", async () => {
      render(<NewIssueDialog isOpen={true} onClose={mockOnClose} />)

      const titleInput = screen.getByLabelText("Title")
      typeIntoInput(titleInput, "   ")

      const form = document.getElementById("new-issue-form")!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByText("Title is required")).toBeDefined()
      })
    })
  })

  describe("form submission", () => {
    it("sends create-issue message with title only", async () => {
      mockTransport.mockResolvedValueOnce({}) // create-issue
      mockTransport.mockResolvedValueOnce([]) // list-issues

      render(<NewIssueDialog isOpen={true} onClose={mockOnClose} onCreated={mockOnCreated} />)

      const titleInput = screen.getByLabelText("Title")
      typeIntoInput(titleInput, "Test Issue")

      const createButton = screen.getByRole("button", { name: /Create/i })
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(mockTransport).toHaveBeenCalledWith(
          "create-issue",
          expect.objectContaining({
            title: "Test Issue",
            priority: 2, // default
          }),
        )
      })
    })

    it("sends create-issue message with all fields", async () => {
      mockTransport.mockResolvedValueOnce({}) // create-issue
      mockTransport.mockResolvedValueOnce([]) // list-issues

      render(<NewIssueDialog isOpen={true} onClose={mockOnClose} />)

      const titleInput = screen.getByLabelText("Title")
      typeIntoInput(titleInput, "Test Issue")

      const typeSelect = screen.getByLabelText("Issue type")
      fireEvent.change(typeSelect, { target: { value: "bug" } })

      const prioritySelect = screen.getByLabelText("Priority")
      fireEvent.change(prioritySelect, { target: { value: "1" } })

      const descriptionInput = document.getElementById("new-description") as HTMLTextAreaElement
      typeIntoInput(descriptionInput, "Test description")

      const createButton = screen.getByRole("button", { name: /Create/i })
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(mockTransport).toHaveBeenCalledWith(
          "create-issue",
          expect.objectContaining({
            title: "Test Issue",
            type: "bug",
            priority: 1,
            description: "Test description",
          }),
        )
      })
    })

    it("closes dialog after successful creation", async () => {
      mockTransport.mockResolvedValueOnce({}) // create-issue
      mockTransport.mockResolvedValueOnce([]) // list-issues

      render(<NewIssueDialog isOpen={true} onClose={mockOnClose} />)

      const titleInput = screen.getByLabelText("Title")
      typeIntoInput(titleInput, "Test Issue")

      const createButton = screen.getByRole("button", { name: /Create/i })
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it("calls onCreated with issue ID when found", async () => {
      mockTransport.mockResolvedValueOnce({}) // create-issue
      mockTransport.mockResolvedValueOnce([{ id: "UI-123", title: "Test Issue", status: "open" }]) // list-issues

      render(<NewIssueDialog isOpen={true} onClose={mockOnClose} onCreated={mockOnCreated} />)

      const titleInput = screen.getByLabelText("Title")
      typeIntoInput(titleInput, "Test Issue")

      const createButton = screen.getByRole("button", { name: /Create/i })
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(mockOnCreated).toHaveBeenCalledWith("UI-123")
      })
    })

    it("picks highest numeric ID when multiple matches", async () => {
      mockTransport.mockResolvedValueOnce({}) // create-issue
      mockTransport.mockResolvedValueOnce([
        { id: "UI-100", title: "Test Issue", status: "open" },
        { id: "UI-150", title: "Test Issue", status: "open" },
        { id: "UI-125", title: "Test Issue", status: "open" },
      ]) // list-issues

      render(<NewIssueDialog isOpen={true} onClose={mockOnClose} onCreated={mockOnCreated} />)

      const titleInput = screen.getByLabelText("Title")
      typeIntoInput(titleInput, "Test Issue")

      const createButton = screen.getByRole("button", { name: /Create/i })
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(mockOnCreated).toHaveBeenCalledWith("UI-150")
      })
    })

    it("adds labels after creation", async () => {
      mockTransport.mockResolvedValueOnce({}) // create-issue
      mockTransport.mockResolvedValueOnce([{ id: "UI-123", title: "Test Issue", status: "open" }]) // list-issues
      mockTransport.mockResolvedValueOnce({}) // label-add 1
      mockTransport.mockResolvedValueOnce({}) // label-add 2

      render(<NewIssueDialog isOpen={true} onClose={mockOnClose} />)

      const titleInput = screen.getByLabelText("Title")
      typeIntoInput(titleInput, "Test Issue")

      const labelsInput = document.getElementById("new-labels") as HTMLInputElement
      typeIntoInput(labelsInput, "bug, urgent")

      const createButton = screen.getByRole("button", { name: /Create/i })
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(mockTransport).toHaveBeenCalledWith("label-add", { id: "UI-123", label: "bug" })
        expect(mockTransport).toHaveBeenCalledWith("label-add", { id: "UI-123", label: "urgent" })
      })
    })
  })

  describe("busy state", () => {
    it("disables form controls while busy", async () => {
      // Make transport hang
      mockTransport.mockImplementation(() => new Promise(() => {}))

      render(<NewIssueDialog isOpen={true} onClose={mockOnClose} />)

      const titleInput = screen.getByLabelText("Title") as HTMLInputElement
      typeIntoInput(titleInput, "Test Issue")

      const createButton = screen.getByRole("button", { name: /Create/i })
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(titleInput.disabled).toBe(true)
        expect((screen.getByLabelText("Issue type") as HTMLSelectElement).disabled).toBe(true)
        expect((screen.getByLabelText("Priority") as HTMLSelectElement).disabled).toBe(true)
        expect((document.getElementById("new-labels") as HTMLInputElement).disabled).toBe(true)
        expect((document.getElementById("new-description") as HTMLTextAreaElement).disabled).toBe(
          true,
        )
        expect(
          (screen.getByRole("button", { name: /Cancel/i }) as HTMLButtonElement).disabled,
        ).toBe(true)
        expect(screen.getByRole("button", { name: /Creating.../i })).toBeDefined()
      })
    })
  })

  describe("error handling", () => {
    it("shows error when create fails", async () => {
      mockTransport.mockRejectedValueOnce(new Error("Network error"))

      render(<NewIssueDialog isOpen={true} onClose={mockOnClose} />)

      const titleInput = screen.getByLabelText("Title")
      typeIntoInput(titleInput, "Test Issue")

      const createButton = screen.getByRole("button", { name: /Create/i })
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(screen.getByText("Failed to create issue")).toBeDefined()
      })

      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe("localStorage persistence", () => {
    it("saves type preference to localStorage", async () => {
      mockTransport.mockResolvedValueOnce({}) // create-issue
      mockTransport.mockResolvedValueOnce([]) // list-issues

      render(<NewIssueDialog isOpen={true} onClose={mockOnClose} />)

      const titleInput = screen.getByLabelText("Title")
      typeIntoInput(titleInput, "Test Issue")

      const typeSelect = screen.getByLabelText("Issue type")
      fireEvent.change(typeSelect, { target: { value: "bug" } })

      const createButton = screen.getByRole("button", { name: /Create/i })
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(window.localStorage.getItem("beads-ui.new.type")).toBe("bug")
      })
    })

    it("saves priority preference to localStorage", async () => {
      mockTransport.mockResolvedValueOnce({}) // create-issue
      mockTransport.mockResolvedValueOnce([]) // list-issues

      render(<NewIssueDialog isOpen={true} onClose={mockOnClose} />)

      const titleInput = screen.getByLabelText("Title")
      typeIntoInput(titleInput, "Test Issue")

      const prioritySelect = screen.getByLabelText("Priority")
      fireEvent.change(prioritySelect, { target: { value: "0" } })

      const createButton = screen.getByRole("button", { name: /Create/i })
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(window.localStorage.getItem("beads-ui.new.priority")).toBe("0")
      })
    })

    it("loads type preference from localStorage", () => {
      window.localStorage.setItem("beads-ui.new.type", "feature")

      render(<NewIssueDialog isOpen={true} onClose={mockOnClose} />)

      const typeSelect = screen.getByLabelText("Issue type") as HTMLSelectElement
      expect(typeSelect.value).toBe("feature")
    })

    it("loads priority preference from localStorage", () => {
      window.localStorage.setItem("beads-ui.new.priority", "1")

      render(<NewIssueDialog isOpen={true} onClose={mockOnClose} />)

      const prioritySelect = screen.getByLabelText("Priority") as HTMLSelectElement
      expect(prioritySelect.value).toBe("1")
    })

    it("uses default priority when localStorage is invalid", () => {
      window.localStorage.setItem("beads-ui.new.priority", "invalid")

      render(<NewIssueDialog isOpen={true} onClose={mockOnClose} />)

      const prioritySelect = screen.getByLabelText("Priority") as HTMLSelectElement
      expect(prioritySelect.value).toBe("2") // default to Medium
    })
  })

  describe("keyboard shortcuts", () => {
    it("submits on Ctrl+Enter", async () => {
      mockTransport.mockResolvedValueOnce({}) // create-issue
      mockTransport.mockResolvedValueOnce([]) // list-issues

      render(<NewIssueDialog isOpen={true} onClose={mockOnClose} />)

      const titleInput = screen.getByLabelText("Title")
      typeIntoInput(titleInput, "Test Issue")

      const form = document.getElementById("new-issue-form")!
      fireEvent.keyDown(form, { key: "Enter", ctrlKey: true })

      await waitFor(() => {
        expect(mockTransport).toHaveBeenCalledWith("create-issue", expect.anything())
      })
    })

    it("submits on Meta+Enter (Mac)", async () => {
      mockTransport.mockResolvedValueOnce({}) // create-issue
      mockTransport.mockResolvedValueOnce([]) // list-issues

      render(<NewIssueDialog isOpen={true} onClose={mockOnClose} />)

      const titleInput = screen.getByLabelText("Title")
      typeIntoInput(titleInput, "Test Issue")

      const form = document.getElementById("new-issue-form")!
      fireEvent.keyDown(form, { key: "Enter", metaKey: true })

      await waitFor(() => {
        expect(mockTransport).toHaveBeenCalledWith("create-issue", expect.anything())
      })
    })
  })
})
