import type { Comment } from "@beads/sdk"

import type { BeadsViewComment } from "./types.js"

/** Convert an SDK comment to the legacy Beads View comment shape. */
export function toBeadsViewComment(
  /** Normalized comment returned by the standalone SDK. */
  comment: Comment,
): BeadsViewComment {
  const numericId = Number(comment.id)

  return {
    author: comment.author,
    created_at: comment.createdAt,
    id: Number.isNaN(numericId) ? comment.id : numericId,
    issue_id: comment.issueId,
    text: comment.text,
  }
}
