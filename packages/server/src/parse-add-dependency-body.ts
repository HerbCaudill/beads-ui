import type { DependencyType } from "@beads/sdk"

import { DEPENDENCY_TYPES } from "./constants.js"
import { InvalidRequestError } from "./errors.js"
import type { AddDependencyBody } from "./types.js"

/** Validate an untrusted dependency creation request. */
export function parseAddDependencyBody(
  /** Untrusted JSON request body. */
  input: unknown,
): AddDependencyBody {
  if (typeof input !== "object" || input === null) {
    throw new InvalidRequestError("dependsOnId must be a non-empty string")
  }
  const body = input as Record<string, unknown>
  if (typeof body.dependsOnId !== "string" || body.dependsOnId.trim() === "") {
    throw new InvalidRequestError("dependsOnId must be a non-empty string")
  }
  if (
    body.type !== undefined &&
    (typeof body.type !== "string" || !DEPENDENCY_TYPES.includes(body.type as DependencyType))
  ) {
    throw new InvalidRequestError("dependency type is invalid")
  }
  return input as AddDependencyBody
}
