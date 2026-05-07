import type { ReactNode } from 'react'

export interface EmptyStateProps {
  title: string
  description?: string
  illustration?: ReactNode
  cta?: ReactNode
}

export function EmptyState({ title, description, illustration, cta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
      {illustration && <div aria-hidden="true">{illustration}</div>}
      <p className="text-lg font-semibold text-gray-200">{title}</p>
      {description && <p className="text-sm text-gray-400">{description}</p>}
      {cta && <div>{cta}</div>}
    </div>
  )
}
