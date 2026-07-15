import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { App } from "../App.js"

describe("App task details", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("opens the selected task with relationships and comments", async () => {
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
            inProgress: 1,
            open: 1,
            ready: 1,
            total: 1,
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
              commentCount: 1,
              dependencyCount: 1,
              dependentCount: 0,
              createdAt: "2026-07-15T10:00:00Z",
              updatedAt: "2026-07-15T11:00:00Z",
            },
          ])
        }
        if (url === "/api/issues/bd-1") {
          return Response.json({
            id: "bd-1",
            title: "Build task list",
            description: "Make local task management pleasant.",
            status: "in_progress",
            priority: 1,
            type: "task",
            labels: ["frontend"],
            commentCount: 1,
            dependencyCount: 1,
            dependentCount: 0,
            createdAt: "2026-07-15T10:00:00Z",
            updatedAt: "2026-07-15T11:00:00Z",
            dependencies: [
              {
                id: "bd-0",
                title: "Scaffold app",
                status: "closed",
                priority: 1,
                type: "task",
                dependencyType: "blocks",
              },
            ],
            dependents: [],
            comments: [
              {
                id: "comment-1",
                issueId: "bd-1",
                author: "Herb",
                text: "Context for this task",
                createdAt: "2026-07-15T10:30:00Z",
              },
            ],
          })
        }
        throw new Error(`Unexpected request: ${url}`)
      }),
    )

    render(<App />)
    fireEvent.click(await screen.findByRole("button", { name: /Build task list/ }))

    expect(await screen.findByText("Make local task management pleasant.")).toBeInTheDocument()
    expect(screen.getByText("Scaffold app")).toBeInTheDocument()
    expect(screen.getByText("Context for this task")).toBeInTheDocument()
  })
})
