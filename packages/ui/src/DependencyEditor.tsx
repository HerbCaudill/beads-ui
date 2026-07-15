import { IconArrowBackUp, IconPlus, IconX } from "@tabler/icons-react"
import { type FormEvent, useState } from "react"

import type { RelatedIssue } from "./types.js"

/** Display and edit blocking dependencies for a task. */
export function DependencyEditor({ dependencies, onAdd, onRemove }: Props) {
  const [issueId, setIssueId] = useState("")

  /** Add the normalized dependency identifier. */
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = issueId.trim()
    if (!value) return
    onAdd(value)
    setIssueId("")
  }

  return (
    <section className="mb-6">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
        <IconArrowBackUp size={17} /> Dependencies
      </h3>
      {dependencies.length ? (
        <ul className="mb-3 space-y-2">
          {dependencies.map((dependency) => (
            <li
              className="flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm"
              key={dependency.id}
            >
              <span className="min-w-0 flex-1 truncate">
                <span className="text-slate-500">{dependency.id}</span> {dependency.title}
              </span>
              <button
                aria-label={`Remove dependency ${dependency.id}`}
                className="text-slate-500 hover:text-red-300"
                onClick={() => onRemove(dependency.id)}
                type="button"
              >
                <IconX size={15} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-sm text-slate-500">No dependencies</p>
      )}
      <form className="flex gap-2" onSubmit={submit}>
        <label className="min-w-0 flex-1">
          <span className="sr-only">Dependency ID</span>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-500"
            onChange={(event) => setIssueId(event.target.value)}
            placeholder="Task ID"
            value={issueId}
          />
        </label>
        <button
          aria-label="Add dependency"
          className="rounded-lg bg-slate-800 px-3 text-slate-200 hover:bg-slate-700"
          type="submit"
        >
          <IconPlus size={16} />
        </button>
      </form>
    </section>
  )
}

/** Properties for dependency management. */
type Props = {
  /** Tasks the selected task depends on. */
  readonly dependencies: readonly RelatedIssue[]
  /** Add a blocking dependency by identifier. */
  readonly onAdd: (issueId: string) => void
  /** Remove a dependency by identifier. */
  readonly onRemove: (issueId: string) => void
}
