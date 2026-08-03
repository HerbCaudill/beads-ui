import { describe, expect, it, vi } from "vitest"

import { getIssuePrefix } from "../get-issue-prefix.js"
import type { CommandRunner } from "../types.js"

describe("getIssuePrefix", () => {
  it("reads the configured issue prefix", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({
      stdout: JSON.stringify({
        key: "issue_prefix",
        schema_version: 1,
        value: "foo-bar",
      }),
      stderr: "",
    }))

    await expect(getIssuePrefix({ cwd: "/workspace", runner })).resolves.toBe("foo-bar")
    expect(runner).toHaveBeenCalledWith({
      args: ["config", "get", "issue_prefix", "--json"],
      cwd: "/workspace",
    })
  })
})
