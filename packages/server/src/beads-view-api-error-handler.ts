import { BdCommandError, BdOutputError } from "@beads/sdk"
import type { ErrorRequestHandler } from "express"

import { InvalidRequestError } from "./errors.js"

/** Convert compatibility-route failures to Beads View's legacy error contract. */
export const beadsViewApiErrorHandler: ErrorRequestHandler = (
  /** Failure raised while processing the request. */
  error: unknown,
  /** Express request, unused by this handler. */
  _request,
  /** Express response used to return the legacy error shape. */
  response,
  /** Express continuation callback, unused because this is terminal. */
  _next,
) => {
  if (error instanceof InvalidRequestError) {
    response.status(400).json({ ok: false, error: error.message })
    return
  }
  if (error instanceof BdCommandError || error instanceof BdOutputError) {
    response.status(500).json({ ok: false, error: error.message })
    return
  }
  response.status(500).json({ ok: false, error: "Internal server error" })
}
