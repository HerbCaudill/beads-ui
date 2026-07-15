import { IconEdit, IconTrash } from "@tabler/icons-react"

import { CommentEditor } from "./CommentEditor.js"
import { DependencyEditor } from "./DependencyEditor.js"
import { LabelEditor } from "./LabelEditor.js"
import type { IssueDetail } from "./types.js"

/** Show and manage the selected task. */
export function TaskDetail({
  issue,
  onAddComment,
  onAddDependency,
  onAddLabel,
  onDelete,
  onEdit,
  onRemoveDependency,
  onRemoveLabel,
}: Props) {
  return (
    <aside className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-5 border-b border-slate-800 pb-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-400">{issue.id}</p>
        <h2 className="mt-2 text-xl font-semibold">{issue.title}</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">
          {issue.description || "No description"}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
            {issue.status.replace("_", " ")}
          </span>
          <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
            Priority {issue.priority}
          </span>
        </div>
        <div className="mt-5 flex gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
            onClick={onEdit}
            type="button"
          >
            <IconEdit size={16} /> Edit task
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-300 hover:bg-red-950"
            onClick={onDelete}
            type="button"
          >
            <IconTrash size={16} /> Delete task
          </button>
        </div>
      </div>

      <LabelEditor labels={issue.labels} onAdd={onAddLabel} onRemove={onRemoveLabel} />
      <DependencyEditor
        dependencies={issue.dependencies}
        onAdd={onAddDependency}
        onRemove={onRemoveDependency}
      />
      <CommentEditor comments={issue.comments} onAdd={onAddComment} />
    </aside>
  )
}

/** Properties for the selected task detail pane. */
type Props = {
  /** Selected task with related data. */
  readonly issue: IssueDetail
  /** Add a comment to the task. */
  readonly onAddComment: (text: string) => void
  /** Add a blocking dependency by identifier. */
  readonly onAddDependency: (issueId: string) => void
  /** Attach a label. */
  readonly onAddLabel: (label: string) => void
  /** Permanently delete the selected task. */
  readonly onDelete: () => void
  /** Open the selected task for editing. */
  readonly onEdit: () => void
  /** Remove a blocking dependency. */
  readonly onRemoveDependency: (issueId: string) => void
  /** Remove an attached label. */
  readonly onRemoveLabel: (label: string) => void
}
