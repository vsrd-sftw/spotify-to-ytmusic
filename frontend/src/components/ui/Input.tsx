import { forwardRef, type InputHTMLAttributes, useId } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, id: propsId, className = '', ...props }, ref) => {
    const generatedId = useId()
    const id = propsId ?? generatedId

    return (
      <input
        ref={ref}
        id={id}
        aria-invalid={error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={[
          'flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm transition-colors',
          'placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error
            ? 'border-red-500 focus-visible:ring-red-500'
            : 'border-gray-300 focus-visible:ring-blue-600',
          className,
        ].join(' ')}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'