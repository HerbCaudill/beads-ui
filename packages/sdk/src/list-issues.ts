import { Schema } from "effect"

import { IssueSchema } from "./issue-schema.js"
import { parseBdJson } from "./parse-bd-json.js"
import type { Issue, SdkOptions } from "./types.js"

/** List every issue in the configured Beads workspace. */
export async function listIssues(
  /** SDK dependencies and fixed workspace path. */
  options: SdkOptions,
): Promise<readonly Issue[]> {
  const result = await options.runner({
    args: ["list", "--json", "--all", "--limit", "0"],
    cwd: options.cwd,
  })

  return parseBdJson(Schema.Array(IssueSchema), result.stdout)
}
