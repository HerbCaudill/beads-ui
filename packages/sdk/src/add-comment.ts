import { CommentSchema } from "./comment-schema.js"
import { parseBdJson } from "./parse-bd-json.js"
import type { Comment, SdkOptions } from "./types.js"

/** Add a comment to an issue in the configured workspace. */
export async function addComment(
  /** SDK dependencies and fixed workspace path. */
  options: SdkOptions,
  /** Stable identifier of the issue receiving the comment. */
  issueId: string,
  /** Comment body. */
  text: string,
  /** Optional display name for the comment author. */
  author?: string,
): Promise<Comment> {
  const args = [
    "comments",
    "add",
    issueId,
    text,
    ...(author === undefined ? [] : ["--author", author]),
    "--json",
  ]
  const result = await options.runner({ args, cwd: options.cwd })

  return parseBdJson(CommentSchema, result.stdout)
}
