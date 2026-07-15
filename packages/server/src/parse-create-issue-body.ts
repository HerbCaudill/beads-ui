import type { CreateIssueInput } from "@beads/sdk"

import { InvalidRequestError } from "./errors.js"

/** Validate the required fields in an issue creation request. */
export function parseCreateIssueBody(
  /** Untrusted JSON request body. */
  input: unknown,
): CreateIssueInput {
  if (typeof input !== "object" || input === null) {
    throw new InvalidRequestError("title must be a non-empty string")
  }

  const body = input as Record<string, unknown>
  if (typeof body.title !== "string" || body.title.trim() === "") {
    throw new InvalidRequestError("title must be a non-empty string")
  }

  return input as CreateIssueInput
}
