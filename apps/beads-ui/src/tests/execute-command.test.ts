import { describe, expect, it } from "vitest"

import { executeCommand } from "../execute-command.js"

describe("executeCommand", () => {
  it("captures command output larger than Node's default buffer", async () => {
    const outputLength = 1_100_000

    const result = await executeCommand(
      process.execPath,
      ["-e", `process.stdout.write("x".repeat(${outputLength}))`],
      {
        cwd: process.cwd(),
        encoding: "utf8",
      },
    )

    expect(result.stdout).toHaveLength(outputLength)
  })
})
