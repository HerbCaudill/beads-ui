/**
 * DetailView container component.
 *
 * Displays the full details of an issue in a modal dialog. This is the main container
 * for the issue detail view, which includes:
 * - Header with editable title
 * - Properties panel (status, priority, type, assignee)
 * - Description, design, notes, and acceptance criteria sections
 * - Labels section
 * - Dependencies and dependents lists
 * - Comments section
 *
 * The component uses React context to provide issue data and transport function
 * to child components, enabling them to read and update issue data.
 */
import { createContext, useContext, useMemo } from "react"

import type { IssueDetail, Comment, DependencyRef } from "../../types/issues.js"
import { useIssueStore } from "../hooks/index.js"
import { useTransport, type TransportFn } from "../hooks/use-transport.js"

/**
 * Context value for DetailView children.
 *
 * Provides access to the current issue data and transport function for mutations.
 */
export interface DetailContextValue {
  /** The current issue being displayed. */
  issue: IssueDetail | null
  /** Whether data is loading. */
  loading: boolean
  /** Transport function for sending mutations to the server. */
  transport: TransportFn
  /** Navigate to another issue. */
  onNavigate: (id: string) => void
}

/**
 * React context for DetailView.
 *
 * Child components use this context to access issue data and the transport function.
 */
export const DetailContext = createContext<DetailContextValue | null>(null)

/**
 * Hook to access the DetailContext.
 *
 * @throws Error if used outside of a DetailView component.
 * @returns The DetailContext value.
 */
export function useDetailContext(): DetailContextValue {
  const context = useContext(DetailContext)
  if (!context) {
    throw new Error("useDetailContext must be used within a DetailView component")
  }
  return context
}

/**
 * Props for the DetailView component.
 */
export interface DetailViewProps {
  /** The ID of the issue to display. */
  issueId: string
  /** Handler for navigating to another issue. */
  onNavigate: (id: string) => void
  /** Optional test ID for testing. */
  testId?: string
}

/**
 * Placeholder component for DetailHeader.
 *
 * Will be replaced with the actual DetailHeader component in a subsequent issue.
 */
function DetailHeaderPlaceholder({ issue }: { issue: IssueDetail }): React.JSX.Element {
  return (
    <div className="detail-title" data-testid="detail-header-placeholder">
      <h2>
        <span className="editable" tabIndex={0} role="button" aria-label="Edit title">
          {issue.title || "(no title)"}
        </span>
      </h2>
    </div>
  )
}

/**
 * Placeholder component for DetailProperties.
 *
 * Will be replaced with the actual DetailProperties component in a subsequent issue.
 */
function DetailPropertiesPlaceholder({ issue }: { issue: IssueDetail }): React.JSX.Element {
  return (
    <div className="props-card" data-testid="detail-properties-placeholder">
      <div className="props-card__header">
        <div className="props-card__title">Properties</div>
      </div>
      <div className="prop">
        <div className="label">Type</div>
        <div className="value">
          {(issue as IssueDetail & { issue_type?: string }).issue_type || "—"}
        </div>
      </div>
      <div className="prop">
        <div className="label">Status</div>
        <div className="value">{issue.status || "open"}</div>
      </div>
      <div className="prop">
        <div className="label">Priority</div>
        <div className="value">P{issue.priority ?? 2}</div>
      </div>
      <div className="prop">
        <div className="label">Assignee</div>
        <div className="value">{issue.assignee || "Unassigned"}</div>
      </div>
    </div>
  )
}

/**
 * Placeholder component for EditableMarkdownField.
 *
 * Used for description, design, notes, and acceptance criteria fields.
 * Will be replaced with the actual component in a subsequent issue.
 */
function EditableMarkdownFieldPlaceholder({
  label,
  value,
  placeholder,
}: {
  label: string
  value: string
  placeholder: string
}): React.JSX.Element {
  const hasContent = value.trim().length > 0
  return (
    <div className={label.toLowerCase()} data-testid={`detail-${label.toLowerCase()}-placeholder`}>
      {hasContent && <div className="props-card__title">{label}</div>}
      <div
        className="md editable"
        tabIndex={0}
        role="button"
        aria-label={`Edit ${label.toLowerCase()}`}
      >
        {hasContent ?
          <div>{value}</div>
        : <div className="muted">{placeholder}</div>}
      </div>
    </div>
  )
}

/**
 * Placeholder component for LabelsSection.
 *
 * Will be replaced with the actual LabelsSection component in a subsequent issue.
 */
function LabelsSectionPlaceholder({ labels }: { labels: string[] }): React.JSX.Element {
  return (
    <div className="props-card labels" data-testid="detail-labels-placeholder">
      <div>
        <div className="props-card__title">Labels</div>
      </div>
      <ul>
        {labels.map(label => (
          <li key={label}>
            <span className="badge" title={label}>
              {label}
            </span>
          </li>
        ))}
      </ul>
      <div className="props-card__footer">
        <input type="text" placeholder="Label" disabled />
        <button disabled>Add</button>
      </div>
    </div>
  )
}

