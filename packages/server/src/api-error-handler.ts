import { BdCommandError, BdOutputError } from "@beads/sdk"
import type { ErrorRequestHandler } from "express"

import { InvalidRequestError } from "./errors.js"

/** Convert internal failures into stable JSON API errors. */
export const apiErrorHandler: ErrorRequestHandler = (
  /** Failure raised while processing the request. */
  error: unknown,
  /** Express request, unused by this handler. */
  _request,
  /** Express response used to return the structured error. */
  response,
  /** Express continuation callback, unused because this is terminal. */
  _next,
) => {
  if (error instanceof InvalidRequestError) {
    response.status(400).json({ error: { code: error.code, message: error.message } })
    return
  }
  if (error instanceof BdCommandError || error instanceof BdOutputError) {
    response.status(502).json({ error: { code: error.code, message: error.message } })
    return
  }

  response.status(500).json({ error: { code: "internal_error", message: "Internal server error" } })
}
