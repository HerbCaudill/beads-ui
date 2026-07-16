import type { CommandRunner, DependencyType, IssueStatus } from "@beads/sdk"

/** Dependencies and immutable workspace configuration for the server. */
export type ServerOptions = {
  /** Canonical workspace directory managed by the server. */
  readonly cwd: string
  /** Delay between external-change checks. */
  readonly pollIntervalMs?: number
  /** Executor used for all Beads CLI operations. */
  readonly runner: CommandRunner
  /** Built web application directory served from the same origin. */
  readonly staticDir?: string
}

/** Request body for creating a dependency. */
export type AddDependencyBody = {
  /** Identifier of the issue being depended on. */
  readonly dependsOnId: string
  /** Semantic relationship between the issues. */
  readonly type?: DependencyType
}

/** Request body for changing one label. */
export type LabelBody = {
  /** Label to attach to the issue. */
  readonly label: string
}

/** Request body for adding an issue comment. */
export type CommentBody = {
  /** Optional display name for the author. */
  readonly author?: string
  /** Comment body. */
  readonly text: string
}

/** Legacy task shape consumed by the extracted Beads View application. */
export type BeadsViewTask = {
  /** Timestamp when the task was closed. */
  readonly closed_at?: string
  /** Timestamp when the task was created. */
  readonly created_at: string
  /** Issues this task depends on. */
  readonly dependencies?: readonly BeadsViewRelatedTask[]
  /** Longer task description. */
  readonly description?: string
  /** Issues that depend on this task. */
  readonly dependents?: readonly BeadsViewRelatedTask[]
  /** Stable task identifier. */
  readonly id: string
  /** Legacy name for the issue category. */
  readonly issue_type: string
  /** Labels attached to the task. */
  readonly labels: readonly string[]
  /** Parent task identifier. */
  readonly parent?: string
  /** Priority from zero, highest, through four, lowest. */
  readonly priority: number
  /** Current workflow status. */
  readonly status: IssueStatus
  /** Short task title. */
  readonly title: string
}

/** Legacy relationship shape consumed by Beads View. */
export type BeadsViewRelatedTask = {
  /** Legacy name for the relationship type. */
  readonly dependency_type: DependencyType
  /** Stable related-task identifier. */
  readonly id: string
  /** Legacy name for the related issue category. */
  readonly issue_type: string
  /** Priority from zero, highest, through four, lowest. */
  readonly priority: number
  /** Current workflow status. */
  readonly status: IssueStatus
  /** Short related-task title. */
  readonly title: string
}

/** Legacy comment shape consumed by Beads View. */
export type BeadsViewComment = {
  /** Display name recorded for the comment author. */
  readonly author: string
  /** Legacy name for the creation timestamp. */
  readonly created_at: string
  /** Stable comment identifier. */
  readonly id: number | string
  /** Legacy name for the containing task identifier. */
  readonly issue_id: string
  /** Comment body. */
  readonly text: string
}

/** Legacy request body for adding a Beads View comment. */
export type BeadsViewCommentBody = {
  /** Optional display name for the author. */
  readonly author?: string
  /** Trimmed comment body. */
  readonly comment: string
}

/** Legacy request body for adding a blocker in Beads View. */
export type BeadsViewBlockerBody = {
  /** Identifier of the blocking task. */
  readonly blockerId: string
}
