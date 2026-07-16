import { IconAlertCircle } from "@tabler/icons-react"

/** Show an error returned while loading the task list. */
export function TaskListError({ message }: Props) {
  return (
    <div
      className="text-destructive flex h-full items-center justify-center gap-2 p-4 text-center text-sm"
      role="alert"
    >
      <IconAlertCircle aria-hidden="true" className="size-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

/** Props accepted by the task list error component. */
export type Props = {
  /** Error message returned by the task API. */
  message: string
}
