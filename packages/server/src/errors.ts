/** Error raised when an API request does not match the expected shape. */
export class InvalidRequestError extends Error {
  /** Stable machine-readable error code. */
  readonly code = "invalid_request"

  /** Create an invalid-request error. */
  constructor(
    /** Human-readable validation failure. */
    message: string,
  ) {
    super(message)
    this.name = "InvalidRequestError"
  }
}
