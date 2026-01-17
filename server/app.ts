import express, { type Express, type Request, type Response } from "express"
import fs from "node:fs"
import path from "node:path"
import { registerWorkspace } from "./registry-watcher.js"
import type { ServerConfig } from "./config.js"

interface RegisterWorkspaceBody {
  path?: unknown
  database?: unknown
}

/**
 * Create and configure the Express application.
 */
export function createApp(config: ServerConfig): Express {
  const app = express()

  // Basic hardening and config
  app.disable("x-powered-by")

  // Health endpoint
  app.get("/healthz", (_req: Request, res: Response) => {
    res.type("application/json")
    res.status(200).send({ ok: true })
  })

  // Enable JSON body parsing for API endpoints
  app.use(express.json())

  // Register workspace endpoint - allows CLI to register workspaces dynamically
  // when the server is already running
  app.post("/api/register-workspace", (req: Request, res: Response) => {
    const { path: workspace_path, database } = (req.body || {}) as RegisterWorkspaceBody
    if (!workspace_path || typeof workspace_path !== "string") {
      res.status(400).json({ ok: false, error: "Missing or invalid path" })
      return
    }
    if (!database || typeof database !== "string") {
      res.status(400).json({ ok: false, error: "Missing or invalid database" })
      return
    }
    registerWorkspace({ path: workspace_path, database })
    res.status(200).json({ ok: true, registered: workspace_path })
  })

  if (
    !fs.statSync(path.resolve(config.app_dir, "main.bundle.js"), {
      throwIfNoEntry: false,
    })
  ) {
    /**
     * On-demand bundle for the browser using esbuild.
     */
    app.get("/main.bundle.js", async (_req: Request, res: Response) => {
      try {
        const esbuild = await import("esbuild")
        const entry = path.join(config.app_dir, "main.js")
        const result = await esbuild.build({
          entryPoints: [entry],
          bundle: true,
          format: "esm",
          platform: "browser",
          target: "es2020",
          sourcemap: "inline",
          minify: false,
          write: false,
        })
        const out = result.outputFiles && result.outputFiles[0]
        if (!out) {
          res.status(500).type("text/plain").send("Bundle failed: no output")
          return
        }
        res.setHeader("Content-Type", "application/javascript; charset=utf-8")
        res.setHeader("Cache-Control", "no-store")
        res.send(out.text)
      } catch (err) {
        res
          .status(500)
          .type("text/plain")
          .send("Bundle error: " + (err && (err as Error).message))
      }
    })
  }

  // Static assets from /app
  app.use(express.static(config.app_dir))

  // Root serves index.html explicitly (even if static would catch it)
  app.get("/", (_req: Request, res: Response) => {
    const index_path = path.join(config.app_dir, "index.html")
    res.sendFile(index_path)
  })

  return app
}
