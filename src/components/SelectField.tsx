import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface SelectOption<T> {
  label: string
  value: T
}

interface SelectFieldProps<T> {
  label: string
  value: T
  onSelect: (value: T) => void
  options: SelectOption<T>[]
  formatValue?: (value: T) => string
}

export const SelectField = <T extends string | number>({
  label,
  value,
  onSelect,
  options,
  formatValue,
}: SelectFieldProps<T>) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const selectedLabel = useMemo(() => {
    if (formatValue) {
      return formatValue(value)
    }
    const match = options.find((option) => option.value === value)
    return match?.label ?? String(value)
  }, [value, options, formatValue])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const handleSelect = useCallback(
    (next: T) => {
      onSelect(next)
      setIsOpen(false)
    },
    [onSelect],
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        toggleOpen()
      } else if (event.key === 'Escape') {
        setIsOpen(false)
      }
    },
    [toggleOpen],
  )

  return (
    <div className="select-field" ref={containerRef}>
      <label className="panel-label select-field__label">{label}</label>
      <button
        type="button"
        className={`select-trigger ${isOpen ? 'select-trigger--open' : ''}`}
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{selectedLabel}</span>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M3 5l4 4 4-4" stroke="#65ffb7" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </svg>
      </button>
      {isOpen && (
        <div className="select-options" role="listbox">
          {options.map((option) => (
            <button
              type="button"
              key={String(option.value)}
              className={`select-option ${option.value === value ? 'select-option--selected' : ''}`}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
