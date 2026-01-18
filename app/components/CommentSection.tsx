/**
 * CommentSection component.
 *
 * Displays the comments section in the issue detail view with:
 * - List of existing comments with author and timestamp
 * - Textarea for adding new comments
 * - Submit button (or Ctrl+Enter) to add comments
 *
 * Comments are displayed chronologically with newest at the bottom.
 */
import { useCallback, useState } from "react"

import type { Comment } from "../../types/issues.js"
import { useDetailContext } from "./DetailView.js"

/**
 * Format a date string for display.
 *
 * @param dateStr - ISO date string to format.
 * @returns Formatted date string.
 */
function formatCommentDate(dateStr?: string): string {
  if (!dateStr) return ""
  try {
    const date = new Date(dateStr)
    // Check if the date is valid (Invalid Date has NaN as time)
    if (isNaN(date.getTime())) {
      return dateStr
    }
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return dateStr
  }
}

/**
 * Props for CommentSection component.
 */
export interface CommentSectionProps {
  /** Array of existing comments. */
  comments: Comment[]
  /** Optional test ID for testing. */
  testId?: string
}

/**
 * CommentSection component.
 *
 * Renders the comments section with existing comments and an input to add new ones.
 */
export function CommentSection({ comments, testId }: CommentSectionProps): React.JSX.Element {
  const { issue, transport } = useDetailContext()

  // Local state for the comment input
  const [commentText, setCommentText] = useState("")
  const [isPending, setIsPending] = useState(false)

  /**
   * Handle input change for comment text.
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setCommentText(e.target.value)
  }, [])

  /**
   * Submit a new comment.
   */
  const submitComment = useCallback(async (): Promise<void> => {
    if (!issue || isPending) return

    const text = commentText.trim()
    if (!text) return

    setIsPending(true)
    try {
      await transport("add-comment", {
        id: issue.id,
        text,
      })
      setCommentText("")
    } catch (error) {
      console.error("Failed to add comment:", error)
    } finally {
      setIsPending(false)
    }
  }, [issue, isPending, commentText, transport])

  /**
   * Handle keydown on the textarea.
   * Submits the comment when Ctrl+Enter or Cmd+Enter is pressed.
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        void submitComment()
      }
    },
    [submitComment],
  )

  /**
   * Handle Add Comment button click.
   */
  const handleSubmitClick = useCallback((): void => {
    void submitComment()
  }, [submitComment])

  const hasText = commentText.trim().length > 0
  const isButtonDisabled = isPending || !hasText

  return (
    <div className="comments" data-testid={testId}>
      <div className="props-card__title">Comments</div>
      {comments.length === 0 ?
        <div className="muted">No comments yet</div>
      : comments.map(comment => (
          <div key={comment.id} className="comment-item">
            <div className="comment-header">
              <span className="comment-author">{comment.author || "Unknown"}</span>
              <span className="comment-date">{formatCommentDate(comment.created_at)}</span>
            </div>
            <div className="comment-text">{comment.text}</div>
          </div>
        ))
      }
      <div className="comment-input">
        <textarea
          placeholder="Add a comment... (Ctrl+Enter to submit)"
          rows={3}
          value={commentText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={isPending}
        />
        <button onClick={handleSubmitClick} disabled={isButtonDisabled}>
          {isPending ? "Adding..." : "Add Comment"}
        </button>
      </div>
    </div>
  )
}
