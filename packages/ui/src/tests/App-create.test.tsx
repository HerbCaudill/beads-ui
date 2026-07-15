import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { App } from "../App.js"

describe("App task creation", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("creates a task from the new task dialog", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
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
      if (url === "/api/issues" && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { title: string }
        return Response.json(
          {
            id: "bd-1",
            title: body.title,
            status: "open",
            priority: 2,
            type: "task",
            labels: [],
            commentCount: 0,
            dependencyCount: 0,
            dependentCount: 0,
            createdAt: "2026-07-15T10:00:00Z",
            updatedAt: "2026-07-15T10:00:00Z",
          },
          { status: 201 },
        )
      }
      if (url === "/api/issues") return Response.json([])
      throw new Error(`Unexpected request: ${url}`)
    })
    vi.stubGlobal("fetch", fetchMock)

    render(<App />)
    fireEvent.click(await screen.findByRole("button", { name: "New task" }))
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Created in the UI" } })
    fireEvent.click(screen.getByRole("button", { name: "Create task" }))

    expect(await screen.findByText("Created in the UI")).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/issues",
      expect.objectContaining({ method: "POST" }),
    )
  })
})
