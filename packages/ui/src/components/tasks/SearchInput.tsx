import {
  forwardRef,
  useCallback,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import type { KeyboardEvent } from "react"
import { IconSearch, IconX } from "@tabler/icons-react"
import {
  useBeadsViewStore,
  selectTaskSearchQuery,
  selectSelectedTaskId,
  selectVisibleTaskIds,
} from "../../store"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupButton } from "@beads/components"
import { getSearchSuggestions } from "../../lib/getSearchSuggestions"
import { SearchSuggestions } from "./SearchSuggestions"

/**
 * Search input for filtering tasks in the task list.
 * Uses Zustand store for state management to enable live filtering.
 */
export const SearchInput = forwardRef<SearchInputHandle, SearchInputProps>(function SearchInput(
  { placeholder = "Search or filter tasks...", disabled = false, className, onOpenTask },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionListId = useId()
  const query = useBeadsViewStore(selectTaskSearchQuery)
  const setQuery = useBeadsViewStore((state) => state.setTaskSearchQuery)
  const clearQuery = useBeadsViewStore((state) => state.clearTaskSearchQuery)
  const selectedTaskId = useBeadsViewStore(selectSelectedTaskId)
  const setSelectedTaskId = useBeadsViewStore((state) => state.setSelectedTaskId)
  const clearSelectedTaskId = useBeadsViewStore((state) => state.clearSelectedTaskId)
  const visibleTaskIds = useBeadsViewStore(selectVisibleTaskIds)
  const suggestions = useMemo(() => getSearchSuggestions(query), [query])
  const [isFocused, setIsFocused] = useState(false)
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1)
  const showSuggestions = isFocused && suggestions.length > 0

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus()
      inputRef.current?.select()
    },
    clear: () => {
      clearQuery()
    },
  }))

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value)
      setActiveSuggestionIndex(-1)
    },
    [setQuery],
  )

  const selectSuggestion = useCallback(
    (suggestion: string) => {
      setQuery(suggestion)
      setActiveSuggestionIndex(-1)
      inputRef.current?.focus()
    },
    [setQuery],
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (showSuggestions && e.key === "ArrowDown") {
        e.preventDefault()
        setActiveSuggestionIndex((index) => (index + 1) % suggestions.length)
        return
      }
      if (showSuggestions && e.key === "ArrowUp") {
        e.preventDefault()
        setActiveSuggestionIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1))
        return
      }
      if (showSuggestions && e.key === "Enter") {
        e.preventDefault()
        const suggestion = suggestions[activeSuggestionIndex]
        if (suggestion) selectSuggestion(suggestion)
        return
      }
      if (e.key === "Enter" && selectedTaskId && onOpenTask) {
        e.preventDefault()
        onOpenTask(selectedTaskId)
      }
      if (e.key === "ArrowDown") {
        e.preventDefault()
        const currentIndex = selectedTaskId ? visibleTaskIds.indexOf(selectedTaskId) : -1
        const nextIndex = Math.min(currentIndex + 1, visibleTaskIds.length - 1)
        const nextId = visibleTaskIds[nextIndex]
        if (nextId) setSelectedTaskId(nextId)
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        if (visibleTaskIds.length === 0) return
        const currentIndex = selectedTaskId
          ? visibleTaskIds.indexOf(selectedTaskId)
          : visibleTaskIds.length
        const prevIndex = Math.max(currentIndex - 1, 0)
        const prevId = visibleTaskIds[prevIndex]
        if (prevId) setSelectedTaskId(prevId)
      }
      if (e.key === "Escape") {
        setIsFocused(false)
        setActiveSuggestionIndex(-1)
        if (query) {
          clearQuery()
        }
        clearSelectedTaskId()
        // Blur the input so keyboard navigation doesn't stay trapped
        inputRef.current?.blur()
      }
    },
    [
      selectedTaskId,
      onOpenTask,
      visibleTaskIds,
      setSelectedTaskId,
      query,
      clearQuery,
      clearSelectedTaskId,
      showSuggestions,
      suggestions,
      activeSuggestionIndex,
      selectSuggestion,
    ],
  )

  const handleClear = useCallback(() => {
    clearQuery()
    clearSelectedTaskId()
    setActiveSuggestionIndex(-1)
  }, [clearQuery, clearSelectedTaskId])

  return (
    <InputGroup data-disabled={disabled} className={className}>
      <InputGroupAddon>
        <IconSearch className="size-4" />
      </InputGroupAddon>
      <InputGroupInput
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false)
          setActiveSuggestionIndex(-1)
        }}
        placeholder={placeholder}
        disabled={disabled}
        role="combobox"
        aria-label="Search tasks"
        aria-description={SEARCH_HELP_TEXT}
        aria-autocomplete="list"
        aria-controls={showSuggestions ? suggestionListId : undefined}
        aria-expanded={showSuggestions}
        aria-activedescendant={
          showSuggestions && activeSuggestionIndex >= 0
            ? `${suggestionListId}-option-${activeSuggestionIndex}`
            : undefined
        }
        title={SEARCH_HELP_TEXT}
      />
      {query && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            type="button"
            onClick={handleClear}
            size="icon-xs"
            variant="ghost"
            aria-label="Clear search"
          >
            <IconX className="size-4" />
          </InputGroupButton>
        </InputGroupAddon>
      )}
      {showSuggestions && (
        <SearchSuggestions
          id={suggestionListId}
          suggestions={suggestions}
          activeIndex={activeSuggestionIndex}
          onActiveIndexChange={setActiveSuggestionIndex}
          onSelect={selectSuggestion}
        />
      )}
    </InputGroup>
  )
})

/** Concise task-search syntax guidance. */
const SEARCH_HELP_TEXT =
  "Filter with status:, label:, priority:, type:, parent:, or is:. Use commas for alternatives and - to exclude."

export type SearchInputProps = {
  placeholder?: string
  disabled?: boolean
  className?: string
  onOpenTask?: (taskId: string) => void
}

export type SearchInputHandle = {
  focus: () => void
  clear: () => void
}
