import { InvalidRequestError } from "./errors.js"
import type { BeadsViewCommentBody } from "./types.js"

/** Validate and normalize a legacy Beads View comment request. */
export function parseBeadsViewCommentBody(
  /** Untrusted JSON request body. */
  input: unknown,
): BeadsViewCommentBody {
  if (typeof input !== "object" || input === null) {
    throw new InvalidRequestError("comment must be a non-empty string")
  }
  const body = input as Record<string, unknown>
  if (typeof body.comment !== "string" || body.comment.trim() === "") {
    throw new InvalidRequestError("comment must be a non-empty string")
  }
  if (body.author !== undefined && typeof body.author !== "string") {
    throw new InvalidRequestError("author must be a string")
  }
  return { author: body.author as string | undefined, comment: body.comment.trim() }
}
