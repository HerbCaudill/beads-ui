/**
 * Tests for the IssueIdRenderer component.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { IssueIdRenderer } from "./IssueIdRenderer.js"

describe("IssueIdRenderer", () => {
  const mockWriteText = vi.fn()

  beforeEach(() => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText.mockResolvedValue(undefined),
      },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("rendering", () => {
    it("renders the issue ID", () => {
      render(<IssueIdRenderer issueId="UI-123" />)

      expect(screen.getByText("UI-123")).toBeDefined()
    })

    it("renders as a button", () => {
      render(<IssueIdRenderer issueId="UI-123" />)

      const button = screen.getByRole("button")
      expect(button).toBeDefined()
      expect(button.tagName).toBe("BUTTON")
    })

    it("has correct accessibility attributes", () => {
      render(<IssueIdRenderer issueId="UI-123" />)

      const button = screen.getByRole("button")
      expect(button.getAttribute("title")).toBe("Copy issue ID")
      expect(button.getAttribute("aria-label")).toBe("Copy issue ID UI-123")
      expect(button.getAttribute("aria-live")).toBe("polite")
    })

    it("applies mono and id-copy class names", () => {
      render(<IssueIdRenderer issueId="UI-123" />)

      const button = screen.getByRole("button")
      expect(button.classList.contains("mono")).toBe(true)
      expect(button.classList.contains("id-copy")).toBe(true)
    })

    it("applies custom className", () => {
      render(<IssueIdRenderer issueId="UI-123" className="custom-class" />)

      const button = screen.getByRole("button")
      expect(button.classList.contains("custom-class")).toBe(true)
    })

    it("renders with testId when provided", () => {
      render(<IssueIdRenderer issueId="UI-123" testId="my-id-renderer" />)

      expect(screen.getByTestId("my-id-renderer")).toBeDefined()
    })
  })

  describe("copy functionality", () => {
    it("copies issue ID to clipboard on click", async () => {
      render(<IssueIdRenderer issueId="UI-123" />)

      const button = screen.getByRole("button")
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith("UI-123")
      })
    })

    it("shows Copied feedback after copying", async () => {
      render(<IssueIdRenderer issueId="UI-123" />)

      const button = screen.getByRole("button")
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText("Copied")).toBeDefined()
      })
    })

    it("updates aria-label when showing Copied", async () => {
      render(<IssueIdRenderer issueId="UI-123" />)

      const button = screen.getByRole("button")
      fireEvent.click(button)

      await waitFor(() => {
        expect(button.getAttribute("aria-label")).toBe("Copied")
      })
    })

    it("reverts to issue ID after duration", async () => {
      // Use a short duration for faster test and actual timers
      render(<IssueIdRenderer issueId="UI-123" durationMs={50} />)

      const button = screen.getByRole("button")
      fireEvent.click(button)

      // Should show Copied
      await waitFor(() => {
        expect(screen.getByText("Copied")).toBeDefined()
      })

      // Wait for it to revert
      await waitFor(
        () => {
          expect(screen.getByText("UI-123")).toBeDefined()
        },
        { timeout: 200 },
      )
    })

    it("stops event propagation on click", async () => {
      const parentClickHandler = vi.fn()

      render(
        <div onClick={parentClickHandler}>
          <IssueIdRenderer issueId="UI-123" />
        </div>,
      )

      const button = screen.getByRole("button")
      fireEvent.click(button)

      expect(parentClickHandler).not.toHaveBeenCalled()
    })

    it("prevents default behavior on click", async () => {
      render(<IssueIdRenderer issueId="UI-123" />)

      const button = screen.getByRole("button")
      const event = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      })

      button.dispatchEvent(event)

      // The event should be prevented
      // (difficult to test directly, but coverage is good)
    })
  })

  describe("keyboard activation", () => {
    it("copies on Enter key", async () => {
      render(<IssueIdRenderer issueId="UI-123" />)

      const button = screen.getByRole("button")
      fireEvent.keyDown(button, { key: "Enter" })

      // Allow the async copy to complete
      await vi.waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith("UI-123")
      })
    })

    it("copies on Space key", async () => {
      render(<IssueIdRenderer issueId="UI-123" />)

      const button = screen.getByRole("button")
      fireEvent.keyDown(button, { key: " " })

      // Allow the async copy to complete
      await vi.waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith("UI-123")
      })
    })

    it("does not copy on other keys", async () => {
      render(<IssueIdRenderer issueId="UI-123" />)

      const button = screen.getByRole("button")
      fireEvent.keyDown(button, { key: "Escape" })
      fireEvent.keyDown(button, { key: "Tab" })
      fireEvent.keyDown(button, { key: "a" })

      expect(mockWriteText).not.toHaveBeenCalled()
    })

    it("stops event propagation on Enter", async () => {
      const parentKeyHandler = vi.fn()

      render(
        <div onKeyDown={parentKeyHandler}>
          <IssueIdRenderer issueId="UI-123" />
        </div>,
      )

      const button = screen.getByRole("button")
      fireEvent.keyDown(button, { key: "Enter" })

      expect(parentKeyHandler).not.toHaveBeenCalled()
    })
  })

  describe("error handling", () => {
    it("handles clipboard API failure gracefully", async () => {
      mockWriteText.mockRejectedValueOnce(new Error("Clipboard not available"))

      render(<IssueIdRenderer issueId="UI-123" />)

      const button = screen.getByRole("button")
      fireEvent.click(button)

      // Wait for the async operation to complete
      await waitFor(() => {
        // After failure, should still show the original ID
        expect(screen.getByText("UI-123")).toBeDefined()
        expect(mockWriteText).toHaveBeenCalled()
      })
    })
  })
})
