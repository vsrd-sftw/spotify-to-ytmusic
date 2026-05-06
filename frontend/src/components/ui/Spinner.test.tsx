import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Spinner } from './Spinner'

describe('Spinner', () => {
  it('renders spinner element', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('has role status', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('has aria-live polite', () => {
    render(<Spinner />)
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveAttribute('aria-live', 'polite')
  })

  it('has aria-label', () => {
    render(<Spinner label="Loading data" />)
    expect(screen.getByLabelText('Loading data')).toBeInTheDocument()
  })

  it('renders with default size', () => {
    render(<Spinner size="md" />)
    const spinner = screen.getByRole('status')
    expect(spinner.querySelector('svg')).toHaveClass('h-6 w-6')
  })

  it('renders small size', () => {
    render(<Spinner size="sm" />)
    const spinner = screen.getByRole('status')
    expect(spinner.querySelector('svg')).toHaveClass('h-4 w-4')
  })

  it('renders large size', () => {
    render(<Spinner size="lg" />)
    const spinner = screen.getByRole('status')
    expect(spinner.querySelector('svg')).toHaveClass('h-8 w-8')
  })

  it('has sr-only text with label', () => {
    render(<Spinner label="Loading" />)
    expect(screen.getByText('Loading', { selector: '.sr-only' })).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<Spinner className="custom-class" />)
    expect(screen.getByRole('status')).toHaveClass('custom-class')
  })
})