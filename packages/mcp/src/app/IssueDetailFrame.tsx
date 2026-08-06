import { IconChevronLeft } from "@tabler/icons-react"
import type { ReactNode } from "react"

/** Wrap a drilled-into issue with the control for returning to the list. */
export function IssueDetailFrame({ children, onBack }: IssueDetailFrameProps) {
  return (
    <div className="min-w-70">
      <div className="border-border border-b px-2 py-1.5">
        <button
          className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1 text-xs transition-colors"
          onClick={onBack}
          type="button"
        >
          <IconChevronLeft aria-hidden="true" className="size-3.5" />
          All issues
        </button>
      </div>
      {children}
    </div>
  )
}

/** Props for the drill-down wrapper. */
export type IssueDetailFrameProps = {
  /** Detail content, or a loading or error message. */
  readonly children: ReactNode
  /** Return to the issue list. */
  readonly onBack: () => void
}
