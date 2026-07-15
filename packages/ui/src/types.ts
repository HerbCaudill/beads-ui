/** The one workspace managed by the application. */
export type Workspace = {
  /** Display name derived from the workspace directory. */
  readonly name: string
  /** Canonical absolute workspace path. */
  readonly path: string
}

/** Supported issue workflow states. */
export type IssueStatus = "open" | "in_progress" | "blocked" | "deferred" | "closed"

/** Supported issue categories. */
export type IssueType = "bug" | "feature" | "task" | "epic" | "chore" | "decision"

/** Task data returned by the local API. */
export type Issue = {
  /** Number of attached comments. */
  readonly commentCount: number
  /** Timestamp when the task was created. */
  readonly createdAt: string
  /** Number of active dependencies. */
  readonly dependencyCount: number
  /** Number of tasks depending on this task. */
  readonly dependentCount: number
  /** Longer task description. */
  readonly description?: string
  /** Stable task identifier. */
  readonly id: string
  /** Labels attached to the task. */
  readonly labels: readonly string[]
  /** Priority from zero, highest, through four, lowest. */
  readonly priority: number
  /** Current workflow status. */
  readonly status: IssueStatus
  /** Short task title. */
  readonly title: string
  /** Task category. */
  readonly type: IssueType
  /** Timestamp when the task was last updated. */
  readonly updatedAt: string
}

/** Workspace-level task counts. */
export type StatusSummary = {
  /** Number of blocked tasks. */
  readonly blocked: number
  /** Number of completed tasks. */
  readonly closed: number
  /** Number of deferred tasks. */
  readonly deferred: number
  /** Number of active tasks. */
  readonly inProgress: number
  /** Number of open tasks. */
  readonly open: number
  /** Number of tasks ready to start. */
  readonly ready: number
  /** Total tasks in the workspace. */
  readonly total: number
}

/** A comment attached to a task. */
export type Comment = {
  /** Display name of the author. */
  readonly author: string
  /** Timestamp when the comment was added. */
  readonly createdAt: string
  /** Stable comment identifier. */
  readonly id: string
  /** Identifier of the containing task. */
  readonly issueId: string
  /** Comment body. */
  readonly text: string
}

/** A task related to the selected task. */
export type RelatedIssue = {
  /** Relationship between the tasks. */
  readonly dependencyType: string
  /** Stable task identifier. */
  readonly id: string
  /** Task priority. */
  readonly priority: number
  /** Current workflow status. */
  readonly status: IssueStatus
  /** Short task title. */
  readonly title: string
  /** Task category. */
  readonly type: IssueType
}

/** Selected task with relationships and comments. */
export type IssueDetail = Issue & {
  /** Comments attached to the task. */
  readonly comments: readonly Comment[]
  /** Tasks this task depends on. */
  readonly dependencies: readonly RelatedIssue[]
  /** Tasks that depend on this task. */
  readonly dependents: readonly RelatedIssue[]
}

/** Editable task fields submitted by the task form. */
export type TaskDraft = {
  /** Longer task description. */
  readonly description?: string
  /** Labels attached to the task. */
  readonly labels?: readonly string[]
  /** Priority from zero, highest, through four, lowest. */
  readonly priority: number
  /** Workflow status when editing an existing task. */
  readonly status?: IssueStatus
  /** Short task title. */
  readonly title: string
  /** Task category. */
  readonly type: IssueType
}

/** Minimal browser socket surface used by workspace subscriptions. */
export type WorkspaceSocket = {
  /** Register a workspace event listener. */
  readonly addEventListener: (
    type: "message",
    listener: (event: MessageEvent<string>) => void,
  ) => void
  /** Close the socket and release resources. */
  readonly close: () => void
}

/** Factory used to open the workspace event socket. */
export type WorkspaceSocketFactory = (url: string) => WorkspaceSocket
