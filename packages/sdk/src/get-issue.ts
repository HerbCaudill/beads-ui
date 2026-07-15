import { Schema } from "effect"

import { IssueDetailSchema } from "./issue-detail-schema.js"
import { parseBdJson } from "./parse-bd-json.js"
import type { IssueDetail, SdkOptions } from "./types.js"

/** Get one issue from the configured Beads workspace. */
export async function getIssue(
  /** SDK dependencies and fixed workspace path. */
  options: SdkOptions,
  /** Stable identifier of the issue to retrieve. */
  issueId: string,
): Promise<IssueDetail | null> {
  const result = await options.runner({
    args: ["show", issueId, "--json", "--include-comments", "--include-dependents"],
    cwd: options.cwd,
  })
  const issues = parseBdJson(Schema.Array(IssueDetailSchema), result.stdout)

  return issues[0] ?? null
}
