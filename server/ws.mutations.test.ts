import type { WebSocket } from "ws"
import type { Mock } from "vitest"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { runBd, runBdJson } from "./bd.js"
import { handleMessage } from "./ws.js"

vi.mock("./bd.ts", () => ({ runBdJson: vi.fn(), runBd: vi.fn() }))

// Ensure clean mock state for each test
beforeEach(() => {
  ;(runBd as Mock).mockReset()
  ;(runBdJson as Mock).mockReset()
})

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

describe("ws mutation handlers", () => {
  test("update-status validates and returns updated issue", async () => {
    const mRun = runBd as Mock
    const mJson = runBdJson as Mock
    mRun.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" })
    mJson.mockResolvedValueOnce({
      code: 0,
      stdoutJson: { id: "UI-7", status: "in_progress" },
    })
    const ws = makeStubSocket()
    const req = {
      id: "r1",
      type: "update-status",
      payload: { id: "UI-7", status: "in_progress" },
    }
    await handleMessage(ws as unknown as WebSocket, Buffer.from(JSON.stringify(req)))
    const obj = JSON.parse(ws.sent[ws.sent.length - 1]!)
    expect(obj.ok).toBe(true)
    expect(obj.payload.status).toBe("in_progress")
  })

  test("update-status invalid payload yields bad_request", async () => {
    const ws = makeStubSocket()
    const req = {
      id: "r2",
      type: "update-status",
      payload: { id: "UI-7", status: "bogus" },
    }
    await handleMessage(ws as unknown as WebSocket, Buffer.from(JSON.stringify(req)))
    const obj = JSON.parse(ws.sent[ws.sent.length - 1]!)
    expect(obj.ok).toBe(false)
    expect(obj.error.code).toBe("bad_request")
  })

  test("update-priority success path", async () => {
    const mRun = runBd as Mock
    const mJson = runBdJson as Mock
    mRun.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" })
    mJson.mockResolvedValueOnce({
      code: 0,
      stdoutJson: { id: "UI-7", priority: 1 },
    })
    const ws = makeStubSocket()
    const req = {
      id: "r3",
      type: "update-priority",
      payload: { id: "UI-7", priority: 1 },
    }
    await handleMessage(ws as unknown as WebSocket, Buffer.from(JSON.stringify(req)))
    const obj = JSON.parse(ws.sent[ws.sent.length - 1]!)
    expect(obj.ok).toBe(true)
    expect(obj.payload.priority).toBe(1)
  })

  test("update-priority invalid payload yields bad_request", async () => {
    const ws = makeStubSocket()
    const req = {
      id: "r3bad",
      type: "update-priority",
      payload: { id: "UI-7", priority: 9 },
    }
    await handleMessage(ws as unknown as WebSocket, Buffer.from(JSON.stringify(req)))
    const obj = JSON.parse(ws.sent[ws.sent.length - 1]!)
    expect(obj.ok).toBe(false)
    expect(obj.error && obj.error.code).toBe("bad_request")
  })

  test("edit-text title success", async () => {
    const mRun = runBd as Mock
    const mJson = runBdJson as Mock
    mRun.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" })
    mJson.mockResolvedValueOnce({
      code: 0,
      stdoutJson: { id: "UI-7", title: "New" },
    })
    const ws = makeStubSocket()
    const req = {
      id: "r4",
      type: "edit-text",
      payload: { id: "UI-7", field: "title", value: "New" },
    }
    await handleMessage(ws as unknown as WebSocket, Buffer.from(JSON.stringify(req)))
    const obj = JSON.parse(ws.sent[ws.sent.length - 1]!)
    expect(obj.ok).toBe(true)
    expect(obj.payload.title).toBe("New")
  })

  // update-type removed; no server handler remains

  test("update-assignee validates and returns updated issue", async () => {
    const mRun = runBd as Mock
    const mJson = runBdJson as Mock
    mRun.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" })
    mJson.mockResolvedValueOnce({ code: 0, stdoutJson: { id: "UI-2" } })
    const ws = makeStubSocket()
    const req = {
      id: "rua",
      type: "update-assignee" as const,
      payload: { id: "UI-2", assignee: "max" },
    }
    await handleMessage(ws as unknown as WebSocket, Buffer.from(JSON.stringify(req)))
    const call = mRun.mock.calls[mRun.mock.calls.length - 1]!
    expect(call[0][0]).toBe("update")
    expect(call[0].includes("--assignee")).toBe(true)
    const obj = JSON.parse(ws.sent[ws.sent.length - 1]!)
    expect(obj.ok).toBe(true)
    expect(obj.payload.id).toBe("UI-2")
  })

  test("update-assignee allows clearing with empty string", async () => {
    const mRun = runBd as Mock
    const mJson = runBdJson as Mock
    mRun.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" })
    mJson.mockResolvedValueOnce({ code: 0, stdoutJson: { id: "UI-31" } })
    const ws = makeStubSocket()
    const req = {
      id: "rua2",
      type: "update-assignee" as const,
      payload: { id: "UI-31", assignee: "" },
    }
    await handleMessage(ws as unknown as WebSocket, Buffer.from(JSON.stringify(req)))
    const call = mRun.mock.calls[mRun.mock.calls.length - 1]!
    expect(call[0]).toEqual(["update", "UI-31", "--assignee", ""])
    const obj = JSON.parse(ws.sent[ws.sent.length - 1]!)
    expect(obj.ok).toBe(true)
    expect(obj.payload.id).toBe("UI-31")
  })

  test("edit-text acceptance success", async () => {
    const mRun = runBd as Mock
    const mJson = runBdJson as Mock
    mRun.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" })
    mJson.mockResolvedValueOnce({
      code: 0,
      stdoutJson: { id: "UI-7", acceptance: "Done when..." },
    })
    const ws = makeStubSocket()
    const req = {
      id: "r4a",
      type: "edit-text",
      payload: { id: "UI-7", field: "acceptance", value: "Done when..." },
    }
    await handleMessage(ws as unknown as WebSocket, Buffer.from(JSON.stringify(req)))
    const obj = JSON.parse(ws.sent[ws.sent.length - 1]!)
    expect(obj.ok).toBe(true)
    expect(obj.payload.acceptance).toBe("Done when...")
    // Verify correct flag mapping for acceptance
    expect(mRun.mock.calls[0]![0]).toEqual([
      "update",
      "UI-7",
      "--acceptance-criteria",
      "Done when...",
    ])
  })

  test("edit-text notes success", async () => {
    const mRun = runBd as Mock
    const mJson = runBdJson as Mock
    mRun.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" })
    mJson.mockResolvedValueOnce({
      code: 0,
      stdoutJson: { id: "UI-12", notes: "Some note" },
    })
    const ws = makeStubSocket()
    const req = {
      id: "r4n",
      type: "edit-text",
      payload: { id: "UI-12", field: "notes", value: "Some note" },
    }
    await handleMessage(ws as unknown as WebSocket, Buffer.from(JSON.stringify(req)))
    const obj = JSON.parse(ws.sent[ws.sent.length - 1]!)
    expect(obj.ok).toBe(true)
    expect(obj.payload.notes).toBe("Some note")
    // Verify correct flag mapping for notes
    expect(mRun.mock.calls[0]![0]).toEqual(["update", "UI-12", "--notes", "Some note"])
  })

  test("edit-text description success and flag mapping", async () => {
    const mRun = runBd as Mock
    const mJson = runBdJson as Mock
    mRun.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" })
    mJson.mockResolvedValueOnce({
      code: 0,
      stdoutJson: { id: "UI-7", description: "New desc" },
    })
    const ws = makeStubSocket()
    const req = {
      id: "r4b",
      type: "edit-text",
      payload: { id: "UI-7", field: "description", value: "New desc" },
    }
    await handleMessage(ws as unknown as WebSocket, Buffer.from(JSON.stringify(req)))
    // Verify bd call flag mapping
    const call = mRun.mock.calls[mRun.mock.calls.length - 1]![0]
    expect(call).toEqual(["update", "UI-7", "--description", "New desc"])
    const obj = JSON.parse(ws.sent[ws.sent.length - 1]!)
    expect(obj.ok).toBe(true)
    expect(obj.payload.description).toBe("New desc")
  })

  test("edit-text design success and flag mapping", async () => {
    const mRun = runBd as Mock
    const mJson = runBdJson as Mock
    mRun.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" })
    mJson.mockResolvedValueOnce({
      code: 0,
      stdoutJson: { id: "UI-8", design: "New design" },
    })
    const ws = makeStubSocket()
    const req = {
      id: "r4d",
      type: "edit-text",
      payload: { id: "UI-8", field: "design", value: "New design" },
    }
    await handleMessage(ws as unknown as WebSocket, Buffer.from(JSON.stringify(req)))
    const call = mRun.mock.calls[mRun.mock.calls.length - 1]![0]
    expect(call).toEqual(["update", "UI-8", "--design", "New design"])
    const obj = JSON.parse(ws.sent[ws.sent.length - 1]!)
    expect(obj.ok).toBe(true)
    expect(obj.payload.design).toBe("New design")
  })

  test("dep-add returns updated issue (view_id)", async () => {
    const mRun = runBd as Mock
    const mJson = runBdJson as Mock
    mRun.mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" })
    mJson.mockResolvedValueOnce({
      code: 0,
      stdoutJson: { id: "UI-7", dependencies: [] },
    })
    const ws = makeStubSocket()
    const req = {
      id: "r5",
      type: "dep-add",
      payload: { a: "UI-7", b: "UI-1", view_id: "UI-7" },
    }
    await handleMessage(ws as unknown as WebSocket, Buffer.from(JSON.stringify(req)))
    const obj = JSON.parse(ws.sent[ws.sent.length - 1]!)
    expect(obj.ok).toBe(true)
    expect(obj.payload.id).toBe("UI-7")
  })

  test("dep-remove bad payload yields bad_request", async () => {
    const ws = makeStubSocket()
    const req = { id: "r6", type: "dep-remove", payload: { a: "" } }
    await handleMessage(ws as unknown as WebSocket, Buffer.from(JSON.stringify(req)))
    const obj = JSON.parse(ws.sent[ws.sent.length - 1]!)
    expect(obj.ok).toBe(false)
    expect(obj.error.code).toBe("bad_request")
  })

  test("create-issue acks on success", async () => {
    const mRun = runBd as Mock
    mRun.mockResolvedValueOnce({ code: 0, stdout: "UI-99", stderr: "" })
    const ws = makeStubSocket()
    const req = {
      id: "r7",
      type: "create-issue",
      payload: {
        title: "New item",
        type: "task",
        priority: 2,
        description: "x",
      },
    }
    await handleMessage(ws as unknown as WebSocket, Buffer.from(JSON.stringify(req)))
    const obj = JSON.parse(ws.sent[ws.sent.length - 1]!)
    expect(obj.ok).toBe(true)
    expect(obj.payload && obj.payload.created).toBe(true)
  })
})
