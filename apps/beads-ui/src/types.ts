/** Command-line options accepted by the public executable. */
export type CliOptions = {
  /** Whether to launch the system browser after startup. */
  readonly openBrowser: boolean
  /** Requested server port, or undefined to choose an available port. */
  readonly port?: number
}

/** Startup check for the external Beads executable. */
export type VerifyBd = () => Promise<void>
