import type { ReactNode } from 'react'

export interface CardProps {
  children: ReactNode
  className?: string
}

export interface CardHeaderProps {
  children: ReactNode
  className?: string
}

export interface CardBodyProps {
  children: ReactNode
  className?: string
}

export interface CardFooterProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={['rounded-lg border border-gray-700 bg-gray-800', className].join(' ')}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={['border-b border-gray-700 px-4 py-3', className].join(' ')}>
      {children}
    </div>
  )
}

export function CardBody({ children, className = '' }: CardBodyProps) {
  return (
    <div className={['p-4', className].join(' ')}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={['border-t border-gray-700 px-4 py-3', className].join(' ')}>
      {children}
    </div>
  )
}