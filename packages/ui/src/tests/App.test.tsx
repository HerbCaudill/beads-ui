import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { App } from "../App.js"

describe("App", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("loads the fixed workspace and filters its task list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url === "/api/workspace") {
          return Response.json({ name: "example", path: "/projects/example" })
        }
        if (url === "/api/status") {
          return Response.json({
            blocked: 1,
            closed: 2,
            deferred: 0,
            inProgress: 1,
            open: 3,
            ready: 2,
            total: 5,
          })
        }
        if (url === "/api/issues") {
          return Response.json([
            {
              id: "bd-1",
              title: "Build task list",
              status: "in_progress",
              priority: 1,
              type: "task",
              labels: ["frontend"],
              commentCount: 0,
              dependencyCount: 0,
              dependentCount: 0,
              createdAt: "2026-07-15T10:00:00Z",
              updatedAt: "2026-07-15T11:00:00Z",
            },
            {
              id: "bd-2",
              title: "Write release notes",
              status: "open",
              priority: 2,
              type: "task",
              labels: ["docs"],
              commentCount: 0,
              dependencyCount: 0,
              dependentCount: 0,
              createdAt: "2026-07-15T10:00:00Z",
              updatedAt: "2026-07-15T11:00:00Z",
            },
          ])
        }
        throw new Error(`Unexpected request: ${url}`)
      }),
    )

    render(<App />)

    expect(await screen.findByText("example")).toBeInTheDocument()
    expect(screen.getByText("Build task list")).toBeInTheDocument()
    expect(screen.getByText("Write release notes")).toBeInTheDocument()
    expect(screen.getByText("2 ready")).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText("Search tasks"), {
      target: { value: "release" },
    })

    expect(screen.queryByText("Build task list")).not.toBeInTheDocument()
    expect(screen.getByText("Write release notes")).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText("Search tasks"), { target: { value: "" } })
    fireEvent.change(screen.getByLabelText("Filter by status"), {
      target: { value: "in_progress" },
    })

    expect(screen.getByText("Build task list")).toBeInTheDocument()
    expect(screen.queryByText("Write release notes")).not.toBeInTheDocument()
  })
})
