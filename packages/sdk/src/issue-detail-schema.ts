import { Schema } from "effect"

import { CommentSchema } from "./comment-schema.js"
import { IssueSchema } from "./issue-schema.js"
import { RelatedIssueSchema } from "./related-issue-schema.js"

/** Decode an issue detail response with relationships and comments. */
export const IssueDetailSchema = Schema.Struct({
  ...IssueSchema.fields,
  comments: Schema.optional(Schema.Array(CommentSchema)).pipe(Schema.withDecodingDefault(() => [])),
  dependencies: Schema.optional(Schema.Array(RelatedIssueSchema)).pipe(
    Schema.withDecodingDefault(() => []),
  ),
  dependents: Schema.optional(Schema.Array(RelatedIssueSchema)).pipe(
    Schema.withDecodingDefault(() => []),
  ),
})
