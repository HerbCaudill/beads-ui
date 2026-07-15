/** A request to execute the Beads CLI. */
export type CommandRequest = {
  /** Arguments passed to the `bd` executable. */
  readonly args: readonly string[]
  /** Absolute workspace directory used for the command. */
  readonly cwd: string
}

/** Captured output from a successful Beads CLI command. */
export type CommandResult = {
  /** Standard error emitted by the command. */
  readonly stderr: string
  /** Standard output emitted by the command. */
  readonly stdout: string
}

/** Injected executor for Beads CLI commands. */
export type CommandRunner = (
  /** The command request to execute. */
  request: CommandRequest,
) => Promise<CommandResult>

/** Options passed to the shell-free executable adapter. */
export type CommandExecutorOptions = {
  /** Directory used as the child process working directory. */
  readonly cwd: string
  /** Text encoding used for captured output. */
  readonly encoding: "utf8"
}

/** Injected shell-free executable adapter used by the command runner. */
export type CommandExecutor = (
  /** Executable name. */
  file: string,
  /** Individual arguments passed directly to the executable. */
  args: readonly string[],
  /** Child process execution options. */
  options: CommandExecutorOptions,
) => Promise<CommandResult>

/** Dependencies shared by SDK operations. */
export type SdkOptions = {
  /** Absolute Beads workspace directory. */
  readonly cwd: string
  /** Executor used to invoke the Beads CLI. */
  readonly runner: CommandRunner
}

/** A supported Beads issue status. */
export type IssueStatus = "open" | "in_progress" | "blocked" | "deferred" | "closed"

/** A supported Beads issue type. */
export type IssueType =
  | "bug"
  | "feature"
  | "task"
  | "epic"
  | "chore"
  | "decision"
  | "merge-request"
  | "molecule"
  | "gate"
  | "convoy"

/** A normalized Beads issue returned by the SDK. */
export type Issue = {
  /** Assigned user, when present. */
  readonly assignee?: string
  /** Number of comments attached to the issue. */
  readonly commentCount: number
  /** Timestamp when the issue was closed. */
  readonly closedAt?: string
  /** Timestamp when the issue was created. */
  readonly createdAt: string
  /** Number of issues this issue depends on. */
  readonly dependencyCount: number
  /** Number of issues that depend on this issue. */
  readonly dependentCount: number
  /** Longer issue description. */
  readonly description?: string
  /** Stable Beads issue identifier. */
  readonly id: string
  /** Labels attached to the issue. */
  readonly labels: readonly string[]
  /** Issue owner, when present. */
  readonly owner?: string
  /** Parent issue identifier, when present. */
  readonly parent?: string
  /** Priority from zero, highest, through four, lowest. */
  readonly priority: number
  /** Timestamp when work started. */
  readonly startedAt?: string
  /** Current workflow status. */
  readonly status: IssueStatus
  /** Short issue title. */
  readonly title: string
  /** Issue category. */
  readonly type: IssueType
  /** Timestamp when the issue was last updated. */
  readonly updatedAt: string
}

/** Input accepted when creating a Beads issue. */
export type CreateIssueInput = {
  /** User assigned to the issue. */
  readonly assignee?: string
  /** Longer issue description. */
  readonly description?: string
  /** Labels attached to the issue. */
  readonly labels?: readonly string[]
  /** Parent issue identifier. */
  readonly parent?: string
  /** Priority from zero, highest, through four, lowest. */
  readonly priority?: number
  /** Short issue title. */
  readonly title: string
  /** Issue category. */
  readonly type?: IssueType
}

/** Fields that can be changed on an existing Beads issue. */
export type UpdateIssueInput = {
  /** User assigned to the issue, or an empty string to clear it. */
  readonly assignee?: string
  /** Longer issue description, or an empty string to clear it. */
  readonly description?: string
  /** Parent issue identifier, or an empty string to clear it. */
  readonly parent?: string
  /** Priority from zero, highest, through four, lowest. */
  readonly priority?: number
  /** New workflow status. */
  readonly status?: IssueStatus
  /** Short issue title. */
  readonly title?: string
  /** Issue category. */
  readonly type?: IssueType
}

/** Dependency relationship supported by the Beads CLI. */
export type DependencyType =
  | "blocks"
  | "tracks"
  | "related"
  | "parent-child"
  | "discovered-from"
  | "until"
  | "caused-by"
  | "validates"
  | "relates-to"
  | "supersedes"

/** A normalized comment attached to a Beads issue. */
export type Comment = {
  /** Display name recorded for the comment author. */
  readonly author: string
  /** Timestamp when the comment was created. */
  readonly createdAt: string
  /** Stable comment identifier. */
  readonly id: string
  /** Identifier of the issue containing the comment. */
  readonly issueId: string
  /** Comment body. */
  readonly text: string
}

/** Normalized issue counts for a Beads workspace. */
export type StatusSummary = {
  /** Number of issues blocked by active dependencies. */
  readonly blocked: number
  /** Number of completed issues. */
  readonly closed: number
  /** Number of deferred issues. */
  readonly deferred: number
  /** Number of issues actively being worked. */
  readonly inProgress: number
  /** Number of open issues, including active and blocked work. */
  readonly open: number
  /** Number of open issues without active blockers. */
  readonly ready: number
  /** Total number of issues in the workspace. */
  readonly total: number
}

/** An issue related to the selected issue. */
export type RelatedIssue = {
  /** Relationship from the selected issue to this issue. */
  readonly dependencyType: DependencyType
  /** Stable Beads issue identifier. */
  readonly id: string
  /** Priority from zero, highest, through four, lowest. */
  readonly priority: number
  /** Current workflow status. */
  readonly status: IssueStatus
  /** Short issue title. */
  readonly title: string
  /** Issue category. */
  readonly type: IssueType
}

/** An issue with related issues and inline comments. */
export type IssueDetail = Issue & {
  /** Comments attached to the issue. */
  readonly comments: readonly Comment[]
  /** Issues this issue depends on. */
  readonly dependencies: readonly RelatedIssue[]
  /** Issues that depend on this issue. */
  readonly dependents: readonly RelatedIssue[]
}
