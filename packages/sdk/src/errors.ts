/** Error raised when `bd` returns malformed or incompatible JSON. */
export class BdOutputError extends Error {
  /** Stable machine-readable error code. */
  readonly code = "invalid_output"

  /** Unparseable command output. */
  readonly output: string

  /** Create an invalid-output error. */
  constructor(
    /** Unparseable command output. */
    output: string,
    /** Original parsing or validation failure. */
    cause: unknown,
  ) {
    super("The bd command returned invalid JSON output", { cause })
    this.name = "BdOutputError"
    this.output = output
  }
}

/** Error raised when the `bd` executable exits unsuccessfully. */
export class BdCommandError extends Error {
  /** Arguments passed to the failed command. */
  readonly args: readonly string[]

  /** Stable machine-readable error code. */
  readonly code = "command_failed"

  /** Process exit code, when the operating system supplied one. */
  readonly exitCode: number | null

  /** Standard error captured from the failed command. */
  readonly stderr: string

  /** Create a command failure error. */
  constructor(
    /** Arguments passed to the failed command. */
    args: readonly string[],
    /** Process exit code, when available. */
    exitCode: number | null,
    /** Standard error captured from the command. */
    stderr: string,
    /** Original execution failure. */
    cause: unknown,
  ) {
    super(stderr || "The bd command failed", { cause })
    this.name = "BdCommandError"
    this.args = args
    this.exitCode = exitCode
    this.stderr = stderr
  }
}
