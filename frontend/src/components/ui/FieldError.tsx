import { useId } from 'react'

export interface FieldErrorProps {
  id?: string
  children: React.ReactNode
}

export function FieldError({ id: propsId, children }: FieldErrorProps) {
  const generatedId = useId()
  const id = propsId ?? `${generatedId}-error`

  return (
    <span
      id={id}
      role="alert"
      className="text-sm text-red-600"
    >
      {children}
    </span>
  )
}