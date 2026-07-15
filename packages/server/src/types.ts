import type { CommandRunner, DependencyType } from "@beads/sdk"

/** Dependencies and immutable workspace configuration for the server. */
export type ServerOptions = {
  /** Canonical workspace directory managed by the server. */
  readonly cwd: string
  /** Delay between external-change checks. */
  readonly pollIntervalMs?: number
  /** Executor used for all Beads CLI operations. */
  readonly runner: CommandRunner
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
