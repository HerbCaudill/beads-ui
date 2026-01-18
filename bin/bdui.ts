#!/usr/bin/env tsx
/**
 * Thin CLI entry for `bdui`.
 * Delegates to `server/cli/index.ts` and sets the process exit code.
 */
import { main } from "../server/cli/index.ts"
import { debug } from "../server/logging.ts"

const argv = process.argv.slice(2)

try {
  const code = await main(argv)
  if (Number.isFinite(code)) {
    process.exitCode = code
  }
} catch (err) {
  debug("cli")("fatal %o", err)
  process.exitCode = 1
}
