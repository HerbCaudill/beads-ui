import { parseCliOptions } from "./parse-cli-options.js"
import type { CliCommand } from "./types.js"

/** Select the public CLI mode and parse its arguments. */
export function parseCliCommand(
  /** Command-line arguments after the executable name. */
  args: readonly string[],
): CliCommand {
  if (args[0] === "mcp") {
    if (args.length > 1) throw new Error("The mcp command does not accept options")
    return { kind: "mcp" }
  }
  return { kind: "web", options: parseCliOptions(args) }
}
