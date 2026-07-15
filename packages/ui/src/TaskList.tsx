import { cx } from "./cx.js"
import type { Issue } from "./types.js"

/** Render the filtered task list with keyboard-visible selection. */
export function TaskList({ issues, onSelect, selectedId }: Props) {
  return (
    <ul className="divide-y divide-slate-800">
      {issues.map((issue) => (
        <li key={issue.id}>
          <button
            className={cx(
              "flex w-full items-start gap-4 px-4 py-4 text-left transition hover:bg-slate-800/70",
              selectedId === issue.id && "bg-slate-800",
            )}
            onClick={() => onSelect(issue.id)}
            type="button"
          >
            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-400" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-slate-100">{issue.title}</span>
              <span className="mt-1 block text-xs text-slate-500">
                {issue.id} · P{issue.priority} · {issue.status.replace("_", " ")}
              </span>
            </span>
            <span className="flex gap-1">
              {issue.labels.map((label) => (
                <span
                  className="rounded-full bg-slate-950 px-2 py-1 text-xs text-slate-300"
                  key={label}
                >
                  {label}
                </span>
              ))}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

/** Properties for the task list. */
type Props = {
  /** Tasks visible after filtering. */
  readonly issues: readonly Issue[]
  /** Select a task by stable identifier. */
  readonly onSelect: (issueId: string) => void
  /** Currently selected task identifier. */
  readonly selectedId: string | null
}
