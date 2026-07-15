import type { CommandRunner } from "@beads/sdk"

/** Verify that the external Beads executable can be launched. */
export async function verifyBd(
  /** Canonical workspace directory used for the check. */
  cwd: string,
  /** Shell-free command runner. */
  runner: CommandRunner,
): Promise<void> {
  try {
    await runner({ args: ["--version"], cwd })
  } catch (cause) {
    throw new Error("Beads CLI (`bd`) is unavailable. Install it and ensure `bd` is on PATH.", {
      cause,
    })
  }
}
