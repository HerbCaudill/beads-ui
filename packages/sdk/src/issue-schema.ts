import { Schema } from "effect"

/** Schema for supported Beads issue statuses. */
const IssueStatusSchema = Schema.Literal("open", "in_progress", "blocked", "deferred", "closed")

/** Schema for supported Beads issue types. */
const IssueTypeSchema = Schema.Literal(
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
)

/** Decode the `bd` wire representation into the SDK issue shape. */
export const IssueSchema = Schema.Struct({
  assignee: Schema.optional(Schema.String),
  commentCount: Schema.optional(Schema.Number)
    .pipe(Schema.fromKey("comment_count"))
    .pipe(Schema.withDecodingDefault(() => 0)),
  closedAt: Schema.optional(Schema.String).pipe(Schema.fromKey("closed_at")),
  createdAt: Schema.propertySignature(Schema.String).pipe(Schema.fromKey("created_at")),
  dependencyCount: Schema.optional(Schema.Number)
    .pipe(Schema.fromKey("dependency_count"))
    .pipe(Schema.withDecodingDefault(() => 0)),
  dependentCount: Schema.optional(Schema.Number)
    .pipe(Schema.fromKey("dependent_count"))
    .pipe(Schema.withDecodingDefault(() => 0)),
  description: Schema.optional(Schema.String),
  id: Schema.String,
  labels: Schema.optional(Schema.Array(Schema.String)).pipe(Schema.withDecodingDefault(() => [])),
  owner: Schema.optional(Schema.String),
  parent: Schema.optional(Schema.String),
  priority: Schema.Number,
  startedAt: Schema.optional(Schema.String).pipe(Schema.fromKey("started_at")),
  status: IssueStatusSchema,
  title: Schema.String,
  type: Schema.propertySignature(IssueTypeSchema).pipe(Schema.fromKey("issue_type")),
  updatedAt: Schema.propertySignature(Schema.String).pipe(Schema.fromKey("updated_at")),
})
