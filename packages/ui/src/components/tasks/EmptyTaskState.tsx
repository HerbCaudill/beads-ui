import { IconChecklist, IconLoader2 } from "@tabler/icons-react"

/** Render the unselected, loading, or detail-error state. */
export function EmptyTaskState({ error, isLoading }: Props) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="text-muted-foreground flex max-w-sm flex-col items-center gap-4">
        {isLoading ? (
          <IconLoader2 className="size-12 animate-spin" stroke={1.5} />
        ) : (
          <IconChecklist className="size-12" stroke={1.5} />
        )}
        <p className="text-center text-sm">
          {error ?? (isLoading ? "Loading task…" : "Select a task to view its details.")}
        </p>
      </div>
    </div>
  )
}

/** Props for the empty task state. */
export type Props = {
  /** Detail-loading error, when present. */
  error: string | null
  /** Whether routed task details are loading. */
  isLoading: boolean
}
