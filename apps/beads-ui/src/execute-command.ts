import type { CommandExecutor } from "@beads/sdk"
import { execFile } from "node:child_process"

/** Maximum captured output for one Beads command. */
const MAX_BUFFER_BYTES = 64 * 1024 * 1024

/** Execute a command directly without invoking a shell. */
export const executeCommand: CommandExecutor = (file, args, options) =>
  new Promise((resolve, reject) => {
    execFile(
      file,
      [...args],
      { ...options, maxBuffer: MAX_BUFFER_BYTES },
      (error, stdout, stderr) => {
        if (error) {
          Object.assign(error, { stderr, stdout })
          reject(error)
          return
        }
        resolve({ stderr, stdout })
      },
    )
  })
