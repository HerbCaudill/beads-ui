import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@beads/components"
import { IconKeyboard } from "@tabler/icons-react"

/** Show the keyboard shortcuts retained from Beads View. */
export function HotkeysDialog({ open, onClose, hotkeys }: Props) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}>
      <DialogContent className="w-80 p-4">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <IconKeyboard className="text-muted-foreground h-5 w-5" />
            <DialogTitle className="text-base">Keyboard shortcuts</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-1">
          {hotkeys.map(({ action, display, description }) => (
            <div key={action} className="flex items-center justify-between py-1.5">
              <span className="text-foreground text-sm">{description}</span>
              <kbd className="border-border bg-muted text-muted-foreground rounded border px-1.5 py-0.5 font-mono text-xs">
                {display}
              </kbd>
            </div>
          ))}
        </div>
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Props for the keyboard shortcut dialog. */
export type Props = {
  /** Registered keyboard shortcuts. */
  hotkeys: Array<{ action: string; display: string; description: string }>
  /** Close the dialog. */
  onClose: () => void
  /** Whether the dialog is visible. */
  open: boolean
}
