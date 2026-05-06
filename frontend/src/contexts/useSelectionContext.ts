import { useContext } from 'react'
import { SelectionContext, type SelectionContextValue } from './SelectionContextValue'

export function useSelectionContext(): SelectionContextValue {
  const ctx = useContext(SelectionContext)
  if (!ctx) {
    throw new Error('useSelectionContext must be used within SelectionProvider')
  }
  return ctx
}
