import type { WebSocket } from "ws"
import type { Mock } from "vitest"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { runBd } from "./bd.js"
import { handleMessage } from "./ws.js"

vi.mock("./bd.ts", () => ({
  runBd: vi.fn(),
  runBdJson: vi.fn(),
  getGitUserName: vi.fn(),
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

describe("delete-issue handler", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test("sends delete-issue and receives success", async () => {
    const rb = runBd as Mock
    rb.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" })

    const ws = makeStubSocket()
    await handleMessage(
      ws as unknown as WebSocket,
      Buffer.from(
        JSON.stringify({
          id: "req-1",
          type: "delete-issue" as const,
          payload: { id: "beads-abc123" },
        }),
      ),
    )

    // Check bd delete was called with --force
    expect(rb).toHaveBeenCalledWith(["delete", "beads-abc123", "--force"])

    // Check response
    expect(ws.sent.length).toBe(1)
    const reply = JSON.parse(ws.sent[0]!)
    expect(reply.ok).toBe(true)
    expect(reply.payload.deleted).toBe(true)
    expect(reply.payload.id).toBe("beads-abc123")
  })

  test("returns error when bd delete fails", async () => {
    const rb = runBd as Mock
    rb.mockResolvedValueOnce({
      code: 1,
      stdout: "",
      stderr: "Issue not found",
    })

    const ws = makeStubSocket()
    await handleMessage(
      ws as unknown as WebSocket,
      Buffer.from(
        JSON.stringify({
          id: "req-2",
          type: "delete-issue" as const,
          payload: { id: "beads-notfound" },
        }),
      ),
    )

    expect(ws.sent.length).toBe(1)
    const reply = JSON.parse(ws.sent[0]!)
    expect(reply.ok).toBe(false)
    expect(reply.error.code).toBe("bd_error")
    expect(reply.error.message).toBe("Issue not found")
  })

  test("returns error when id is missing", async () => {
    const ws = makeStubSocket()
    await handleMessage(
      ws as unknown as WebSocket,
      Buffer.from(
        JSON.stringify({
          id: "req-3",
          type: "delete-issue" as const,
          payload: {},
        }),
      ),
    )

    expect(ws.sent.length).toBe(1)
    const reply = JSON.parse(ws.sent[0]!)
    expect(reply.ok).toBe(false)
    expect(reply.error.code).toBe("bad_request")
  })

  test("returns error when id is empty string", async () => {
    const ws = makeStubSocket()
    await handleMessage(
      ws as unknown as WebSocket,
      Buffer.from(
        JSON.stringify({
          id: "req-4",
          type: "delete-issue" as const,
          payload: { id: "" },
        }),
      ),
    )

    expect(ws.sent.length).toBe(1)
    const reply = JSON.parse(ws.sent[0]!)
    expect(reply.ok).toBe(false)
    expect(reply.error.code).toBe("bad_request")
  })
})
