import { IssueSchema } from "./issue-schema.js"
import { parseBdJson } from "./parse-bd-json.js"
import type { CreateIssueInput, Issue, SdkOptions } from "./types.js"

/** Create an issue in the configured Beads workspace. */
export async function createIssue(
  /** SDK dependencies and fixed workspace path. */
  options: SdkOptions,
  /** Typed fields for the new issue. */
  input: CreateIssueInput,
): Promise<Issue> {
  const args = [
    "create",
    "--json",
    `--title=${input.title}`,
    ...(input.description === undefined ? [] : [`--description=${input.description}`]),
    ...(input.type === undefined ? [] : [`--type=${input.type}`]),
    ...(input.priority === undefined ? [] : [`--priority=${input.priority}`]),
    ...(input.assignee === undefined ? [] : [`--assignee=${input.assignee}`]),
    ...(input.parent === undefined ? [] : [`--parent=${input.parent}`]),
    ...(input.labels?.length ? [`--labels=${input.labels.join(",")}`] : []),
  ]
  const result = await options.runner({ args, cwd: options.cwd })

  return parseBdJson(IssueSchema, result.stdout)
}
