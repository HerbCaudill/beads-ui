import { Schema } from "effect"

import { IssueSchema } from "./issue-schema.js"
import { parseBdJson } from "./parse-bd-json.js"
import type { Issue, SdkOptions } from "./types.js"

/** List every issue in the configured Beads workspace. */
export async function listIssues(
  /** SDK dependencies and fixed workspace path. */
  options: SdkOptions,
): Promise<readonly Issue[]> {
  const [listResult, readyResult] = await Promise.all([
    options.runner({
      args: ["list", "--json", "--all", "--limit", "0"],
      cwd: options.cwd,
    }),
    options.runner({
      args: ["ready", "--json", "--limit", "0"],
      cwd: options.cwd,
    }),
  ])

  const issues = parseBdJson(Schema.Array(IssueSchema), listResult.stdout)
  const readyIssueIds = new Set(
    parseBdJson(Schema.Array(IssueSchema), readyResult.stdout).map((issue) => issue.id),
  )

  return issues.map((issue) => ({ ...issue, isReady: readyIssueIds.has(issue.id) }))
}
