import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { TaskForm } from "../TaskForm.js"
import type { IssueDetail } from "../types.js"

describe("TaskForm", () => {
  it("submits a new task", async () => {
    const onSubmit = vi.fn()
    render(<TaskForm onCancel={vi.fn()} onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "New task" } })
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Useful context" } })
    fireEvent.change(screen.getByLabelText("Priority"), { target: { value: "1" } })
    fireEvent.click(screen.getByRole("button", { name: "Create task" }))

    expect(onSubmit).toHaveBeenCalledWith({
      title: "New task",
      description: "Useful context",
      priority: 1,
      type: "task",
    })
  })

  it("can clear an existing description while changing status", () => {
    const onSubmit = vi.fn()
    const initial: IssueDetail = {
      id: "bd-1",
      title: "Existing task",
      description: "Remove this",
      status: "open",
      priority: 2,
      type: "task",
      labels: [],
      commentCount: 0,
      dependencyCount: 0,
      dependentCount: 0,
      createdAt: "2026-07-15T10:00:00Z",
      updatedAt: "2026-07-15T11:00:00Z",
      dependencies: [],
      dependents: [],
      comments: [],
    }
    render(<TaskForm initial={initial} onCancel={vi.fn()} onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "" } })
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "in_progress" } })
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }))

    expect(onSubmit).toHaveBeenCalledWith({
      title: "Existing task",
      description: "",
      priority: 2,
      status: "in_progress",
      type: "task",
    })
  })
})
