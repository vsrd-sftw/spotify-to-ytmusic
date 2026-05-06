import { createContext } from 'react'
import type { AppSection } from './AppSectionContext'

export type AppSectionValue = {
  section: AppSection
  setSection: (section: AppSection) => void
}

export const AppSectionContext = createContext<AppSectionValue | null>(null)