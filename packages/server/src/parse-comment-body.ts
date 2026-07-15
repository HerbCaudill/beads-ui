import { InvalidRequestError } from "./errors.js"
import type { CommentBody } from "./types.js"

/** Validate an untrusted comment creation request. */
export function parseCommentBody(
  /** Untrusted JSON request body. */
  input: unknown,
): CommentBody {
  if (typeof input !== "object" || input === null) {
    throw new InvalidRequestError("text must be a non-empty string")
  }
  const body = input as Record<string, unknown>
  if (typeof body.text !== "string" || body.text.trim() === "") {
    throw new InvalidRequestError("text must be a non-empty string")
  }
  if (body.author !== undefined && typeof body.author !== "string") {
    throw new InvalidRequestError("author must be a string")
  }
  return input as CommentBody
}
