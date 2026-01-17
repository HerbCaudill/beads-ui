import type { WebSocket } from "ws"
import type { Mock } from "vitest"
import { describe, expect, test, vi } from "vitest"
import { runBd, runBdJson } from "./bd.js"
import { handleMessage } from "./ws.js"

vi.mock("./bd.ts", () => ({
  runBd: vi.fn(),
  runBdJson: vi.fn(),
}))

interface StubSocket {
  sent: string[]
  readyState: number
  OPEN: number
  send: (msg: string) => void
}

function makeStubSocket(): StubSocket {
  return {
    sent: [],
    readyState: 1,
    OPEN: 1,
    send(msg: string) {
      this.sent.push(String(msg))
    },
  }
}

describe("ws labels handlers", () => {
  test("label-add validates payload", async () => {
    const ws = makeStubSocket()
    await handleMessage(
      ws as unknown as WebSocket,
      Buffer.from(
        JSON.stringify({
          id: "x",
          type: "label-add" as const,
          payload: {},
        }),
      ),
    )
    const obj = JSON.parse(ws.sent[0]!)
    expect(obj.ok).toBe(false)
    expect(obj.error.code).toBe("bad_request")
  })

  test("label-add runs bd and replies with show", async () => {
    const rb = runBd as Mock
    const rj = runBdJson as Mock
    rb.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" })
    rj.mockResolvedValueOnce({
      code: 0,
      stdoutJson: { id: "UI-1", labels: ["frontend"] },
    })

    const ws = makeStubSocket()
    await handleMessage(
      ws as unknown as WebSocket,
      Buffer.from(
        JSON.stringify({
          id: "a",
          type: "label-add" as const,
          payload: { id: "UI-1", label: "frontend" },
        }),
      ),
    )

    const call = rb.mock.calls[0]![0]
    expect(call.slice(0, 3)).toEqual(["label", "add", "UI-1"])
    const obj = JSON.parse(ws.sent[ws.sent.length - 1]!)
    expect(obj.ok).toBe(true)
    expect(obj.payload && obj.payload.id).toBe("UI-1")
  })

  test("label-remove runs bd and replies with show", async () => {
    const rb = runBd as Mock
    const rj = runBdJson as Mock
    rb.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" })
    rj.mockResolvedValueOnce({
      code: 0,
      stdoutJson: { id: "UI-1", labels: [] },
    })

    const ws = makeStubSocket()
    await handleMessage(
      ws as unknown as WebSocket,
      Buffer.from(
        JSON.stringify({
          id: "b",
          type: "label-remove" as const,
          payload: { id: "UI-1", label: "frontend" },
        }),
      ),
    )

    const call = rb.mock.calls[rb.mock.calls.length - 1]![0]
    expect(call.slice(0, 3)).toEqual(["label", "remove", "UI-1"])
    const obj = JSON.parse(ws.sent[ws.sent.length - 1]!)
    expect(obj.ok).toBe(true)
    expect(obj.payload && obj.payload.id).toBe("UI-1")
  })
})
