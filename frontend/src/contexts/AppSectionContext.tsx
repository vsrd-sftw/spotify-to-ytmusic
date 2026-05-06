import { createContext, useContext, useState, type ReactNode } from 'react'

export type AppSection = 'connect' | 'library' | 'migrate' | 'reports'

interface AppSectionContextValue {
  section: AppSection
  setSection: (section: AppSection) => void
}

const AppSectionContext = createContext<AppSectionContextValue | null>(null)

interface AppSectionProviderProps {
  children: ReactNode
}

export function AppSectionProvider({ children }: AppSectionProviderProps) {
  const [section, setSection] = useState<AppSection>('connect')

  return (
    <AppSectionContext.Provider value={{ section, setSection }}>
      {children}
    </AppSectionContext.Provider>
  )
}

export function useAppSection() {
  const context = useContext(AppSectionContext)
  if (!context) {
    throw new Error('useAppSection must be used within AppSectionProvider')
  }
  return context
}