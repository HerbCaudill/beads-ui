import type { UpdateIssueInput } from "@beads/sdk"

import { parseUpdateIssueBody } from "./parse-update-issue-body.js"

/** Normalize legacy nullable parent updates before validating them. */
export function parseBeadsViewUpdateBody(
  /** Untrusted JSON request body. */
  input: unknown,
): UpdateIssueInput {
  if (typeof input !== "object" || input === null) return parseUpdateIssueBody(input)

  const body = input as Record<string, unknown>
  return parseUpdateIssueBody({ ...body, parent: body.parent === null ? "" : body.parent })
}
