import { Schema } from "effect"

/** Decode the `bd` wire representation into the SDK comment shape. */
export const CommentSchema = Schema.Struct({
  author: Schema.String,
  createdAt: Schema.propertySignature(Schema.String).pipe(Schema.fromKey("created_at")),
  id: Schema.String,
  issueId: Schema.propertySignature(Schema.String).pipe(Schema.fromKey("issue_id")),
  text: Schema.String,
})
