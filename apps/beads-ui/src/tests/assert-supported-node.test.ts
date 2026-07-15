import { describe, expect, it } from "vitest"

import { assertSupportedNode } from "../assert-supported-node.js"

describe("assertSupportedNode", () => {
  it("rejects Node versions older than 22 with an actionable message", () => {
    expect(() => assertSupportedNode("20.19.0")).toThrow(
      "Node.js 22 or newer is required; current version is 20.19.0",
    )
  })

  it("accepts supported Node versions", () => {
    expect(() => assertSupportedNode("22.0.0")).not.toThrow()
  })
})
