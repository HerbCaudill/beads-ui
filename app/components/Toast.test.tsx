/**
 * Tests for the Toast React component and store.
 */
import { act, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ToastContainer } from "./Toast.js"
import { useToastStore, showToast } from "../store/toast-store.js"

describe("Toast", () => {
  beforeEach(() => {
    // Clear all toasts before each test
    useToastStore.setState({ toasts: [] })
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe("ToastContainer rendering", () => {
    it("renders nothing when no toasts exist", () => {
      const { container } = render(<ToastContainer testId="toast-container" />)
      expect(container.children.length).toBe(0)
    })

    it("renders a toast when one is added", () => {
      render(<ToastContainer testId="toast-container" />)
      act(() => {
        showToast("Hello World")
      })
      expect(screen.getByText("Hello World")).toBeDefined()
    })

    it("applies testId when provided", () => {
      render(<ToastContainer testId="toast-container" />)
      act(() => {
        showToast("Test message")
      })
      expect(screen.getByTestId("toast-container")).toBeDefined()
      expect(screen.getByTestId("toast-container-item-0")).toBeDefined()
    })

    it("renders multiple stacked toasts", () => {
      render(<ToastContainer testId="toast-container" />)
      act(() => {
        showToast("First toast")
        showToast("Second toast")
        showToast("Third toast")
      })
      expect(screen.getByText("First toast")).toBeDefined()
      expect(screen.getByText("Second toast")).toBeDefined()
      expect(screen.getByText("Third toast")).toBeDefined()
    })

    it("has correct positioning for stacked toasts", () => {
      render(<ToastContainer testId="toast-container" />)
      act(() => {
        showToast("First toast")
        showToast("Second toast")
      })

      const first = screen.getByText("First toast")
      const second = screen.getByText("Second toast")

      // First toast should be at bottom: 12px, second at: 12 + 44 = 56px
      expect(first.style.bottom).toBe("12px")
      expect(second.style.bottom).toBe("56px")
    })

    it("has aria-live attribute for accessibility", () => {
      render(<ToastContainer testId="toast-container" />)
      act(() => {
        showToast("Accessible toast")
      })
      const container = screen.getByTestId("toast-container")
      expect(container.getAttribute("aria-live")).toBe("polite")
    })
  })

  describe("toast variants", () => {
    it("renders info toast with correct background", () => {
      render(<ToastContainer testId="toast-container" />)
      act(() => {
        showToast("Info message", "info")
      })
      const toast = screen.getByText("Info message")
      expect(toast.style.background).toBe("rgba(0, 0, 0, 0.85)")
    })

    it("renders success toast with correct background", () => {
      render(<ToastContainer testId="toast-container" />)
      act(() => {
        showToast("Success message", "success")
      })
      const toast = screen.getByText("Success message")
      expect(toast.style.background).toBe("rgb(21, 109, 54)")
    })

    it("renders error toast with correct background", () => {
      render(<ToastContainer testId="toast-container" />)
      act(() => {
        showToast("Error message", "error")
      })
      const toast = screen.getByText("Error message")
      expect(toast.style.background).toBe("rgb(159, 32, 17)")
    })

    it("applies data-variant attribute", () => {
      render(<ToastContainer testId="toast-container" />)
      act(() => {
        showToast("Test message", "success")
      })
      const toast = screen.getByTestId("toast-container-item-0")
      expect(toast.getAttribute("data-variant")).toBe("success")
    })

    it("defaults to info variant when not specified", () => {
      render(<ToastContainer testId="toast-container" />)
      act(() => {
        showToast("Default variant")
      })
      const toast = screen.getByTestId("toast-container-item-0")
      expect(toast.getAttribute("data-variant")).toBe("info")
    })
  })

  describe("auto-dismiss", () => {
    it("removes toast after default duration", async () => {
      render(<ToastContainer testId="toast-container" />)
      act(() => {
        showToast("Auto dismiss")
      })
      expect(screen.getByText("Auto dismiss")).toBeDefined()

      // Fast-forward past default duration (2800ms)
      await act(async () => {
        vi.advanceTimersByTime(2800)
      })

      expect(screen.queryByText("Auto dismiss")).toBeNull()
    })

    it("removes toast after custom duration", async () => {
      render(<ToastContainer testId="toast-container" />)
      act(() => {
        showToast("Custom duration", "info", 1000)
      })
      expect(screen.getByText("Custom duration")).toBeDefined()

      // Fast-forward less than duration - should still exist
      await act(async () => {
        vi.advanceTimersByTime(500)
      })
      expect(screen.getByText("Custom duration")).toBeDefined()

      // Fast-forward past duration
      await act(async () => {
        vi.advanceTimersByTime(500)
      })
      expect(screen.queryByText("Custom duration")).toBeNull()
    })

    it("removes toasts independently", async () => {
      render(<ToastContainer testId="toast-container" />)
      act(() => {
        showToast("Short toast", "info", 1000)
        showToast("Long toast", "info", 3000)
      })

      // Both exist initially
      expect(screen.getByText("Short toast")).toBeDefined()
      expect(screen.getByText("Long toast")).toBeDefined()

      // After 1000ms, short toast removed, long toast remains
      await act(async () => {
        vi.advanceTimersByTime(1000)
      })
      expect(screen.queryByText("Short toast")).toBeNull()
      expect(screen.getByText("Long toast")).toBeDefined()

      // After additional 2000ms, long toast also removed
      await act(async () => {
        vi.advanceTimersByTime(2000)
      })
      expect(screen.queryByText("Long toast")).toBeNull()
    })
  })

  describe("toast store", () => {
    it("addToast adds to store", () => {
      act(() => {
        useToastStore.getState().addToast("Store test")
      })
      expect(useToastStore.getState().toasts).toHaveLength(1)
      expect(useToastStore.getState().toasts[0]?.text).toBe("Store test")
    })

    it("removeToast removes specific toast", () => {
      act(() => {
        useToastStore.getState().addToast("Toast 1")
        useToastStore.getState().addToast("Toast 2")
      })
      const id = useToastStore.getState().toasts[0]?.id
      if (id) {
        act(() => {
          useToastStore.getState().removeToast(id)
        })
      }
      expect(useToastStore.getState().toasts).toHaveLength(1)
      expect(useToastStore.getState().toasts[0]?.text).toBe("Toast 2")
    })

    it("clearToasts removes all toasts", () => {
      act(() => {
        useToastStore.getState().addToast("Toast 1")
        useToastStore.getState().addToast("Toast 2")
        useToastStore.getState().addToast("Toast 3")
      })
      expect(useToastStore.getState().toasts).toHaveLength(3)

      act(() => {
        useToastStore.getState().clearToasts()
      })
      expect(useToastStore.getState().toasts).toHaveLength(0)
    })

    it("generates unique toast IDs", () => {
      act(() => {
        useToastStore.getState().addToast("Toast 1")
        useToastStore.getState().addToast("Toast 2")
      })
      const ids = useToastStore.getState().toasts.map(t => t.id)
      expect(ids[0]).not.toBe(ids[1])
    })
  })

  describe("showToast convenience function", () => {
    it("adds toast via showToast function", () => {
      act(() => {
        showToast("Via showToast")
      })
      expect(useToastStore.getState().toasts).toHaveLength(1)
      expect(useToastStore.getState().toasts[0]?.text).toBe("Via showToast")
    })

    it("passes variant to store", () => {
      act(() => {
        showToast("Error via showToast", "error")
      })
      expect(useToastStore.getState().toasts[0]?.variant).toBe("error")
    })

    it("passes duration to store", () => {
      act(() => {
        showToast("Custom duration", "info", 5000)
      })
      expect(useToastStore.getState().toasts[0]?.duration_ms).toBe(5000)
    })
  })
})
