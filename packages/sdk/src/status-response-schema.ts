import { Schema } from "effect"

/** Decode the `bd status` response into normalized issue counts. */
export const StatusResponseSchema = Schema.Struct({
  summary: Schema.Struct({
    blocked: Schema.propertySignature(Schema.Number).pipe(Schema.fromKey("blocked_issues")),
    closed: Schema.propertySignature(Schema.Number).pipe(Schema.fromKey("closed_issues")),
    deferred: Schema.propertySignature(Schema.Number).pipe(Schema.fromKey("deferred_issues")),
    inProgress: Schema.propertySignature(Schema.Number).pipe(Schema.fromKey("in_progress_issues")),
    open: Schema.propertySignature(Schema.Number).pipe(Schema.fromKey("open_issues")),
    ready: Schema.propertySignature(Schema.Number).pipe(Schema.fromKey("ready_issues")),
    total: Schema.propertySignature(Schema.Number).pipe(Schema.fromKey("total_issues")),
  }),
})
