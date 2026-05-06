import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Skeleton } from './Skeleton'

describe('Skeleton', () => {
  it('renders skeleton element', () => {
    render(<Skeleton />)
    expect(screen.getByTestId('skeleton')).toBeInTheDocument()
  })

  it('renders with default text variant', () => {
    render(<Skeleton variant="text" />)
    expect(screen.getByTestId('skeleton')).toHaveClass('rounded')
  })

  it('renders with circle variant', () => {
    render(<Skeleton variant="circle" />)
    expect(screen.getByTestId('skeleton')).toHaveClass('rounded-full')
  })

  it('renders with rect variant', () => {
    render(<Skeleton variant="rect" />)
    expect(screen.getByTestId('skeleton')).toHaveClass('rounded-md')
  })

  it('respects width prop', () => {
    render(<Skeleton width={100} />)
    expect(screen.getByTestId('skeleton')).toHaveStyle({ width: '100px' })
  })

  it('respects height prop', () => {
    render(<Skeleton height={50} />)
    expect(screen.getByTestId('skeleton')).toHaveStyle({ height: '50px' })
  })

  it('respects both width and height props', () => {
    render(<Skeleton width={100} height={50} />)
    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toHaveStyle({ width: '100px', height: '50px' })
  })

  it('applies custom className', () => {
    render(<Skeleton className="custom-class" />)
    expect(screen.getByTestId('skeleton')).toHaveClass('custom-class')
  })
})