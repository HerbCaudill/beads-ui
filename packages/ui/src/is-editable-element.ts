/** Check whether a keyboard event originated in a text-editing control. */
export function isEditableElement(
  /** Event target to inspect. */
  target: EventTarget | null,
): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)
}
