import type { CommandExecutor } from "@beads/sdk"
import { execFile } from "node:child_process"

/** Execute a command directly without invoking a shell. */
export const executeCommand: CommandExecutor = (file, args, options) =>
  new Promise((resolve, reject) => {
    execFile(file, [...args], options, (error, stdout, stderr) => {
      if (error) {
        Object.assign(error, { stderr, stdout })
        reject(error)
        return
      }
      resolve({ stderr, stdout })
    })
  })
