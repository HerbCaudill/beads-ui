import { Schema } from "effect"

import { IssueSchema } from "./issue-schema.js"
import { parseBdJson } from "./parse-bd-json.js"
import type { Issue, SdkOptions, UpdateIssueInput } from "./types.js"

/** Update an issue in the configured Beads workspace. */
export async function updateIssue(
  /** SDK dependencies and fixed workspace path. */
  options: SdkOptions,
  /** Stable identifier of the issue to update. */
  issueId: string,
  /** Typed fields to change. */
  input: UpdateIssueInput,
): Promise<Issue> {
  const args = [
    "update",
    issueId,
    "--json",
    ...(input.title === undefined ? [] : ["--title", input.title]),
    ...(input.description === undefined ? [] : ["--description", input.description]),
    ...(input.description === "" ? ["--allow-empty-description"] : []),
    ...(input.status === undefined ? [] : ["--status", input.status]),
    ...(input.priority === undefined ? [] : ["--priority", String(input.priority)]),
    ...(input.type === undefined ? [] : ["--type", input.type]),
    ...(input.assignee === undefined ? [] : ["--assignee", input.assignee]),
    ...(input.parent === undefined ? [] : ["--parent", input.parent]),
  ]
  const result = await options.runner({ args, cwd: options.cwd })
  const issues = parseBdJson(Schema.NonEmptyArray(IssueSchema), result.stdout)

  return issues[0]
}
