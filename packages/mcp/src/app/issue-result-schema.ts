import { z } from "zod"

import { IssueSchema } from "./issue-list-result-schema.js"

/** Runtime schema for one comment received from an MCP tool result. */
const CommentSchema = z.object({
  author: z.string(),
  createdAt: z.string(),
  id: z.string(),
  issueId: z.string(),
  text: z.string(),
})

/** Runtime schema for one relationship received from an MCP tool result. */
const RelatedIssueSchema = IssueSchema.pick({
  id: true,
  priority: true,
  status: true,
  title: true,
  type: true,
}).extend({
  dependencyType: z.enum([
    "blocks",
    "tracks",
    "related",
    "parent-child",
    "discovered-from",
    "until",
    "caused-by",
    "validates",
    "relates-to",
    "supersedes",
  ]),
})

/** Runtime schema for structured content returned by the single-issue tool. */
export const IssueResultSchema = z.object({
  issue: IssueSchema.extend({
    comments: z.array(CommentSchema).optional(),
    dependencies: z.array(RelatedIssueSchema).optional(),
    dependents: z.array(RelatedIssueSchema).optional(),
  }),
  workspace: z.string(),
})
