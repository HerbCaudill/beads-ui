import { describe, expect, it } from "vitest"

import { parseCliOptions } from "../parse-cli-options.js"

describe("parseCliOptions", () => {
  it("uses an automatic port and opens the browser by default", () => {
    expect(parseCliOptions([])).toEqual({ openBrowser: true })
  })

  it("accepts an explicit port and no-open mode", () => {
    expect(parseCliOptions(["--port", "4400", "--no-open"])).toEqual({
      openBrowser: false,
      port: 4400,
    })
  })

  it("rejects invalid options", () => {
    expect(() => parseCliOptions(["--port", "not-a-port"])).toThrow(
      "Port must be an integer from 1 to 65535",
    )
    expect(() => parseCliOptions(["--workspace", "/tmp/other"])).toThrow(
      "Unknown option: --workspace",
    )
  })
})
