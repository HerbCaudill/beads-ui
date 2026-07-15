import {
  addComment,
  addDependency,
  addLabel,
  createIssue,
  deleteIssue,
  getIssue,
  getStatus,
  listIssues,
  listComments,
  removeDependency,
  removeLabel,
  updateIssue,
  type UpdateIssueInput,
} from "@beads/sdk"
import express, { type Express } from "express"
import { basename, join, resolve } from "node:path"

import { apiErrorHandler } from "./api-error-handler.js"
import { parseCreateIssueBody } from "./parse-create-issue-body.js"
import type { AddDependencyBody, CommentBody, LabelBody, ServerOptions } from "./types.js"

/** Create the HTTP application for one fixed Beads workspace. */
export function createApp(
  /** Server dependencies and immutable workspace path. */
  options: ServerOptions,
): Express {
  const cwd = resolve(options.cwd)
  const sdk = { cwd, runner: options.runner }
  const app = express()

  app.use(express.json())
  app.get("/api/workspace", (_request, response) => {
    response.json({ name: basename(cwd), path: cwd })
  })
  app.get("/api/issues", async (_request, response) => {
    response.json(await listIssues(sdk))
  })
  app.post("/api/issues", async (request, response) => {
    response.status(201).json(await createIssue(sdk, parseCreateIssueBody(request.body)))
  })
  app.get("/api/issues/:issueId", async (request, response) => {
    const issue = await getIssue(sdk, request.params.issueId)
    if (!issue) {
      response.status(404).json({ error: { code: "not_found", message: "Issue not found" } })
      return
    }
    response.json(issue)
  })
  app.patch("/api/issues/:issueId", async (request, response) => {
    response.json(await updateIssue(sdk, request.params.issueId, request.body as UpdateIssueInput))
  })
  app.delete("/api/issues/:issueId", async (request, response) => {
    await deleteIssue(sdk, request.params.issueId)
    response.status(204).send()
  })
  app.post("/api/issues/:issueId/dependencies", async (request, response) => {
    const body = request.body as AddDependencyBody
    await addDependency(sdk, request.params.issueId, body.dependsOnId, body.type)
    response.status(204).send()
  })
  app.delete("/api/issues/:issueId/dependencies/:dependsOnId", async (request, response) => {
    await removeDependency(sdk, request.params.issueId, request.params.dependsOnId)
    response.status(204).send()
  })
  app.post("/api/issues/:issueId/labels", async (request, response) => {
    const body = request.body as LabelBody
    await addLabel(sdk, request.params.issueId, body.label)
    response.status(204).send()
  })
  app.delete("/api/issues/:issueId/labels/:label", async (request, response) => {
    await removeLabel(sdk, request.params.issueId, request.params.label)
    response.status(204).send()
  })
  app.get("/api/issues/:issueId/comments", async (request, response) => {
    response.json(await listComments(sdk, request.params.issueId))
  })
  app.post("/api/issues/:issueId/comments", async (request, response) => {
    const body = request.body as CommentBody
    response.status(201).json(await addComment(sdk, request.params.issueId, body.text, body.author))
  })
  app.get("/api/status", async (_request, response) => {
    response.json(await getStatus(sdk))
  })
  if (options.staticDir) {
    const staticDir = resolve(options.staticDir)
    app.use(express.static(staticDir))
    app.use((request, response, next) => {
      if (request.method !== "GET" || request.path === "/api" || request.path.startsWith("/api/")) {
        next()
        return
      }
      response.sendFile(join(staticDir, "index.html"), (error) => {
        if (error) next(error)
      })
    })
  }
  app.use(apiErrorHandler)

  return app
}
