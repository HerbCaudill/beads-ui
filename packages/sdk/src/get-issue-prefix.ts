import { Schema } from "effect"

import { parseBdJson } from "./parse-bd-json.js"
import type { SdkOptions } from "./types.js"

const IssuePrefixConfigSchema = Schema.Struct({
  value: Schema.String,
})

/** Read the issue prefix configured for the Beads workspace. */
export async function getIssuePrefix(
  /** SDK dependencies and fixed workspace path. */
  options: SdkOptions,
): Promise<string> {
  const result = await options.runner({
    args: ["config", "get", "issue_prefix", "--json"],
    cwd: options.cwd,
  })

  return parseBdJson(IssuePrefixConfigSchema, result.stdout).value
}
