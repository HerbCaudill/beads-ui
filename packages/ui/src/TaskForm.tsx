import { IconX } from "@tabler/icons-react"
import { type FormEvent, useState } from "react"

import type { IssueDetail, IssueStatus, IssueType, TaskDraft } from "./types.js"

/** Create or edit a task in a focused modal form. */
export function TaskForm({ initial, onCancel, onSubmit }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [type, setType] = useState<IssueType>(initial?.type ?? "task")
  const [priority, setPriority] = useState(initial?.priority ?? 2)
  const [status, setStatus] = useState<IssueStatus>(initial?.status ?? "open")
  const [labels, setLabels] = useState(initial?.labels.join(", ") ?? "")

  /** Normalize form values and submit the task draft. */
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsedLabels = labels
      .split(",")
      .map((label) => label.trim())
      .filter(Boolean)
    onSubmit({
      title: title.trim(),
      ...(initial || description ? { description } : {}),
      type,
      priority,
      ...(initial ? { status } : {}),
      ...(parsedLabels.length ? { labels: parsedLabels } : {}),
    })
  }

  return (
    <div
      aria-label={initial ? "Edit task" : "Create task"}
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <form
        className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
        onSubmit={submit}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{initial ? "Edit task" : "Create task"}</h2>
          <button
            aria-label="Close"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-800"
            onClick={onCancel}
            type="button"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-300">
            Title
            <input
              autoFocus
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
              onChange={(event) => setTitle(event.target.value)}
              required
              value={title}
            />
          </label>
          <label className="block text-sm font-medium text-slate-300">
            Description
            <textarea
              className="mt-1.5 min-h-28 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-slate-300">
              Type
              <select
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                onChange={(event) => setType(event.target.value as IssueType)}
                value={type}
              >
                <option value="task">Task</option>
                <option value="bug">Bug</option>
                <option value="feature">Feature</option>
                <option value="epic">Epic</option>
                <option value="chore">Chore</option>
                <option value="decision">Decision</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-300">
              Priority
              <select
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                onChange={(event) => setPriority(Number(event.target.value))}
                value={priority}
              >
                {[0, 1, 2, 3, 4].map((value) => (
                  <option key={value} value={value}>
                    P{value}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {initial ? (
            <label className="block text-sm font-medium text-slate-300">
              Status
              <select
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                onChange={(event) => setStatus(event.target.value as IssueStatus)}
                value={status}
              >
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="blocked">Blocked</option>
                <option value="deferred">Deferred</option>
                <option value="closed">Closed</option>
              </select>
            </label>
          ) : null}
          {!initial ? (
            <label className="block text-sm font-medium text-slate-300">
              Labels
              <input
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
                onChange={(event) => setLabels(event.target.value)}
                placeholder="frontend, urgent"
                value={labels}
              />
            </label>
          ) : null}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-lg px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
            type="submit"
          >
            {initial ? "Save changes" : "Create task"}
          </button>
        </div>
      </form>
    </div>
  )
}

/** Properties for the task form modal. */
type Props = {
  /** Existing task when editing. */
  readonly initial?: IssueDetail
  /** Close the form without saving. */
  readonly onCancel: () => void
  /** Persist the submitted task fields. */
  readonly onSubmit: (draft: TaskDraft) => void
}
