import clsx, { type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/** Merge conditional Tailwind class names without conflicts. */
export function cx(
  /** Conditional class name values. */
  ...values: readonly ClassValue[]
): string {
  return twMerge(clsx(values))
}
