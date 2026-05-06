export type SkeletonVariant = 'text' | 'circle' | 'rect'

export interface SkeletonProps {
  variant?: SkeletonVariant
  width?: string | number
  height?: string | number
  className?: string
}

const variantStyles = {
  text: 'rounded',
  circle: 'rounded-full',
  rect: 'rounded-md',
}

export function Skeleton({ variant = 'text', width, height, className = '' }: SkeletonProps) {
  const style: React.CSSProperties = {}
  if (width !== undefined) style.width = width
  if (height !== undefined) style.height = height

  return (
    <div
      data-testid="skeleton"
      className={['animate-pulse bg-gray-200', variantStyles[variant], className].join(' ')}
      style={style}
    />
  )
}