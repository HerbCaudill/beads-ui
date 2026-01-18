/**
 * FilterBar component.
 *
 * Provides filter controls for the ListView:
 * - Status dropdown with multi-select checkboxes
 * - Type dropdown with multi-select checkboxes
 * - Search input for filtering by ID or title
 */
import { useCallback, useEffect, useRef, useState } from "react"

import { useAppStore, type StatusFilter } from "../store/index.js"
import { ISSUE_TYPES, typeLabel } from "../utils/issue-type.js"
import { statusLabel } from "../utils/status.js"

/**
 * Status filter options including special "ready" status.
 */
const STATUS_OPTIONS: readonly string[] = ["ready", "open", "in_progress", "closed"]

/**
 * Normalize status filter value to array format for multi-select support.
 */
function normalizeStatusFilter(val: StatusFilter | string[] | undefined): string[] {
  if (Array.isArray(val)) return val
  if (typeof val === "string" && val !== "all") return [val]
  return []
}

/**
 * Normalize type filter value to array format.
 */
function normalizeTypeFilter(val: string | string[] | undefined): string[] {
  if (Array.isArray(val)) return val
  if (typeof val === "string" && val !== "") return [val]
  return []
}

/**
 * Get display text for dropdown trigger.
 */
function getDropdownDisplayText(
  selected: string[],
  label: string,
  formatter: (val: string) => string,
): string {
  if (selected.length === 0) return `${label}: Any`
  const first = selected[0]
  if (selected.length === 1 && first !== undefined) return `${label}: ${formatter(first)}`
  return `${label} (${selected.length})`
}

/**
 * Get label for a status option.
 */
function getStatusLabel(status: string): string {
  return status === "ready" ? "Ready" : statusLabel(status)
}

export interface FilterBarProps {
  /** Optional test ID for testing. */
  testId?: string
}

/**
 * FilterBar component.
 *
 * Renders filter dropdowns and search input for the list view.
 * Manages filter state via Zustand store.
 */
export function FilterBar({ testId }: FilterBarProps): React.JSX.Element {
  // Get filter state from store
  const filters = useAppStore(state => state.filters)
  const setFilters = useAppStore(state => state.setFilters)

  // Normalize filters to array format for multi-select
  const statusFilters = normalizeStatusFilter(filters.status)
  const typeFilters = normalizeTypeFilter(filters.type)
  const searchText = filters.search || ""

  // Dropdown open state
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false)

  // Refs for click outside detection
  const statusDropdownRef = useRef<HTMLDivElement>(null)
  const typeDropdownRef = useRef<HTMLDivElement>(null)

  /**
   * Toggle status dropdown open/closed.
   */
  const toggleStatusDropdown = useCallback((e: React.MouseEvent): void => {
    e.stopPropagation()
    setStatusDropdownOpen(prev => !prev)
    setTypeDropdownOpen(false)
  }, [])

  /**
   * Toggle type dropdown open/closed.
   */
  const toggleTypeDropdown = useCallback((e: React.MouseEvent): void => {
    e.stopPropagation()
    setTypeDropdownOpen(prev => !prev)
    setStatusDropdownOpen(false)
  }, [])

  /**
   * Toggle a status filter chip.
   */
  const toggleStatusFilter = useCallback(
    (status: string): void => {
      let newFilters: string[]
      if (statusFilters.includes(status)) {
        newFilters = statusFilters.filter(s => s !== status)
      } else {
        newFilters = [...statusFilters, status]
      }
      // Use type assertion for array-based multi-select that extends store's single-value type
      setFilters({ status: newFilters as unknown as StatusFilter })
    },
    [statusFilters, setFilters],
  )

  /**
   * Toggle a type filter chip.
   */
  const toggleTypeFilter = useCallback(
    (type: string): void => {
      let newFilters: string[]
      if (typeFilters.includes(type)) {
        newFilters = typeFilters.filter(t => t !== type)
      } else {
        newFilters = [...typeFilters, type]
      }
      // Use type assertion for array-based multi-select that extends store's single-value type
      setFilters({ type: newFilters as unknown as string })
    },
    [typeFilters, setFilters],
  )

  /**
   * Handle search input change.
   */
  const handleSearchInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      setFilters({ search: e.target.value })
    },
    [setFilters],
  )

  /**
   * Close dropdowns when clicking outside.
   */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      const target = e.target as HTMLElement | null
      if (
        statusDropdownOpen &&
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(target)
      ) {
        setStatusDropdownOpen(false)
      }
      if (
        typeDropdownOpen &&
        typeDropdownRef.current &&
        !typeDropdownRef.current.contains(target)
      ) {
        setTypeDropdownOpen(false)
      }
    }

    document.addEventListener("click", handleClickOutside)
    return () => {
      document.removeEventListener("click", handleClickOutside)
    }
  }, [statusDropdownOpen, typeDropdownOpen])

  return (
    <div className="panel__header" data-testid={testId}>
      {/* Status Filter Dropdown */}
      <div
        className={`filter-dropdown ${statusDropdownOpen ? "is-open" : ""}`}
        ref={statusDropdownRef}
      >
        <button
          className="filter-dropdown__trigger"
          onClick={toggleStatusDropdown}
          aria-expanded={statusDropdownOpen}
          aria-haspopup="listbox"
        >
          {getDropdownDisplayText(statusFilters, "Status", getStatusLabel)}
          <span className="filter-dropdown__arrow">▾</span>
        </button>
        <div className="filter-dropdown__menu" role="listbox">
          {STATUS_OPTIONS.map(s => (
            <label key={s} className="filter-dropdown__option">
              <input
                type="checkbox"
                checked={statusFilters.includes(s)}
                onChange={() => toggleStatusFilter(s)}
              />
              {getStatusLabel(s)}
            </label>
          ))}
        </div>
      </div>

      {/* Type Filter Dropdown */}
      <div className={`filter-dropdown ${typeDropdownOpen ? "is-open" : ""}`} ref={typeDropdownRef}>
        <button
          className="filter-dropdown__trigger"
          onClick={toggleTypeDropdown}
          aria-expanded={typeDropdownOpen}
          aria-haspopup="listbox"
        >
          {getDropdownDisplayText(typeFilters, "Types", typeLabel)}
          <span className="filter-dropdown__arrow">▾</span>
        </button>
        <div className="filter-dropdown__menu" role="listbox">
          {ISSUE_TYPES.map(t => (
            <label key={t} className="filter-dropdown__option">
              <input
                type="checkbox"
                checked={typeFilters.includes(t)}
                onChange={() => toggleTypeFilter(t)}
              />
              {typeLabel(t)}
            </label>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <input
        type="search"
        placeholder="Search…"
        value={searchText}
        onChange={handleSearchInput}
        aria-label="Search issues"
      />
    </div>
  )
}
