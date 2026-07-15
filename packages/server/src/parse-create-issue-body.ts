import type { CreateIssueInput, IssueType } from "@beads/sdk"

import { ISSUE_TYPES } from "./constants.js"
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
  for (const field of ["description", "assignee", "parent"] as const) {
    if (body[field] !== undefined && typeof body[field] !== "string") {
      throw new InvalidRequestError(`${field} must be a string`)
    }
  }
  if (
    body.type !== undefined &&
    (typeof body.type !== "string" || !ISSUE_TYPES.includes(body.type as IssueType))
  ) {
    throw new InvalidRequestError("type is invalid")
  }
  if (
    body.priority !== undefined &&
    (!Number.isInteger(body.priority) || Number(body.priority) < 0 || Number(body.priority) > 4)
  ) {
    throw new InvalidRequestError("priority must be an integer from 0 to 4")
  }
  if (
    body.labels !== undefined &&
    (!Array.isArray(body.labels) || body.labels.some((label) => typeof label !== "string"))
  ) {
    throw new InvalidRequestError("labels must be an array of strings")
  }

  return input as CreateIssueInput
}
