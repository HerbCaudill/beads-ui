import { useEffect, useRef } from "react"
import { cn } from "../../lib/cn"

/**
 * Popup list of structured task-search completions.
 */
export function SearchSuggestions({
  activeIndex,
  id,
  onActiveIndexChange,
  onSelect,
  suggestions,
}: SearchSuggestionsProps) {
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    if (activeIndex < 0) return
    optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  return (
    <div
      id={id}
      role="listbox"
      aria-label="Search suggestions"
      className="absolute top-full right-0 left-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-gray-200 bg-white py-1 text-gray-950 shadow-lg"
    >
      {suggestions.map((suggestion, index) => (
        <button
          id={`${id}-option-${index}`}
          key={suggestion}
          type="button"
          role="option"
          aria-selected={index === activeIndex}
          tabIndex={-1}
          ref={(element) => {
            optionRefs.current[index] = element
          }}
          className={cn(
            "block w-full px-3 py-1.5 text-left text-sm",
            index === activeIndex ? "bg-gray-100" : "hover:bg-gray-100",
          )}
          onMouseEnter={() => onActiveIndexChange(index)}
          onMouseDown={(event) => {
            if (event.button === 0) event.preventDefault()
          }}
          onClick={() => onSelect(suggestion)}
        >
          {suggestion}
        </button>
      ))}
    </div>
  )
}

export type SearchSuggestionsProps = {
  /** Zero-based index of the keyboard-highlighted suggestion. */
  activeIndex: number
  /** DOM identifier used by the search input's ARIA attributes. */
  id: string
  /** Updates the highlighted suggestion. */
  onActiveIndexChange: (index: number) => void
  /** Applies a suggestion to the search query. */
  onSelect: (suggestion: string) => void
  /** Full query strings available for selection. */
  suggestions: string[]
}
