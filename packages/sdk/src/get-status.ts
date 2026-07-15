import { parseBdJson } from "./parse-bd-json.js"
import { StatusResponseSchema } from "./status-response-schema.js"
import type { SdkOptions, StatusSummary } from "./types.js"

/** Get normalized issue counts for the configured Beads workspace. */
export async function getStatus(
  /** SDK dependencies and fixed workspace path. */
  options: SdkOptions,
): Promise<StatusSummary> {
  const result = await options.runner({
    args: ["status", "--json"],
    cwd: options.cwd,
  })

  return parseBdJson(StatusResponseSchema, result.stdout).summary
}
