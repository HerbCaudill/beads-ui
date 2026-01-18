/**
 * @vitest-environment jsdom
 *
 * Tests for the DeleteConfirmDialog React component.
 */
import { cleanup, render, screen, fireEvent } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { DeleteConfirmDialog } from "./DeleteConfirmDialog.js"

describe("DeleteConfirmDialog", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe("rendering", () => {
    it("renders nothing when isOpen is false", () => {
      render(
        <DeleteConfirmDialog
          isOpen={false}
          issueId="test-1"
          issueTitle="Test Issue"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      )

      expect(screen.queryByRole("alertdialog")).toBeNull()
    })

    it("renders dialog when isOpen is true", () => {
      render(
        <DeleteConfirmDialog
          isOpen={true}
          issueId="test-1"
          issueTitle="Test Issue"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      )

      expect(screen.getByRole("alertdialog")).toBeDefined()
    })

    it("displays the issue ID in the confirmation message", () => {
      render(
        <DeleteConfirmDialog
          isOpen={true}
          issueId="bui-123"
          issueTitle="Test Issue"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      )

      expect(screen.getByText("bui-123")).toBeDefined()
    })

    it("displays the issue title in the confirmation message", () => {
      render(
        <DeleteConfirmDialog
          isOpen={true}
          issueId="test-1"
          issueTitle="My Important Task"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      )

      expect(screen.getByText("My Important Task")).toBeDefined()
    })

    it("displays (no title) when issue title is empty", () => {
      render(
        <DeleteConfirmDialog
          isOpen={true}
          issueId="test-1"
          issueTitle=""
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      )

      expect(screen.getByText("(no title)")).toBeDefined()
    })

    it("renders Cancel and Delete buttons", () => {
      render(
        <DeleteConfirmDialog
          isOpen={true}
          issueId="test-1"
          issueTitle="Test Issue"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      )

      expect(screen.getByRole("button", { name: "Cancel" })).toBeDefined()
      expect(screen.getByRole("button", { name: "Delete" })).toBeDefined()
    })

    it("renders with custom testId when provided", () => {
      render(
        <DeleteConfirmDialog
          isOpen={true}
          issueId="test-1"
          issueTitle="Test Issue"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
          testId="my-custom-dialog"
        />,
      )

      expect(screen.getByTestId("my-custom-dialog")).toBeDefined()
    })

    it("uses default testId when not provided", () => {
      render(
        <DeleteConfirmDialog
          isOpen={true}
          issueId="test-1"
          issueTitle="Test Issue"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      )

      expect(screen.getByTestId("delete-confirm-dialog")).toBeDefined()
    })
  })

  describe("accessibility", () => {
    it("has role alertdialog", () => {
      render(
        <DeleteConfirmDialog
          isOpen={true}
          issueId="test-1"
          issueTitle="Test Issue"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      )

      const dialog = screen.getByRole("alertdialog")
      expect(dialog).toBeDefined()
    })

    it("has aria-modal attribute set to true", () => {
      render(
        <DeleteConfirmDialog
          isOpen={true}
          issueId="test-1"
          issueTitle="Test Issue"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      )

      const dialog = screen.getByRole("alertdialog")
      expect(dialog.getAttribute("aria-modal")).toBe("true")
    })
  })

  describe("interactions", () => {
    it("calls onConfirm when Delete button is clicked", () => {
      const on_confirm = vi.fn()

      render(
        <DeleteConfirmDialog
          isOpen={true}
          issueId="test-1"
          issueTitle="Test Issue"
          onConfirm={on_confirm}
          onCancel={vi.fn()}
        />,
      )

      fireEvent.click(screen.getByRole("button", { name: "Delete" }))

      expect(on_confirm).toHaveBeenCalledTimes(1)
    })

    it("calls onCancel when Cancel button is clicked", () => {
      const on_cancel = vi.fn()

      render(
        <DeleteConfirmDialog
          isOpen={true}
          issueId="test-1"
          issueTitle="Test Issue"
          onConfirm={vi.fn()}
          onCancel={on_cancel}
        />,
      )

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

      expect(on_cancel).toHaveBeenCalledTimes(1)
    })
  })

  describe("styling", () => {
    it("applies danger class to Delete button", () => {
      render(
        <DeleteConfirmDialog
          isOpen={true}
          issueId="test-1"
          issueTitle="Test Issue"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      )

      const delete_btn = screen.getByRole("button", { name: "Delete" })
      expect(delete_btn.classList.contains("danger")).toBe(true)
    })

    it("applies btn class to both buttons", () => {
      render(
        <DeleteConfirmDialog
          isOpen={true}
          issueId="test-1"
          issueTitle="Test Issue"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      )

      const cancel_btn = screen.getByRole("button", { name: "Cancel" })
      const delete_btn = screen.getByRole("button", { name: "Delete" })

      expect(cancel_btn.classList.contains("btn")).toBe(true)
      expect(delete_btn.classList.contains("btn")).toBe(true)
    })
  })
})
