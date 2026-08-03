import {
  addComment,
  addDependency,
  addLabel,
  createIssue,
  deleteIssue,
  getIssue,
  getIssuePrefix,
  listComments,
  listIssues,
  removeDependency,
  removeLabel,
  updateIssue,
  type SdkOptions,
} from "@beads/sdk"
import { Router } from "express"

import { beadsViewApiErrorHandler } from "./beads-view-api-error-handler.js"
import { parseBeadsViewBlockerBody } from "./parse-beads-view-blocker-body.js"
import { parseBeadsViewCommentBody } from "./parse-beads-view-comment-body.js"
import { parseBeadsViewUpdateBody } from "./parse-beads-view-update-body.js"
import { parseCreateIssueBody } from "./parse-create-issue-body.js"
import { parseLabelBody } from "./parse-label-body.js"
import { toBeadsViewComment } from "./to-beads-view-comment.js"
import { toBeadsViewTask } from "./to-beads-view-task.js"

/** Create compatibility routes for the extracted Beads View client. */
export function createBeadsViewRouter(
  /** SDK dependencies bound to the server's fixed workspace. */
  sdk: SdkOptions,
): Router {
  const router = Router()
  let issuePrefixPromise: Promise<string> | undefined

  const loadIssuePrefix = () => {
    issuePrefixPromise ??= getIssuePrefix(sdk).catch((cause: unknown) => {
      issuePrefixPromise = undefined
      throw cause
    })
    return issuePrefixPromise
  }

  router.get("/", async (_request, response) => {
    const [issues, issuePrefix] = await Promise.all([listIssues(sdk), loadIssuePrefix()])
    response.json({
      ok: true,
      issue_prefix: issuePrefix,
      issues: issues.map(toBeadsViewTask),
    })
  })
  router.post("/", async (request, response) => {
    const issue = await createIssue(sdk, parseCreateIssueBody(request.body))
    response.status(201).json({ ok: true, issue: toBeadsViewTask(issue) })
  })
  router.get("/blocked", async (request, response) => {
    const parent = typeof request.query.parent === "string" ? request.query.parent : undefined
    const issues = await listIssues(sdk)
    const blockedIssues = issues.filter(
      (issue) => issue.status === "blocked" && (parent === undefined || issue.parent === parent),
    )
    response.json({ ok: true, issues: blockedIssues.map(toBeadsViewTask) })
  })
  router.get("/:issueId/labels", async (request, response) => {
    const issue = await getIssue(sdk, request.params.issueId)
    if (!issue) {
      response.status(404).json({ ok: false, error: "Task not found" })
      return
    }
    response.json({ ok: true, labels: issue.labels })
  })
  router.post("/:issueId/labels", async (request, response) => {
    const body = parseLabelBody(request.body)
    await addLabel(sdk, request.params.issueId, body.label)
    response.json({ ok: true })
  })
  router.delete("/:issueId/labels/:label", async (request, response) => {
    await removeLabel(sdk, request.params.issueId, request.params.label)
    response.json({ ok: true })
  })
  router.get("/:issueId/comments", async (request, response) => {
    const comments = await listComments(sdk, request.params.issueId)
    response.json({ ok: true, comments: comments.map(toBeadsViewComment) })
  })
  router.post("/:issueId/comments", async (request, response) => {
    const body = parseBeadsViewCommentBody(request.body)
    await addComment(sdk, request.params.issueId, body.comment, body.author)
    response.status(201).json({ ok: true })
  })
  router.post("/:issueId/blockers", async (request, response) => {
    const body = parseBeadsViewBlockerBody(request.body)
    await addDependency(sdk, request.params.issueId, body.blockerId, "blocks")
    response.status(201).json({ ok: true })
  })
  router.delete("/:issueId/blockers/:blockerId", async (request, response) => {
    await removeDependency(sdk, request.params.issueId, request.params.blockerId)
    response.json({ ok: true })
  })
  router.get("/:issueId", async (request, response) => {
    const issue = await getIssue(sdk, request.params.issueId)
    if (!issue) {
      response.status(404).json({ ok: false, error: "Task not found" })
      return
    }
    response.json({ ok: true, issue: toBeadsViewTask(issue) })
  })
  router.patch("/:issueId", async (request, response) => {
    const issue = await updateIssue(
      sdk,
      request.params.issueId,
      parseBeadsViewUpdateBody(request.body),
    )
    response.json({ ok: true, issue: toBeadsViewTask(issue) })
  })
  router.delete("/:issueId", async (request, response) => {
    await deleteIssue(sdk, request.params.issueId)
    response.json({ ok: true })
  })
  router.use(beadsViewApiErrorHandler)

  return router
}