/**
 * Placeholder component for DependencyList.
 *
 * Will be replaced with the actual DependencyList component in a subsequent issue.
 */
function DependencyListPlaceholder({
  title,
  items,
}: {
  title: "Dependencies" | "Dependents"
  items: DependencyRef[]
}): React.JSX.Element {
  const testId =
    title === "Dependencies" ? "detail-dependencies-placeholder" : "detail-dependents-placeholder"
  return (
    <div className="props-card" data-testid={testId}>
      <div>
        <div className="props-card__title">{title}</div>
      </div>
      <ul>
        {items.map(dep => (
          <li key={dep.id}>
            <span className="text-truncate">{dep.title || dep.id}</span>
          </li>
        ))}
      </ul>
      <div className="props-card__footer">
        <input type="text" placeholder="Issue ID" disabled />
        <button disabled>Add</button>
      </div>
    </div>
  )
}

/**
 * Placeholder component for CommentSection.
 *
 * Will be replaced with the actual CommentSection component in a subsequent issue.
 */
function CommentSectionPlaceholder({ comments }: { comments: Comment[] }): React.JSX.Element {
  return (
    <div className="comments" data-testid="detail-comments-placeholder">
      <div className="props-card__title">Comments</div>
      {comments.length === 0 ?
        <div className="muted">No comments yet</div>
      : comments.map(comment => (
          <div key={comment.id} className="comment-item">
            <div className="comment-header">
              <span className="comment-author">{comment.author || "Unknown"}</span>
              <span className="comment-date">{comment.created_at || ""}</span>
            </div>
            <div className="comment-text">{comment.text}</div>
          </div>
        ))
      }
      <div className="comment-input">
        <textarea placeholder="Add a comment..." rows={3} disabled />
        <button disabled>Add Comment</button>
      </div>
    </div>
  )
}

/**
 * DetailView container component.
 *
 * Renders the full issue detail view with all sections. Uses React context to
 * provide issue data and transport to child components.
 *
 * The component subscribes to the issue store using the `detail:${issueId}` client_id
 * pattern to receive real-time updates when the issue data changes.
 *
 * @param props - Component props.
 */
export function DetailView({ issueId, onNavigate, testId }: DetailViewProps): React.JSX.Element {
  // Get transport for mutations
  const transport = useTransport()

  // Subscribe to issue store for this specific issue
  const client_id = `detail:${issueId}`
  const issues = useIssueStore(client_id)

  // Find the specific issue from the store
  const issue = useMemo(() => {
    if (!issues || issues.length === 0) return null
    // Find the issue matching the ID, or use the first one if not found
    const found = issues.find(i => i.id === issueId)
    return (found || issues[0]) as IssueDetail | null
  }, [issues, issueId])

  // Create context value
  const contextValue = useMemo<DetailContextValue>(
    () => ({
      issue,
      loading: !issue,
      transport,
      onNavigate,
    }),
    [issue, transport, onNavigate],
  )

  // Loading state
  if (!issue) {
    return (
      <div className="panel__body" id="detail-root" data-testid={testId}>
        <p className="muted">Loading...</p>
      </div>
    )
  }

  // Extract fields with defaults
  const description = issue.description || ""
  const design = issue.design || ""
  const notes = issue.notes || ""
  const acceptance = issue.acceptance || ""
  const labels = issue.labels || []
  const dependencies = issue.dependencies || []
  const dependents = issue.dependents || []
  const comments = issue.comments || []

  return (
    <DetailContext.Provider value={contextValue}>
      <div className="panel__body" id="detail-root" data-testid={testId}>
        <div className="detail-layout">
          {/* Main content area */}
          <div className="detail-main">
            <DetailHeaderPlaceholder issue={issue} />
            <EditableMarkdownFieldPlaceholder
              label="Description"
              value={description}
              placeholder="Description"
            />
            <EditableMarkdownFieldPlaceholder
              label="Design"
              value={design}
              placeholder="Add design..."
            />
            <EditableMarkdownFieldPlaceholder
              label="Notes"
              value={notes}
              placeholder="Add notes..."
            />
            <EditableMarkdownFieldPlaceholder
              label="Acceptance"
              value={acceptance}
              placeholder="Add acceptance criteria..."
            />
            <CommentSectionPlaceholder comments={comments} />
          </div>

          {/* Sidebar */}
          <div className="detail-side">
            <DetailPropertiesPlaceholder issue={issue} />
            <LabelsSectionPlaceholder labels={labels} />
            <DependencyListPlaceholder title="Dependencies" items={dependencies} />
            <DependencyListPlaceholder title="Dependents" items={dependents} />
          </div>
        </div>
      </div>
    </DetailContext.Provider>
  )
}
