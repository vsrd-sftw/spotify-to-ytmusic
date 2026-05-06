import { useState, type ReactNode } from 'react'
import { AppSectionContext } from './AppSectionContextValue'

export type AppSection = 'connect' | 'library' | 'migrate' | 'reports'

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