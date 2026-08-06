import type { Comment } from "@beads/sdk"

/** Render comments attached to the selected bead. */
export function IssueComments({ comments }: IssueCommentsProps) {
  return (
    <section>
      <h2
        aria-label={`Comments ${comments.length}`}
        className="text-muted-foreground m-0 flex items-center gap-2 text-xs font-medium"
      >
        Comments
        <span className="bg-muted rounded px-1.5 py-0.5">{comments.length}</span>
      </h2>
      {comments.length > 0 ? (
        <div className="mt-1.5 flex flex-col gap-2">
          {comments.map((comment) => (
            <article className="bg-muted rounded-md px-2.5 py-2" key={comment.id}>
              <header className="text-muted-foreground flex items-baseline gap-2 text-xs">
                <strong className="text-foreground font-medium">{comment.author}</strong>
                <time dateTime={comment.createdAt}>{comment.createdAt.slice(0, 10)}</time>
              </header>
              <p className="m-0 mt-1 text-xs break-words whitespace-pre-wrap">{comment.text}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground mt-1.5 mb-0 text-xs italic">No comments</p>
      )}
    </section>
  )
}

/** Props for the selected bead's comments. */
export type IssueCommentsProps = {
  /** Comments to display in chronological order. */
  readonly comments: readonly Comment[]
}
