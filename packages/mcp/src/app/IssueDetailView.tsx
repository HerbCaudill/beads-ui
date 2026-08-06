import { CopyableTaskId, statusConfig } from "@beads/ui/presentation"
import { IconGitBranch, IconUser } from "@tabler/icons-react"

import { IssueComments } from "./IssueComments.js"
import { RelatedIssueList } from "./RelatedIssueList.js"
import type { IssueResult } from "./types.js"

/** Render one issue with its full available Beads context. */
export function IssueDetailView({ result }: IssueDetailViewProps) {
  const { issue } = result
  const status = statusConfig[issue.status]
  const StatusIcon = status.icon
  const comments = "comments" in issue ? issue.comments : []
  const dependencies = "dependencies" in issue ? issue.dependencies : []
  const dependents = "dependents" in issue ? issue.dependents : []

  return (
    <main className="flex min-w-70 flex-col gap-4 p-4">
      <header>
        <div className="flex items-center gap-2">
          <CopyableTaskId displayId={issue.id} taskId={issue.id} />
          <span className="bg-muted text-muted-foreground rounded px-1 py-0.5 text-[10px] leading-none font-medium">
            P{issue.priority}
          </span>
        </div>
        <h1 className="mt-1.5 mb-0 text-lg leading-snug font-semibold break-words">
          {issue.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span
            className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${status.color} ${status.bgColor}`}
          >
            <StatusIcon aria-hidden="true" className="size-3.5" />
            {status.label}
          </span>
          <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs">
            {issue.type}
          </span>
          {issue.labels.map((label) => (
            <span
              className="border-border text-muted-foreground rounded border px-1.5 py-0.5 text-xs"
              key={label}
            >
              {label}
            </span>
          ))}
        </div>
      </header>

      {issue.description && (
        <section>
          <h2 className="text-muted-foreground m-0 text-xs font-medium">Description</h2>
          <p className="mt-1.5 mb-0 text-xs break-words whitespace-pre-wrap">{issue.description}</p>
        </section>
      )}

      {(issue.assignee || issue.owner || issue.parent) && (
        <dl className="m-0 grid grid-cols-2 gap-3 @max-md:grid-cols-1">
          {issue.assignee && (
            <Field icon={<IconUser aria-hidden="true" className="size-3.5" />} label="Assignee">
              {issue.assignee}
            </Field>
          )}
          {issue.owner && (
            <Field icon={<IconUser aria-hidden="true" className="size-3.5" />} label="Owner">
              {issue.owner}
            </Field>
          )}
          {issue.parent && (
            <Field icon={<IconGitBranch aria-hidden="true" className="size-3.5" />} label="Parent">
              {issue.parent}
            </Field>
          )}
        </dl>
      )}

      <div className="flex flex-col gap-4">
        <RelatedIssueList direction="dependency" issues={dependencies} title="Dependencies" />
        <RelatedIssueList direction="dependent" issues={dependents} title="Dependents" />
        <IssueComments comments={comments} />
      </div>
    </main>
  )
}

/** Render one labeled metadata field in the detail header. */
function Field({ children, icon, label }: FieldProps) {
  return (
    <div>
      <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
        {icon}
        {label}
      </dt>
      <dd className="m-0 mt-0.5 text-xs">{children}</dd>
    </div>
  )
}

/** Props for one labeled metadata field. */
type FieldProps = {
  /** Field value. */
  readonly children: React.ReactNode
  /** Icon shown beside the field label. */
  readonly icon: React.ReactNode
  /** Field label. */
  readonly label: string
}

/** Props for the focused issue view. */
export type IssueDetailViewProps = {
  /** Structured single-issue tool result to display. */
  readonly result: IssueResult
}
