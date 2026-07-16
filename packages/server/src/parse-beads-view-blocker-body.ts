import { InvalidRequestError } from "./errors.js"
import type { BeadsViewBlockerBody } from "./types.js"

/** Validate and normalize a legacy Beads View blocker request. */
export function parseBeadsViewBlockerBody(
  /** Untrusted JSON request body. */
  input: unknown,
): BeadsViewBlockerBody {
  if (typeof input !== "object" || input === null) {
    throw new InvalidRequestError("blockerId must be a non-empty string")
  }
  const body = input as Record<string, unknown>
  if (typeof body.blockerId !== "string" || body.blockerId.trim() === "") {
    throw new InvalidRequestError("blockerId must be a non-empty string")
  }
  return { blockerId: body.blockerId.trim() }
}
