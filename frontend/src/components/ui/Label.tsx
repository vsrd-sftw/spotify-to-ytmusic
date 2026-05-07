import { type LabelHTMLAttributes, useId } from 'react'

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode
}

export function Label({ children, id: propsId, className = '', ...props }: LabelProps) {
  const generatedId = useId()
  const id = propsId ?? generatedId

  return (
    <label
      htmlFor={id}
      className={['text-sm font-medium text-gray-300', className].join(' ')}
      {...props}
    >
      {children}
    </label>
  )
}