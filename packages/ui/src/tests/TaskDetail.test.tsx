import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { TaskDetail } from "../TaskDetail.js"
import type { IssueDetail } from "../types.js"

describe("TaskDetail", () => {
  it("offers edit and delete actions", () => {
    const onAddComment = vi.fn()
    const onAddDependency = vi.fn()
    const onAddLabel = vi.fn()
    const onDelete = vi.fn()
    const onEdit = vi.fn()
    const onRemoveDependency = vi.fn()
    const onRemoveLabel = vi.fn()
    const issue: IssueDetail = {
      id: "bd-1",
      title: "Selected task",
      status: "open",
      priority: 2,
      type: "task",
      labels: ["frontend"],
      commentCount: 0,
      dependencyCount: 0,
      dependentCount: 0,
      createdAt: "2026-07-15T10:00:00Z",
      updatedAt: "2026-07-15T11:00:00Z",
      dependencies: [
        {
          id: "bd-0",
          title: "Dependency",
          status: "open",
          priority: 2,
          type: "task",
          dependencyType: "blocks",
        },
      ],
      dependents: [],
      comments: [],
    }
    render(
      <TaskDetail
        issue={issue}
        onAddComment={onAddComment}
        onAddDependency={onAddDependency}
        onAddLabel={onAddLabel}
        onDelete={onDelete}
        onEdit={onEdit}
        onRemoveDependency={onRemoveDependency}
        onRemoveLabel={onRemoveLabel}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Edit task" }))
    fireEvent.click(screen.getByRole("button", { name: "Delete task" }))
    fireEvent.change(screen.getByLabelText("New label"), { target: { value: "urgent" } })
    fireEvent.click(screen.getByRole("button", { name: "Add label" }))
    fireEvent.change(screen.getByLabelText("Dependency ID"), { target: { value: "bd-2" } })
    fireEvent.click(screen.getByRole("button", { name: "Add dependency" }))
    fireEvent.change(screen.getByLabelText("New comment"), { target: { value: "Useful context" } })
    fireEvent.click(screen.getByRole("button", { name: "Add comment" }))
    fireEvent.click(screen.getByRole("button", { name: "Remove label frontend" }))
    fireEvent.click(screen.getByRole("button", { name: "Remove dependency bd-0" }))

    expect(onEdit).toHaveBeenCalledOnce()
    expect(onDelete).toHaveBeenCalledOnce()
    expect(onAddLabel).toHaveBeenCalledWith("urgent")
    expect(onAddDependency).toHaveBeenCalledWith("bd-2")
    expect(onAddComment).toHaveBeenCalledWith("Useful context")
    expect(onRemoveLabel).toHaveBeenCalledWith("frontend")
    expect(onRemoveDependency).toHaveBeenCalledWith("bd-0")
  })
})
