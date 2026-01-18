/**
 * Tests for the IssueDialog component.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { IssueDialog } from "./IssueDialog.js"

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
})

describe("IssueDialog", () => {
  const mockOnClose = vi.fn()

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("rendering", () => {
    it("renders nothing when not open", () => {
      const { container } = render(
        <IssueDialog isOpen={false} issueId="UI-123" onClose={mockOnClose}>
          <div>Content</div>
        </IssueDialog>,
      )

      expect(container.querySelector("dialog")).toBeNull()
    })

    it("renders nothing when no issueId", () => {
      const { container } = render(
        <IssueDialog isOpen={true} issueId={null} onClose={mockOnClose}>
          <div>Content</div>
        </IssueDialog>,
      )

      expect(container.querySelector("dialog")).toBeNull()
    })

    it("renders dialog when open with issueId", () => {
      render(
        <IssueDialog isOpen={true} issueId="UI-123" onClose={mockOnClose}>
          <div>Content</div>
        </IssueDialog>,
      )

      const dialog = document.querySelector("dialog")
      expect(dialog).toBeDefined()
    })

    it("renders with correct id and attributes", () => {
      render(
        <IssueDialog isOpen={true} issueId="UI-123" onClose={mockOnClose}>
          <div>Content</div>
        </IssueDialog>,
      )

      const dialog = document.querySelector("dialog")
      expect(dialog?.id).toBe("issue-dialog")
      expect(dialog?.getAttribute("role")).toBe("dialog")
      expect(dialog?.getAttribute("aria-modal")).toBe("true")
    })

    it("renders header with issue ID", () => {
      render(
        <IssueDialog isOpen={true} issueId="UI-123" onClose={mockOnClose}>
          <div>Content</div>
        </IssueDialog>,
      )

      // The IssueIdRenderer displays the issue ID
      expect(screen.getByText("UI-123")).toBeDefined()
    })

    it("renders close button in header", () => {
      render(
        <IssueDialog isOpen={true} issueId="UI-123" onClose={mockOnClose}>
          <div>Content</div>
        </IssueDialog>,
      )

      const closeButton = screen.getByRole("button", { name: "Close" })
      expect(closeButton).toBeDefined()
    })

    it("renders children in body", () => {
      render(
        <IssueDialog isOpen={true} issueId="UI-123" onClose={mockOnClose}>
          <div data-testid="child-content">Child Content</div>
        </IssueDialog>,
      )

      expect(screen.getByTestId("child-content")).toBeDefined()
      expect(screen.getByText("Child Content")).toBeDefined()
    })

    it("renders with testId when provided", () => {
      render(
        <IssueDialog isOpen={true} issueId="UI-123" onClose={mockOnClose} testId="my-dialog">
          <div>Content</div>
        </IssueDialog>,
      )

      expect(screen.getByTestId("my-dialog")).toBeDefined()
    })
  })

  describe("opening and closing", () => {
    it("calls showModal when opening", () => {
      const showModalSpy = vi.spyOn(HTMLDialogElement.prototype, "showModal")

      render(
        <IssueDialog isOpen={true} issueId="UI-123" onClose={mockOnClose}>
          <div>Content</div>
        </IssueDialog>,
      )

      expect(showModalSpy).toHaveBeenCalled()
    })

    it("calls onClose when close button clicked", () => {
      render(
        <IssueDialog isOpen={true} issueId="UI-123" onClose={mockOnClose}>
          <div>Content</div>
        </IssueDialog>,
      )

      const closeButton = screen.getByRole("button", { name: "Close" })
      fireEvent.click(closeButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it("calls onClose on cancel event (Escape key)", () => {
      render(
        <IssueDialog isOpen={true} issueId="UI-123" onClose={mockOnClose}>
          <div>Content</div>
        </IssueDialog>,
      )

      const dialog = document.querySelector("dialog")!
      // Simulate cancel event (what happens when Escape is pressed on a dialog)
      const cancelEvent = new Event("cancel", { bubbles: false, cancelable: true })
      dialog.dispatchEvent(cancelEvent)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it("calls onClose on backdrop click", () => {
      render(
        <IssueDialog isOpen={true} issueId="UI-123" onClose={mockOnClose}>
          <div>Content</div>
        </IssueDialog>,
      )

      const dialog = document.querySelector("dialog")!
      // Simulate clicking on the dialog itself (backdrop)
      fireEvent.mouseDown(dialog)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it("does not close when clicking inside container", () => {
      render(
        <IssueDialog isOpen={true} issueId="UI-123" onClose={mockOnClose}>
          <div data-testid="inside">Content</div>
        </IssueDialog>,
      )

      const inside = screen.getByTestId("inside")
      fireEvent.mouseDown(inside)

      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe("structure", () => {
    it("has correct dialog structure", () => {
      render(
        <IssueDialog isOpen={true} issueId="UI-123" onClose={mockOnClose}>
          <div>Content</div>
        </IssueDialog>,
      )

      const dialog = document.querySelector("dialog")!

      // Has container
      expect(dialog.querySelector(".issue-dialog__container")).toBeDefined()

      // Has header
      expect(dialog.querySelector(".issue-dialog__header")).toBeDefined()

      // Has title
      expect(dialog.querySelector(".issue-dialog__title")).toBeDefined()

      // Has close button
      expect(dialog.querySelector(".issue-dialog__close")).toBeDefined()

      // Has body
      expect(dialog.querySelector(".issue-dialog__body")).toBeDefined()
    })

    it("has body with correct id", () => {
      render(
        <IssueDialog isOpen={true} issueId="UI-123" onClose={mockOnClose}>
          <div>Content</div>
        </IssueDialog>,
      )

      expect(document.getElementById("issue-dialog-body")).toBeDefined()
    })
  })

  describe("issue ID display", () => {
    it("displays different issue IDs", () => {
      const { rerender } = render(
        <IssueDialog isOpen={true} issueId="UI-123" onClose={mockOnClose}>
          <div>Content</div>
        </IssueDialog>,
      )

      expect(screen.getByText("UI-123")).toBeDefined()

      rerender(
        <IssueDialog isOpen={true} issueId="UI-456" onClose={mockOnClose}>
          <div>Content</div>
        </IssueDialog>,
      )

      expect(screen.getByText("UI-456")).toBeDefined()
    })
  })
})
