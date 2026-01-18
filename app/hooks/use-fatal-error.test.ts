/**
 * Tests for use-fatal-error hook.
 */
import { describe, it, expect, beforeEach, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import {
  showFatalError,
  dismissFatalError,
  getFatalErrorState,
  clearFatalErrorState,
  useFatalError,
  useFatalErrorActions,
} from "./use-fatal-error.js"

describe("use-fatal-error", () => {
  beforeEach(() => {
    clearFatalErrorState()
  })

  describe("showFatalError", () => {
    it("sets error state with all fields", () => {
      showFatalError("Test Title", "Test message", "Test detail")

      const state = getFatalErrorState()
      expect(state.isOpen).toBe(true)
      expect(state.title).toBe("Test Title")
      expect(state.message).toBe("Test message")
      expect(state.detail).toBe("Test detail")
    })

    it("sets error state without detail", () => {
      showFatalError("Error Title", "Error message")

      const state = getFatalErrorState()
      expect(state.isOpen).toBe(true)
      expect(state.title).toBe("Error Title")
      expect(state.message).toBe("Error message")
      expect(state.detail).toBe("")
    })
  })

  describe("dismissFatalError", () => {
    it("clears the error state", () => {
      showFatalError("Title", "Message")
      dismissFatalError()

      const state = getFatalErrorState()
      expect(state.isOpen).toBe(false)
      expect(state.title).toBe("")
      expect(state.message).toBe("")
      expect(state.detail).toBe("")
    })
  })

  describe("clearFatalErrorState", () => {
    it("resets to default state", () => {
      showFatalError("Title", "Message", "Detail")
      clearFatalErrorState()

      const state = getFatalErrorState()
      expect(state.isOpen).toBe(false)
    })
  })

  describe("useFatalError", () => {
    it("returns initial state when no error", () => {
      const { result } = renderHook(() => useFatalError())

      expect(result.current.isOpen).toBe(false)
      expect(result.current.title).toBe("")
      expect(result.current.message).toBe("")
      expect(result.current.detail).toBe("")
    })

    it("updates when showFatalError is called", () => {
      const { result } = renderHook(() => useFatalError())

      act(() => {
        showFatalError("New Error", "Error occurred", "Stack trace")
      })

      expect(result.current.isOpen).toBe(true)
      expect(result.current.title).toBe("New Error")
      expect(result.current.message).toBe("Error occurred")
      expect(result.current.detail).toBe("Stack trace")
    })

    it("updates when dismissFatalError is called", () => {
      const { result } = renderHook(() => useFatalError())

      act(() => {
        showFatalError("Error", "Message")
      })

      expect(result.current.isOpen).toBe(true)

      act(() => {
        dismissFatalError()
      })

      expect(result.current.isOpen).toBe(false)
    })
  })

  describe("useFatalErrorActions", () => {
    it("returns dismiss function that clears state", () => {
      showFatalError("Error", "Message")

      const { result } = renderHook(() => useFatalErrorActions())

      act(() => {
        result.current.dismiss()
      })

      const state = getFatalErrorState()
      expect(state.isOpen).toBe(false)
    })

    it("returns reload function", () => {
      // We can't mock window.location.reload in jsdom, but we can verify
      // the function exists and is callable (it will throw in the test env)
      const { result } = renderHook(() => useFatalErrorActions())

      expect(typeof result.current.reload).toBe("function")
    })
  })
})
