import { createContext, useContext, type ReactNode } from 'react'

interface ListContextValue {
  onSelect?: (id: string) => void
  selectedIds: Set<string>
}

const ListContext = createContext<ListContextValue>({ selectedIds: new Set() })

export interface ListProps {
  children: ReactNode
  onSelect?: (id: string) => void
  selectedIds?: string[]
  className?: string
}

export function List({ children, onSelect, selectedIds = [], className = '' }: ListProps) {
  const value = {
    onSelect,
    selectedIds: new Set(selectedIds),
  }

  return (
    <ListContext.Provider value={value}>
      <ul className={['divide-y divide-gray-200', className].join(' ')}>
        {children}
      </ul>
    </ListContext.Provider>
  )
}

export interface ListItemProps {
  id: string
  children: ReactNode
  className?: string
  onSelect?: (id: string) => void
}

export function ListItem({ id, children, className = '', onSelect }: ListItemProps) {
  const { onSelect: contextOnSelect, selectedIds } = useContext(ListContext)
  const isSelected = selectedIds.has(id)

  const handleClick = () => {
    if (onSelect) {
      onSelect(id)
    } else if (contextOnSelect) {
      contextOnSelect(id)
    }
  }

  return (
    <li
      className={[
        'flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer',
        isSelected && 'bg-blue-50',
        className,
      ].join(' ')}
      onClick={handleClick}
    >
      {children}
    </li>
  )
}

export interface ListItemLeadingProps {
  children: ReactNode
  className?: string
}

export function ListItemLeading({ children, className = '' }: ListItemLeadingProps) {
  return <span className={['flex-shrink-0', className].join(' ')}>{children}</span>
}

export interface ListItemTrailingProps {
  children: ReactNode
  className?: string
}

export function ListItemTrailing({ children, className = '' }: ListItemTrailingProps) {
  return <span className={['flex-shrink-0 ml-auto', className].join(' ')}>{children}</span>
}