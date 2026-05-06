import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('renders primary variant', () => {
    render(<Button variant="primary">Primary</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-blue-600')
  })

  it('renders secondary variant', () => {
    render(<Button variant="secondary">Secondary</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-gray-200')
  })

  it('renders ghost variant', () => {
    render(<Button variant="ghost">Ghost</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-transparent')
  })

  it('renders small size', () => {
    render(<Button size="sm">Small</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('h-8')
  })

  it('renders medium size', () => {
    render(<Button size="md">Medium</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('h-10')
  })

  it('renders large size', () => {
    render(<Button size="lg">Large</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('h-12')
  })

  it('renders disabled state', () => {
    render(<Button disabled>Disabled</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button.className).toContain('disabled:opacity-50')
  })

  it('renders loading state', () => {
    render(<Button loading>Loading</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toContainHTML('<svg')
  })

  it('has focus-visible ring on keyboard focus', () => {
    render(<Button>Focusable</Button>)
    const button = screen.getByRole('button')
    button.focus()
    expect(button).toHaveClass('focus-visible:ring-2')
  })
})