import type { ReactNode } from 'react'
import { Header } from './Header'
import { Footer } from './Footer'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:font-medium"
      >
        Ir al contenido principal
      </a>
      <Header />
      <main id="main-content" role="main" className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}