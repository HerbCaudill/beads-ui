import { IconPlus, IconX } from "@tabler/icons-react"
import { type FormEvent, useState } from "react"

/** Display and edit labels attached to a task. */
export function LabelEditor({ labels, onAdd, onRemove }: Props) {
  const [label, setLabel] = useState("")

  /** Add the normalized label value. */
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = label.trim()
    if (!value) return
    onAdd(value)
    setLabel("")
  }

  return (
    <section className="mb-6">
      <h3 className="mb-3 text-sm font-semibold text-slate-200">Labels</h3>
      <div className="mb-3 flex flex-wrap gap-2">
        {labels.map((value) => (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-cyan-950 px-2.5 py-1 text-xs text-cyan-300"
            key={value}
          >
            {value}
            <button
              aria-label={`Remove label ${value}`}
              className="rounded-full hover:text-white"
              onClick={() => onRemove(value)}
              type="button"
            >
              <IconX size={12} />
            </button>
          </span>
        ))}
      </div>
      <form className="flex gap-2" onSubmit={submit}>
        <label className="min-w-0 flex-1">
          <span className="sr-only">New label</span>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-500"
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Add label"
            value={label}
          />
        </label>
        <button
          aria-label="Add label"
          className="rounded-lg bg-slate-800 px-3 text-slate-200 hover:bg-slate-700"
          type="submit"
        >
          <IconPlus size={16} />
        </button>
      </form>
    </section>
  )
}

/** Properties for label management. */
type Props = {
  /** Labels currently attached to the task. */
  readonly labels: readonly string[]
  /** Attach a label. */
  readonly onAdd: (label: string) => void
  /** Remove an attached label. */
  readonly onRemove: (label: string) => void
}
