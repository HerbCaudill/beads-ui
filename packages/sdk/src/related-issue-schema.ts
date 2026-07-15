import { Schema } from "effect"

/** Schema for Beads dependency relationship types. */
const DependencyTypeSchema = Schema.Literal(
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
)

/** Decode a related issue returned by `bd show`. */
export const RelatedIssueSchema = Schema.Struct({
  dependencyType: Schema.propertySignature(DependencyTypeSchema).pipe(
    Schema.fromKey("dependency_type"),
  ),
  id: Schema.String,
  priority: Schema.Number,
  status: Schema.Literal("open", "in_progress", "blocked", "deferred", "closed"),
  title: Schema.String,
  type: Schema.propertySignature(
    Schema.Literal(
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
    ),
  ).pipe(Schema.fromKey("issue_type")),
})
