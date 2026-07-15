import { describe, expect, it, vi } from "vitest"

import { selectPort } from "../select-port.js"

describe("selectPort", () => {
  it("selects any available loopback port by default", async () => {
    const findPort = vi.fn(async () => 43127)

    await expect(selectPort(undefined, findPort)).resolves.toBe(43127)
    expect(findPort).toHaveBeenCalledWith(undefined)
  })

  it("rejects an unavailable explicitly requested port", async () => {
    const findPort = vi.fn(async () => 4401)

    await expect(selectPort(4400, findPort)).rejects.toThrow(
      "Requested port 4400 is unavailable on 127.0.0.1",
    )
  })
})
