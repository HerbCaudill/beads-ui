/**
 * Tests for the useTransport hook.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"

import type { TransportFn } from "./use-transport.js"
import {
  setTransportInstance,
  getTransportInstance,
  clearTransportInstance,
  useTransport,
  useTransportAvailable,
} from "./use-transport.js"

/**
 * Create a mock transport function for testing.
 */
function createMockTransport(): TransportFn {
  return vi.fn().mockResolvedValue({ success: true })
}

describe("use-transport", () => {
  beforeEach(() => {
    clearTransportInstance()
  })

  afterEach(() => {
    clearTransportInstance()
  })

  describe("setTransportInstance", () => {
    it("sets the transport instance", () => {
      const transport = createMockTransport()

      setTransportInstance(transport)

      expect(getTransportInstance()).toBe(transport)
    })
  })

  describe("clearTransportInstance", () => {
    it("clears the transport instance", () => {
      const transport = createMockTransport()
      setTransportInstance(transport)

      clearTransportInstance()

      expect(getTransportInstance()).toBe(null)
    })
  })

  describe("useTransportAvailable", () => {
    it("returns false when transport is not set", () => {
      const { result } = renderHook(() => useTransportAvailable())

      expect(result.current).toBe(false)
    })

    it("returns true when transport is set", () => {
      const transport = createMockTransport()
      setTransportInstance(transport)

      const { result } = renderHook(() => useTransportAvailable())

      expect(result.current).toBe(true)
    })
  })

  describe("useTransport", () => {
    it("returns a send function", () => {
      const { result } = renderHook(() => useTransport())

      expect(typeof result.current).toBe("function")
    })

    it("rejects when transport is not set", async () => {
      const { result } = renderHook(() => useTransport())

      await expect(result.current("list-issues", {})).rejects.toThrow("Transport not available")
    })

    it("calls transport with type and payload", async () => {
      const transport = createMockTransport()
      setTransportInstance(transport)

      const { result } = renderHook(() => useTransport())

      await act(async () => {
        await result.current("edit-text", { id: "test-1", field: "title", value: "Updated" })
      })

      expect(transport).toHaveBeenCalledWith("edit-text", {
        id: "test-1",
        field: "title",
        value: "Updated",
      })
    })

    it("returns transport result", async () => {
      const transport = vi.fn().mockResolvedValue({ id: "test-1", status: "updated" })
      setTransportInstance(transport)

      const { result } = renderHook(() => useTransport())

      let response: unknown
      await act(async () => {
        response = await result.current("update-status", { id: "test-1", status: "closed" })
      })

      expect(response).toEqual({ id: "test-1", status: "updated" })
    })

    it("propagates transport errors", async () => {
      const transport = vi.fn().mockRejectedValue(new Error("Network error"))
      setTransportInstance(transport)

      const { result } = renderHook(() => useTransport())

      await expect(result.current("list-issues", {})).rejects.toThrow("Network error")
    })

    it("maintains stable reference across rerenders", () => {
      const transport = createMockTransport()
      setTransportInstance(transport)

      const { result, rerender } = renderHook(() => useTransport())
      const first_send = result.current

      rerender()

      expect(result.current).toBe(first_send)
    })
  })
})
