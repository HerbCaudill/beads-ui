/**
 * @vitest-environment jsdom
 *
 * Tests for the FatalErrorDialog React component.
 */
import { cleanup, render, screen, fireEvent } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { FatalErrorDialog } from "./FatalErrorDialog.js"

describe("FatalErrorDialog", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe("rendering", () => {
    it("renders nothing when isOpen is false", () => {
      render(
        <FatalErrorDialog
          isOpen={false}
          title="Error"
          message="Something went wrong"
          onReload={vi.fn()}
          onDismiss={vi.fn()}
        />,
      )

      expect(screen.queryByRole("alertdialog")).toBeNull()
    })

    it("renders dialog when isOpen is true", () => {
      render(
        <FatalErrorDialog
          isOpen={true}
          title="Error"
          message="Something went wrong"
          onReload={vi.fn()}
          onDismiss={vi.fn()}
        />,
      )

      expect(screen.getByRole("alertdialog")).toBeDefined()
    })

    it("displays the error title", () => {
      render(
        <FatalErrorDialog
          isOpen={true}
          title="Command failed"
          message="Something went wrong"
          onReload={vi.fn()}
          onDismiss={vi.fn()}
        />,
      )

      expect(screen.getByText("Command failed")).toBeDefined()
    })

    it("displays the error message", () => {
      render(
        <FatalErrorDialog
          isOpen={true}
          title="Error"
          message="The backend crashed unexpectedly"
          onReload={vi.fn()}
          onDismiss={vi.fn()}
        />,
      )

      expect(screen.getByText("The backend crashed unexpectedly")).toBeDefined()
    })

    it("displays default title when title is empty", () => {
      render(
        <FatalErrorDialog
          isOpen={true}
          title=""
          message="Something went wrong"
          onReload={vi.fn()}
          onDismiss={vi.fn()}
        />,
      )

      expect(screen.getByText("Unexpected Error")).toBeDefined()
    })

    it("displays default message when message is empty", () => {
      render(
        <FatalErrorDialog
          isOpen={true}
          title="Error"
          message=""
          onReload={vi.fn()}
          onDismiss={vi.fn()}
        />,
      )

      expect(screen.getByText("An unrecoverable error occurred.")).toBeDefined()
    })

    it("displays Critical eyebrow text", () => {
      render(
        <FatalErrorDialog
          isOpen={true}
          title="Error"
          message="Something went wrong"
          onReload={vi.fn()}
          onDismiss={vi.fn()}
        />,
      )

      expect(screen.getByText("Critical")).toBeDefined()
    })

    it("displays detail when provided", () => {
      render(
        <FatalErrorDialog
          isOpen={true}
          title="Error"
          message="Something went wrong"
          detail="Error: ENOENT: no such file or directory"
          onReload={vi.fn()}
          onDismiss={vi.fn()}
        />,
      )

      expect(screen.getByTestId("fatal-error-detail")).toBeDefined()
      expect(screen.getByText("Error: ENOENT: no such file or directory")).toBeDefined()
    })

    it("hides detail when not provided", () => {
      render(
        <FatalErrorDialog
          isOpen={true}
          title="Error"
          message="Something went wrong"
          onReload={vi.fn()}
          onDismiss={vi.fn()}
        />,
      )

      expect(screen.queryByTestId("fatal-error-detail")).toBeNull()
    })

    it("hides detail when detail is empty string", () => {
      render(
        <FatalErrorDialog
          isOpen={true}
          title="Error"
          message="Something went wrong"
          detail=""
          onReload={vi.fn()}
          onDismiss={vi.fn()}
        />,
      )

      expect(screen.queryByTestId("fatal-error-detail")).toBeNull()
    })

    it("hides detail when detail is only whitespace", () => {
      render(
        <FatalErrorDialog
          isOpen={true}
          title="Error"
          message="Something went wrong"
          detail="   "
          onReload={vi.fn()}
          onDismiss={vi.fn()}
        />,
      )

      expect(screen.queryByTestId("fatal-error-detail")).toBeNull()
    })

    it("trims whitespace from detail", () => {
      render(
        <FatalErrorDialog
          isOpen={true}
          title="Error"
          message="Something went wrong"
          detail="  some error  "
          onReload={vi.fn()}
          onDismiss={vi.fn()}
        />,
      )

      const detail_el = screen.getByTestId("fatal-error-detail")
      expect(detail_el.textContent).toBe("some error")
    })

    it("renders Reload and Dismiss buttons", () => {
      render(
        <FatalErrorDialog
          isOpen={true}
          title="Error"
          message="Something went wrong"
          onReload={vi.fn()}
          onDismiss={vi.fn()}
        />,
      )

      expect(screen.getByRole("button", { name: "Reload" })).toBeDefined()
      expect(screen.getByRole("button", { name: "Dismiss" })).toBeDefined()
    })

    it("renders with custom testId when provided", () => {
      render(
        <FatalErrorDialog
          isOpen={true}
          title="Error"
          message="Something went wrong"
          onReload={vi.fn()}
          onDismiss={vi.fn()}
          testId="my-custom-dialog"
        />,
      )

      expect(screen.getByTestId("my-custom-dialog")).toBeDefined()
    })

    it("uses default testId when not provided", () => {
      render(
        <FatalErrorDialog
          isOpen={true}
          title="Error"
          message="Something went wrong"
          onReload={vi.fn()}
          onDismiss={vi.fn()}
        />,
      )

      expect(screen.getByTestId("fatal-error-dialog")).toBeDefined()
    })
  })

  describe("accessibility", () => {
    it("has role alertdialog", () => {
      render(
        <FatalErrorDialog
          isOpen={true}
          title="Error"
          message="Something went wrong"
          onReload={vi.fn()}
          onDismiss={vi.fn()}
        />,
      )

      const dialog = screen.getByRole("alertdialog")
      expect(dialog).toBeDefined()
    })

    it("has aria-modal attribute set to true", () => {
      render(
        <FatalErrorDialog
          isOpen={true}
          title="Error"
          message="Something went wrong"
          onReload={vi.fn()}
          onDismiss={vi.fn()}
        />,
      )

      const dialog = screen.getByRole("alertdialog")
      expect(dialog.getAttribute("aria-modal")).toBe("true")
    })

    it("has aria-labelledby pointing to title", () => {
      render(
        <FatalErrorDialog
          isOpen={true}
          title="Error"
          message="Something went wrong"
          onReload={vi.fn()}
          onDismiss={vi.fn()}
        />,
      )

      const dialog = screen.getByRole("alertdialog")
      expect(dialog.getAttribute("aria-labelledby")).toBe("fatal-error-title")
    })

    it("has aria-describedby pointing to message", () => {
      render(
        <FatalErrorDialog
          isOpen={true}
          title="Error"
          message="Something went wrong"
          onReload={vi.fn()}
          onDismiss={vi.fn()}
        />,
      )

      const dialog = screen.getByRole("alertdialog")
      expect(dialog.getAttribute("aria-describedby")).toBe("fatal-error-message")
    })

    it("hides icon from accessibility tree", () => {
      render(
        <FatalErrorDialog
          isOpen={true}
          title="Error"
          message="Something went wrong"
          onReload={vi.fn()}
          onDismiss={vi.fn()}
        />,
      )

      const icon = document.querySelector(".fatal-error__icon")
      expect(icon?.getAttribute("aria-hidden")).toBe("true")
    })
  })

  describe("interactions", () => {
    it("calls onReload when Reload button is clicked", () => {
      const on_reload = vi.fn()

      render(
        <FatalErrorDialog
          isOpen={true}
          title="Error"
          message="Something went wrong"
          onReload={on_reload}
          onDismiss={vi.fn()}
        />,
      )

      fireEvent.click(screen.getByRole("button", { name: "Reload" }))

      expect(on_reload).toHaveBeenCalledTimes(1)
    })

    it("calls onDismiss when Dismiss button is clicked", () => {
      const on_dismiss = vi.fn()

      render(
        <FatalErrorDialog
          isOpen={true}
          title="Error"
          message="Something went wrong"
          onReload={vi.fn()}
          onDismiss={on_dismiss}
        />,
      )

      fireEvent.click(screen.getByRole("button", { name: "Dismiss" }))

      expect(on_dismiss).toHaveBeenCalledTimes(1)
    })
  })

  describe("styling", () => {
    it("applies primary class to Reload button", () => {
      render(
        <FatalErrorDialog
          isOpen={true}
          title="Error"
          message="Something went wrong"
          onReload={vi.fn()}
          onDismiss={vi.fn()}
        />,
      )

      const reload_btn = screen.getByRole("button", { name: "Reload" })
      expect(reload_btn.classList.contains("primary")).toBe(true)
    })

    it("applies btn class to both buttons", () => {
      render(
        <FatalErrorDialog
          isOpen={true}
          title="Error"
          message="Something went wrong"
          onReload={vi.fn()}
          onDismiss={vi.fn()}
        />,
      )

      const reload_btn = screen.getByRole("button", { name: "Reload" })
      const dismiss_btn = screen.getByRole("button", { name: "Dismiss" })

      expect(reload_btn.classList.contains("btn")).toBe(true)
      expect(dismiss_btn.classList.contains("btn")).toBe(true)
    })

    it("uses fatal-error class structure for styling", () => {
      render(
        <FatalErrorDialog
          isOpen={true}
          title="Error"
          message="Something went wrong"
          onReload={vi.fn()}
          onDismiss={vi.fn()}
        />,
      )

      expect(document.querySelector(".fatal-error")).toBeDefined()
      expect(document.querySelector(".fatal-error__icon")).toBeDefined()
      expect(document.querySelector(".fatal-error__body")).toBeDefined()
      expect(document.querySelector(".fatal-error__eyebrow")).toBeDefined()
      expect(document.querySelector(".fatal-error__title")).toBeDefined()
      expect(document.querySelector(".fatal-error__message")).toBeDefined()
      expect(document.querySelector(".fatal-error__actions")).toBeDefined()
    })
  })
})
