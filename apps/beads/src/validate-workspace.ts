import { access, realpath, stat } from "node:fs/promises"
import { constants } from "node:fs"
import { join } from "node:path"

import type { VerifyBd } from "./types.js"

/** Validate and canonicalize the launch directory without initializing it. */
export async function validateWorkspace(
  /** Directory from which the CLI was launched. */
  cwd: string,
  /** Check that the external `bd` executable is available. */
  verifyBd: VerifyBd,
): Promise<string> {
  let canonical: string
  try {
    canonical = await realpath(cwd)
    await access(canonical, constants.R_OK)
  } catch (cause) {
    throw new Error(`Workspace is unreadable: ${cwd}`, { cause })
  }

  const beadsDirectory = join(canonical, ".beads")
  try {
    const details = await stat(beadsDirectory)
    if (!details.isDirectory()) throw new Error("Not a directory")
    await access(beadsDirectory, constants.R_OK)
  } catch (cause) {
    throw new Error(`No .beads directory found in ${canonical}`, { cause })
  }

  await verifyBd()
  return canonical
}
