/**
 * Tests for use-workspace-actions hook.
 */
import { describe, it, expect, beforeEach, vi } from "vitest"
import { renderHook, waitFor, act } from "@testing-library/react"
import {
  setWorkspaceChangeHandler,
  clearWorkspaceChangeHandler,
  getWorkspaceChangeHandler,
  useWorkspaceChange,
  useWorkspaceChangeAvailable,
} from "./use-workspace-actions.js"

describe("use-workspace-actions", () => {
  beforeEach(() => {
    clearWorkspaceChangeHandler()
  })

  describe("setWorkspaceChangeHandler", () => {
    it("sets the handler", () => {
      const handler = vi.fn()
      setWorkspaceChangeHandler(handler)
      expect(getWorkspaceChangeHandler()).toBe(handler)
    })
  })

  describe("clearWorkspaceChangeHandler", () => {
    it("clears the handler", () => {
      const handler = vi.fn()
      setWorkspaceChangeHandler(handler)
      clearWorkspaceChangeHandler()
      expect(getWorkspaceChangeHandler()).toBeNull()
    })
  })

  describe("useWorkspaceChangeAvailable", () => {
    it("returns false when handler not set", () => {
      const { result } = renderHook(() => useWorkspaceChangeAvailable())
      expect(result.current).toBe(false)
    })

    it("returns true when handler is set", () => {
      const handler = vi.fn()
      setWorkspaceChangeHandler(handler)
      const { result } = renderHook(() => useWorkspaceChangeAvailable())
      expect(result.current).toBe(true)
    })
  })

  describe("useWorkspaceChange", () => {
    it("rejects when handler not available", async () => {
      const { result } = renderHook(() => useWorkspaceChange())
      await expect(result.current("/path/to/workspace")).rejects.toThrow(
        "Workspace change handler not available",
      )
    })

    it("calls the handler when available", async () => {
      const handler = vi.fn().mockResolvedValue(undefined)
      setWorkspaceChangeHandler(handler)

      const { result } = renderHook(() => useWorkspaceChange())
      await act(async () => {
        await result.current("/path/to/workspace")
      })

      expect(handler).toHaveBeenCalledWith("/path/to/workspace")
    })

    it("propagates errors from handler", async () => {
      const error = new Error("switch failed")
      const handler = vi.fn().mockRejectedValue(error)
      setWorkspaceChangeHandler(handler)

      const { result } = renderHook(() => useWorkspaceChange())
      await expect(result.current("/path/to/workspace")).rejects.toThrow("switch failed")
    })
  })
})
