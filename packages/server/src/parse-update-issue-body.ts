import type { IssueStatus, IssueType, UpdateIssueInput } from "@beads/sdk"

import { ISSUE_STATUSES, ISSUE_TYPES } from "./constants.js"
import { InvalidRequestError } from "./errors.js"

/** Validate fields accepted by an issue update request. */
export function parseUpdateIssueBody(
  /** Untrusted JSON request body. */
  input: unknown,
): UpdateIssueInput {
  if (typeof input !== "object" || input === null) {
    throw new InvalidRequestError("request body must be an object")
  }
  const body = input as Record<string, unknown>
  for (const field of ["title", "description", "assignee", "parent"] as const) {
    if (body[field] !== undefined && typeof body[field] !== "string") {
      throw new InvalidRequestError(`${field} must be a string`)
    }
  }
  if (
    body.status !== undefined &&
    (typeof body.status !== "string" || !ISSUE_STATUSES.includes(body.status as IssueStatus))
  ) {
    throw new InvalidRequestError("status is invalid")
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
  return input as UpdateIssueInput
}
