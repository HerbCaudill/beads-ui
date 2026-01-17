import type { ChildProcess } from "node:child_process"
import type { Mock } from "vitest"
import { spawn as spawnMock } from "node:child_process"
import { EventEmitter } from "node:events"
import { PassThrough } from "node:stream"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { getBdBin, getGitUserName, runBd, runBdJson } from "./bd.js"

// Mock child_process.spawn before importing the module under test
vi.mock("node:child_process", () => ({ spawn: vi.fn() }))

function makeFakeProc(stdoutText: string, stderrText: string, code: number): ChildProcess {
  const cp = new EventEmitter() as ChildProcess
  const out = new PassThrough()
  const err = new PassThrough()
  ;(cp as unknown as { stdout: PassThrough }).stdout = out
  ;(cp as unknown as { stderr: PassThrough }).stderr = err
  // Simulate async emission
  queueMicrotask(() => {
    if (stdoutText) {
      out.write(stdoutText)
    }
    out.end()
    if (stderrText) {
      err.write(stderrText)
    }
    err.end()
    cp.emit("close", code)
  })
  return cp
}

const mockedSpawn = spawnMock as Mock

beforeEach(() => {
  mockedSpawn.mockReset()
})

describe("getBdBin", () => {
  test("returns env BD_BIN when set", () => {
    const prev = process.env.BD_BIN
    process.env.BD_BIN = "/custom/bd"
    expect(getBdBin()).toBe("/custom/bd")
    if (prev) {
      process.env.BD_BIN = prev
    } else {
      delete process.env.BD_BIN
    }
  })
})

describe("runBd", () => {
  test("returns stdout/stderr and exit code", async () => {
    mockedSpawn.mockReturnValueOnce(makeFakeProc("ok", "", 0))
    const res = await runBd(["--version"])
    expect(res.code).toBe(0)
    expect(res.stdout).toContain("ok")
  })

  test("non-zero exit propagates code and stderr", async () => {
    mockedSpawn.mockReturnValueOnce(makeFakeProc("", "boom", 1))
    const res = await runBd(["list"])
    expect(res.code).toBe(1)
    expect(res.stderr).toContain("boom")
  })
})

describe("runBdJson", () => {
  test("parses valid JSON output", async () => {
    const json = JSON.stringify([{ id: "UI-1" }])
    mockedSpawn.mockReturnValueOnce(makeFakeProc(json, "", 0))
    const res = await runBdJson(["list", "--json"])
    expect(res.code).toBe(0)
    expect(Array.isArray(res.stdoutJson)).toBe(true)
  })

  test("invalid JSON yields stderr message with code 0", async () => {
    mockedSpawn.mockReturnValueOnce(makeFakeProc("not-json", "", 0))
    const res = await runBdJson(["list", "--json"])
    expect(res.code).toBe(0)
    expect(res.stderr).toContain("Invalid JSON")
  })

  test("non-zero exit returns code and stderr", async () => {
    mockedSpawn.mockReturnValueOnce(makeFakeProc("", "oops", 2))
    const res = await runBdJson(["list", "--json"])
    expect(res.code).toBe(2)
    expect(res.stderr).toContain("oops")
  })
})

describe("getGitUserName", () => {
  test("returns git user name on success", async () => {
    mockedSpawn.mockReturnValueOnce(makeFakeProc("Alice Smith\n", "", 0))
    const name = await getGitUserName()
    expect(name).toBe("Alice Smith")
  })

  test("returns empty string on failure", async () => {
    mockedSpawn.mockReturnValueOnce(makeFakeProc("", "error", 1))
    const name = await getGitUserName()
    expect(name).toBe("")
  })
})
