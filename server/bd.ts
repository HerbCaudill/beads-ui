import { spawn } from "node:child_process"
import { resolveDbPath } from "./db.js"
import { debug } from "./logging.js"

const log = debug("bd")

/**
 * Options for getGitUserName.
 */
export interface GetGitUserNameOptions {
  /** Working directory. Defaults to process.cwd(). */
  cwd?: string
}

/**
 * Get the git user name from git config.
 */
export async function getGitUserName(options: GetGitUserNameOptions = {}): Promise<string> {
  return new Promise(resolve => {
    const child = spawn("git", ["config", "user.name"], {
      cwd: options.cwd || process.cwd(),
      shell: false,
      windowsHide: true,
    })

    const chunks: string[] = []

    if (child.stdout) {
      child.stdout.setEncoding("utf8")
      child.stdout.on("data", chunk => chunks.push(String(chunk)))
    }

    child.on("error", () => resolve(""))
    child.on("close", code => {
      if (code !== 0) {
        resolve("")
        return
      }
      resolve(chunks.join("").trim())
    })
  })
}

/**
 * Resolve the bd executable path.
 */
export function getBdBin(): string {
  const env_value = process.env.BD_BIN
  if (env_value && env_value.length > 0) {
    return env_value
  }
  return "bd"
}

/**
 * Options for runBd and runBdJson.
 */
export interface RunBdOptions {
  /** Working directory. Defaults to process.cwd(). */
  cwd?: string
  /** Environment variables. Defaults to process.env. */
  env?: Record<string, string | undefined>
  /** Timeout in milliseconds. */
  timeout_ms?: number
}

/**
 * Result from running bd command.
 */
export interface RunBdResult {
  /** Exit code from the command. */
  code: number
  /** Standard output from the command. */
  stdout: string
  /** Standard error from the command. */
  stderr: string
}

/**
 * Run the `bd` CLI with provided arguments.
 * Shell is not used to avoid injection; args must be pre-split.
 */
export function runBd(args: string[], options: RunBdOptions = {}): Promise<RunBdResult> {
  const bin = getBdBin()

  // Ensure a consistent DB by setting BEADS_DB environment variable
  const db_path = resolveDbPath({
    cwd: options.cwd || process.cwd(),
    env: options.env || process.env,
  })
  const env_with_db = {
    ...(options.env || process.env),
    BEADS_DB: db_path.path,
  }

  const spawn_opts = {
    cwd: options.cwd || process.cwd(),
    env: env_with_db,
    shell: false as const,
    windowsHide: true,
  }

  const final_args = args.slice()

  return new Promise(resolve => {
    const child = spawn(bin, final_args, spawn_opts)

    const out_chunks: string[] = []
    const err_chunks: string[] = []

    if (child.stdout) {
      child.stdout.setEncoding("utf8")
      child.stdout.on("data", chunk => {
        out_chunks.push(String(chunk))
      })
    }
    if (child.stderr) {
      child.stderr.setEncoding("utf8")
      child.stderr.on("data", chunk => {
        err_chunks.push(String(chunk))
      })
    }

    let timer: ReturnType<typeof setTimeout> | undefined
    if (options.timeout_ms && options.timeout_ms > 0) {
      timer = setTimeout(() => {
        child.kill("SIGKILL")
      }, options.timeout_ms)
      timer.unref?.()
    }

    const finish = (code: number | string | null) => {
      if (timer) {
        clearTimeout(timer)
      }
      resolve({
        code: Number(code || 0),
        stdout: out_chunks.join(""),
        stderr: err_chunks.join(""),
      })
    }

    child.on("error", err => {
      // Treat spawn error as an immediate non-zero exit; log for diagnostics.
      log("spawn error running %s %o", bin, err)
      finish(127)
    })
    child.on("close", code => {
      finish(code)
    })
  })
}

/**
 * Result from running bd command with JSON parsing.
 */
export interface RunBdJsonResult {
  /** Exit code from the command. */
  code: number
  /** Parsed JSON from stdout (if successful). */
  stdoutJson?: unknown
  /** Error message (if failed). */
  stderr?: string
}

/**
 * Run `bd` and parse JSON from stdout if exit code is 0.
 */
export async function runBdJson(
  args: string[],
  options: RunBdOptions = {},
): Promise<RunBdJsonResult> {
  const result = await runBd(args, options)
  if (result.code !== 0) {
    log("bd exited with code %d (args=%o) stderr=%s", result.code, args, result.stderr)
    return { code: result.code, stderr: result.stderr }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(result.stdout || "null")
  } catch (err) {
    log("bd returned invalid JSON (args=%o): %o", args, err)
    return { code: 0, stderr: "Invalid JSON from bd" }
  }
  return { code: 0, stdoutJson: parsed }
}
