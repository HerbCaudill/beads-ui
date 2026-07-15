import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { App } from "../App.js"

describe("App hotkeys", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("opens task creation and focuses search from the keyboard", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url === "/api/workspace")
          return Response.json({ name: "example", path: "/projects/example" })
        if (url === "/api/status") {
          return Response.json({
            blocked: 0,
            closed: 0,
            deferred: 0,
            inProgress: 0,
            open: 0,
            ready: 0,
            total: 0,
          })
        }
        if (url === "/api/issues") return Response.json([])
        throw new Error(`Unexpected request: ${url}`)
      }),
    )
    render(<App />)
    await screen.findByText("example")

    fireEvent.keyDown(window, { key: "/" })
    expect(screen.getByPlaceholderText("Search tasks")).toHaveFocus()

    fireEvent.blur(screen.getByPlaceholderText("Search tasks"))
    fireEvent.keyDown(window, { key: "n" })
    expect(screen.getByRole("dialog", { name: "Create task" })).toBeInTheDocument()
  })
})
