import type { CliOptions } from "./types.js"

/** Parse the intentionally small public CLI option surface. */
export function parseCliOptions(
  /** Command-line arguments after the executable name. */
  args: readonly string[],
): CliOptions {
  let openBrowser = true
  let port: number | undefined

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === "--no-open") {
      openBrowser = false
      continue
    }
    if (argument === "--port") {
      const value = Number(args[index + 1])
      if (!Number.isInteger(value) || value < 1 || value > 65_535) {
        throw new Error("Port must be an integer from 1 to 65535")
      }
      port = value
      index += 1
      continue
    }
    throw new Error(`Unknown option: ${argument}`)
  }

  return { openBrowser, ...(port === undefined ? {} : { port }) }
}
