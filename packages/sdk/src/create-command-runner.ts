import { BdCommandError } from "./errors.js"
import type { CommandExecutor, CommandRunner } from "./types.js"

/** Create a shell-free Beads command runner from an injected executor. */
export function createCommandRunner(
  /** Low-level executable adapter. */
  execute: CommandExecutor,
): CommandRunner {
  return async (request) => {
    try {
      return await execute("bd", request.args, {
        cwd: request.cwd,
        encoding: "utf8",
      })
    } catch (cause) {
      const failure = cause as { readonly code?: unknown; readonly stderr?: unknown }
      const exitCode = typeof failure.code === "number" ? failure.code : null
      const stderr = typeof failure.stderr === "string" ? failure.stderr : ""

      throw new BdCommandError(request.args, exitCode, stderr, cause)
    }
  }
}
