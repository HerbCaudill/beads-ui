import { runBdJson } from "./bd.js"
import { debug } from "./logging.js"
import type { NormalizedIssue } from "../types/issues.js"

const log = debug("list-adapters")

export interface SubscriptionSpec {
  type: string
  params?: Record<string, string | number | boolean>
}

export interface FetchListResultSuccess {
  ok: true
  items: NormalizedIssue[]
}

export interface FetchListResultFailure {
  ok: false
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

export type FetchListResult = FetchListResultSuccess | FetchListResultFailure

export interface FetchOptions {
  cwd?: string
}

/**
 * Build concrete `bd` CLI args for a subscription type + params.
 * Always includes `--json` for parseable output.
 */
export function mapSubscriptionToBdArgs(spec: SubscriptionSpec): string[] {
  const t = String(spec.type)
  switch (t) {
    case "all-issues": {
      return ["list", "--json"]
    }
    case "epics": {
      return ["epic", "status", "--json"]
    }
    case "blocked-issues": {
      return ["blocked", "--json"]
    }
    case "ready-issues": {
      return ["ready", "--limit", "1000", "--json"]
    }
    case "in-progress-issues": {
      return ["list", "--json", "--status", "in_progress"]
    }
    case "closed-issues": {
      return ["list", "--json", "--status", "closed"]
    }
    case "issue-detail": {
      const p = spec.params || {}
      const id = String(p.id || "").trim()
      if (id.length === 0) {
        throw badRequest("Missing param: params.id")
      }
      return ["show", id, "--json"]
    }
    default: {
      throw badRequest(`Unknown subscription type: ${t}`)
    }
  }
}

interface RawIssueItem {
  id?: unknown
  created_at?: unknown
  updated_at?: unknown
  closed_at?: unknown
  [key: string]: unknown
}

/**
 * Normalize bd list output to minimal Issue shape used by the registry.
 * - Ensures `id` is a string.
 * - Coerces timestamps to numbers.
 * - `closed_at` defaults to null when missing or invalid.
 */
export function normalizeIssueList(value: unknown): NormalizedIssue[] {
  if (!Array.isArray(value)) {
    return []
  }
  const out: NormalizedIssue[] = []
  for (const it of value as RawIssueItem[]) {
    const id = String(it.id ?? "")
    if (id.length === 0) {
      continue
    }
    const created_at = parseTimestamp(it.created_at)
    const updated_at = parseTimestamp(it.updated_at)
    const closed_raw = it.closed_at
    let closed_at: number | null = null
    if (closed_raw !== undefined && closed_raw !== null) {
      const n = parseTimestamp(closed_raw)
      closed_at = Number.isFinite(n) ? n : null
    }
    out.push({
      ...it,
      id,
      created_at: Number.isFinite(created_at) ? created_at : 0,
      updated_at: Number.isFinite(updated_at) ? updated_at : 0,
      closed_at,
    })
  }
  return out
}

interface EpicEntry {
  epic?: {
    id?: unknown
    title?: unknown
    status?: unknown
    issue_type?: unknown
    created_at?: unknown
    updated_at?: unknown
    closed_at?: unknown
  }
  total_children?: unknown
  closed_children?: unknown
  eligible_for_close?: unknown
}

/**
 * Execute the mapped `bd` command for a subscription spec and return normalized items.
 * Errors do not throw; they are surfaced as a structured object.
 */
export async function fetchListForSubscription(
  spec: SubscriptionSpec,
  options: FetchOptions = {},
): Promise<FetchListResult> {
  let args: string[]
  try {
    args = mapSubscriptionToBdArgs(spec)
  } catch (err) {
    // Surface bad requests (e.g., missing params)
    log("mapSubscriptionToBdArgs failed for %o: %o", spec, err)
    const e = toErrorObject(err)
    return { ok: false, error: e }
  }

  try {
    const bd_opts = options.cwd !== undefined ? { cwd: options.cwd } : {}
    const res = await runBdJson(args, bd_opts)
    if (!res || res.code !== 0 || !("stdoutJson" in res)) {
      log("bd failed for %o (args=%o) code=%s stderr=%s", spec, args, res?.code, res?.stderr || "")
      return {
        ok: false,
        error: {
          code: "bd_error",
          message: String(res?.stderr || "bd failed"),
          details: { exit_code: res?.code ?? -1 },
        },
      }
    }
    // bd show may return a single object; normalize to an array first
    let raw: unknown[] =
      Array.isArray(res.stdoutJson) ? res.stdoutJson
      : res.stdoutJson && typeof res.stdoutJson === "object" ? [res.stdoutJson]
      : []

    // Special-case mapping for `epics`: current bd output nests the epic under
    // an `epic` key and exposes counters at the top level. Flatten so that
    // each entry has a top-level `id` and core fields expected by the registry.
    if (String(spec.type) === "epics") {
      raw = raw.map(it => {
        const entry = it as EpicEntry
        if (entry && typeof entry === "object" && "epic" in entry) {
          const e = entry.epic || {}
          const flat: Record<string, unknown> = {
            // Required minimal fields for registry + client rendering
            id: String(e.id ?? ""),
            title: e.title,
            status: e.status,
            issue_type: e.issue_type || "epic",
            created_at: e.created_at,
            updated_at: e.updated_at,
            closed_at: e.closed_at ?? null,
            // Preserve useful counters from bd output
            total_children: entry.total_children,
            closed_children: entry.closed_children,
            eligible_for_close: entry.eligible_for_close,
          }
          return flat
        }
        return it
      })
    }

    const items = normalizeIssueList(raw)
    return { ok: true, items }
  } catch (err) {
    log("bd invocation failed for %o (args=%o): %o", spec, args, err)
    const error_msg =
      err && typeof err === "object" && "message" in err && typeof err.message === "string" ?
        err.message
      : "bd invocation failed"
    return {
      ok: false,
      error: {
        code: "bd_error",
        message: error_msg,
      },
    }
  }
}

interface BadRequestError extends Error {
  code: string
}

/**
 * Create a `bad_request` error object.
 */
function badRequest(message: string): BadRequestError {
  const e = new Error(message) as BadRequestError
  e.code = "bad_request"
  return e
}

/**
 * Normalize arbitrary thrown values to a structured error object.
 */
function toErrorObject(err: unknown): FetchListResultFailure["error"] {
  if (err && typeof err === "object") {
    const any = err as { code?: unknown; message?: unknown }
    const code = typeof any.code === "string" ? any.code : "bad_request"
    const message = typeof any.message === "string" ? any.message : "Request error"
    return { code, message }
  }
  return { code: "bad_request", message: "Request error" }
}

/**
 * Parse a bd timestamp string to epoch ms using Date.parse.
 * Falls back to numeric coercion when parsing fails.
 */
function parseTimestamp(v: unknown): number {
  if (typeof v === "string") {
    const ms = Date.parse(v)
    if (Number.isFinite(ms)) {
      return ms
    }
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  if (typeof v === "number") {
    return Number.isFinite(v) ? v : 0
  }
  return 0
}
