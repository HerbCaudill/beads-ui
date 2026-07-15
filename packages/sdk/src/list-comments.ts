import { Schema } from "effect"

import { CommentSchema } from "./comment-schema.js"
import { parseBdJson } from "./parse-bd-json.js"
import type { Comment, SdkOptions } from "./types.js"

/** List comments attached to an issue in the configured workspace. */
export async function listComments(
  /** SDK dependencies and fixed workspace path. */
  options: SdkOptions,
  /** Stable identifier of the issue containing the comments. */
  issueId: string,
): Promise<readonly Comment[]> {
  const result = await options.runner({
    args: ["comments", "--json", "--", issueId],
    cwd: options.cwd,
  })

  return parseBdJson(Schema.Array(CommentSchema), result.stdout)
}
