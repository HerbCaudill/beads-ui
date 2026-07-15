import type { CommandRunner } from "@beads/sdk"
import type { ServerOptions } from "@beads/server"
import type { Server } from "node:http"

/** Command-line options accepted by the public executable. */
export type CliOptions = {
  /** Whether to launch the system browser after startup. */
  readonly openBrowser: boolean
  /** Requested server port, or undefined to choose an available port. */
  readonly port?: number
}

/** Runtime dependencies used by the development launcher. */
export type DevelopmentDependencies = {
  /** Create the API and WebSocket server. */
  readonly createServer: (options: ServerOptions) => Server
  /** Find an available loopback port. */
  readonly findPort: () => Promise<number>
  /** Launch a URL in the system browser. */
  readonly openUrl: (url: string) => Promise<unknown>
  /** Execute supported Beads commands. */
  readonly runner: CommandRunner
  /** Start the Vite frontend for a backend URL. */
  readonly startFrontend: (backendUrl: string) => Promise<StartedFrontend>
  /** Write one terminal output line. */
  readonly writeLine: (line: string) => void
}

/** Running development application details. */
export type StartedDevelopmentApplication = StartedFrontend & {
  /** Loopback URL for the API backend. */
  readonly backendUrl: string
  /** Canonical workspace managed by the application. */
  readonly workspace: string
}

/** Running frontend details. */
export type StartedFrontend = {
  /** Release frontend resources. */
  readonly close: () => Promise<void>
  /** Browser URL for the frontend. */
  readonly url: string
}

/** Startup check for the external Beads executable. */
export type VerifyBd = () => Promise<void>
