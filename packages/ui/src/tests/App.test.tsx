import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { App } from "../App"
import { beadsViewStore } from "../store"
import { FakeWebSocket } from "./FakeWebSocket"

describe("App", () => {
  beforeEach(() => {
    localStorage.clear()
    beadsViewStore.setState({
      tasks: [],
      initialTaskCount: null,
      selectedTaskId: null,
      visibleTaskIds: [],
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("loads tasks and opens editable task details", async () => {
    const task = {
      id: "bd-1",
      title: "Extract Beads View",
      status: "open",
      priority: 1,
      issue_type: "task",
      created_at: "2026-07-16T10:00:00Z",
      labels: [],
    }
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith("/labels")) return Response.json({ ok: true, labels: [] })
        if (url.endsWith("/comments")) return Response.json({ ok: true, comments: [] })
        if (url === "/api/tasks/bd-1") {
          return Response.json({ ok: true, issue: { ...task, dependencies: [], dependents: [] } })
        }
        return Response.json({ ok: true, issues: [task] })
      }),
    )
    vi.stubGlobal("WebSocket", FakeWebSocket)

    render(<App />)

    expect(await screen.findByRole("button", { name: "Extract Beads View" })).toBeInTheDocument()
    expect(screen.getByLabelText("New task title")).toBeInTheDocument()
    expect(
      screen.getByRole("progressbar", { name: "Task completion progress" }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Extract Beads View" }))

    await waitFor(() => {
      expect(screen.getByDisplayValue("Extract Beads View")).toBeInTheDocument()
    })
  })

  it("shows task loading failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ ok: false, error: "bd list failed" })),
    )
    vi.stubGlobal("WebSocket", FakeWebSocket)

    render(<App />)

    expect(await screen.findByRole("alert")).toHaveTextContent("bd list failed")
  })

  it("resizes the task list sidebar by dragging its separator", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ ok: true, issues: [] })),
    )
    vi.stubGlobal("WebSocket", FakeWebSocket)
    vi.stubGlobal("PointerEvent", MouseEvent)

    render(<App />)

    const sidebar = screen.getByRole("complementary", { name: "Task list sidebar" })
    const separator = screen.getByRole("separator", { name: "Resize task list sidebar" })

    expect(sidebar).toHaveStyle({ width: "368px" })

    fireEvent.pointerDown(separator, { clientX: 368 })
    fireEvent.pointerMove(window, { clientX: 468 })
    fireEvent.pointerUp(window)

    expect(sidebar).toHaveStyle({ width: "468px" })
  })

  it("resizes the task list sidebar with arrow keys", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ ok: true, issues: [] })),
    )
    vi.stubGlobal("WebSocket", FakeWebSocket)

    render(<App />)

    const sidebar = screen.getByRole("complementary", { name: "Task list sidebar" })
    const separator = screen.getByRole("separator", { name: "Resize task list sidebar" })

    fireEvent.keyDown(separator, { key: "ArrowRight" })

    expect(sidebar).toHaveStyle({ width: "384px" })
  })
})
