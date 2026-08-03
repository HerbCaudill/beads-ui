import type { Comment } from "@beads/sdk"

/** Render comments attached to the selected bead. */
export function IssueComments({ comments }: IssueCommentsProps) {
  return (
    <section className="detail-section">
      <h2 aria-label={`Comments ${comments.length}`} className="detail-section__heading">
        Comments
        <span>{comments.length}</span>
      </h2>
      {comments.length > 0 ? (
        <div className="issue-comments">
          {comments.map((comment) => (
            <article className="issue-comment" key={comment.id}>
              <header>
                <strong>{comment.author}</strong>
                <time dateTime={comment.createdAt}>{comment.createdAt.slice(0, 10)}</time>
              </header>
              <p>{comment.text}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="detail-empty">No comments</p>
      )}
    </section>
  )
}

/** Props for the selected bead's comments. */
export type IssueCommentsProps = {
  /** Comments to display in chronological order. */
  readonly comments: readonly Comment[]
}
