import { useContext } from 'react'
import { AppSectionContext } from '@/contexts/AppSectionContextValue'

export function useAppSection() {
  const context = useContext(AppSectionContext)
  if (!context) {
    throw new Error('useAppSection must be used within AppSectionProvider')
  }
  return context
}

export { AppSectionProvider } from '@/contexts/AppSectionContext'
export type { AppSection } from '@/contexts/AppSectionContext'