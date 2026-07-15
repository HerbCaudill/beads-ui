import { InvalidRequestError } from "./errors.js"
import type { LabelBody } from "./types.js"

/** Validate an untrusted label mutation request. */
export function parseLabelBody(
  /** Untrusted JSON request body. */
  input: unknown,
): LabelBody {
  if (typeof input !== "object" || input === null) {
    throw new InvalidRequestError("label must be a non-empty string")
  }
  const body = input as Record<string, unknown>
  if (typeof body.label !== "string" || body.label.trim() === "") {
    throw new InvalidRequestError("label must be a non-empty string")
  }
  return input as LabelBody
}
