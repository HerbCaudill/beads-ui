import { z } from "zod"

/** Runtime schema for one issue received from an MCP tool result. */
export const IssueSchema = z.object({
  assignee: z.string().optional(),
  closedAt: z.string().optional(),
  commentCount: z.number(),
  createdAt: z.string(),
  dependencyCount: z.number(),
  dependentCount: z.number(),
  description: z.string().optional(),
  id: z.string(),
  labels: z.array(z.string()),
  owner: z.string().optional(),
  parent: z.string().optional(),
  priority: z.number(),
  startedAt: z.string().optional(),
  status: z.enum(["open", "in_progress", "blocked", "deferred", "closed"]),
  title: z.string(),
  type: z.enum([
    "bug",
    "feature",
    "task",
    "epic",
    "chore",
    "decision",
    "merge-request",
    "molecule",
    "gate",
    "convoy",
  ]),
  updatedAt: z.string(),
})

/** Runtime schema for structured content returned by the issue-list tool. */
export const IssueListResultSchema = z.object({
  includeClosed: z.boolean(),
  issues: z.array(IssueSchema),
  workspace: z.string(),
})
