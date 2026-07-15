import { IconMessageCircle, IconSend } from "@tabler/icons-react"
import { type FormEvent, useState } from "react"

import type { Comment } from "./types.js"

/** Display task comments and add new ones. */
export function CommentEditor({ comments, onAdd }: Props) {
  const [text, setText] = useState("")

  /** Add the normalized comment body. */
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = text.trim()
    if (!value) return
    onAdd(value)
    setText("")
  }

  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
        <IconMessageCircle size={17} /> Comments
      </h3>
      {comments.length ? (
        <ul className="mb-3 space-y-3">
          {comments.map((comment) => (
            <li className="rounded-lg bg-slate-950 p-3" key={comment.id}>
              <p className="text-xs font-semibold text-slate-400">{comment.author}</p>
              <p className="mt-1 text-sm text-slate-200">{comment.text}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-sm text-slate-500">No comments</p>
      )}
      <form className="flex items-end gap-2" onSubmit={submit}>
        <label className="min-w-0 flex-1">
          <span className="sr-only">New comment</span>
          <textarea
            className="min-h-20 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-500"
            onChange={(event) => setText(event.target.value)}
            placeholder="Add context…"
            value={text}
          />
        </label>
        <button
          aria-label="Add comment"
          className="mb-1 rounded-lg bg-cyan-400 p-2 text-slate-950 hover:bg-cyan-300"
          type="submit"
        >
          <IconSend size={17} />
        </button>
      </form>
    </section>
  )
}

/** Properties for comment management. */
type Props = {
  /** Existing comments. */
  readonly comments: readonly Comment[]
  /** Add a new comment body. */
  readonly onAdd: (text: string) => void
}
