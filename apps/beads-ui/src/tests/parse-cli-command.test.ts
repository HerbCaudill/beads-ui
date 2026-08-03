import { describe, expect, it } from "vitest"

import { parseCliCommand } from "../parse-cli-command.js"

describe("parseCliCommand", () => {
  it("starts the web manager by default", () => {
    expect(parseCliCommand(["--no-open"])).toEqual({
      kind: "web",
      options: { openBrowser: false },
    })
  })

  it("selects the MCP stdio server", () => {
    expect(parseCliCommand(["mcp"])).toEqual({ kind: "mcp" })
  })

  it("rejects arguments after the MCP command", () => {
    expect(() => parseCliCommand(["mcp", "--port", "4400"])).toThrow(
      "The mcp command does not accept options",
    )
  })
})
