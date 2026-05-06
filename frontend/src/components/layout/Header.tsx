import type { ReactNode } from 'react'

interface HeaderProps {
  children?: ReactNode
}

export function Header({ children }: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-white px-4">
      <h1 className="text-xl font-bold text-gray-900">Spotify → YT Music</h1>
      {children && <div>{children}</div>}
    </header>
  )
}