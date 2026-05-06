import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useMemo } from 'react'
import { ErrorBoundary } from './ErrorBoundary'

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('test error')
  return <p>OK</p>
}

function PageLikeComponent({ shouldThrow }: { shouldThrow: boolean }) {
  // Page-shaped: derives data, renders nested layout, then fails on render.
  const items = useMemo(() => ['a', 'b', 'c'], [])
  if (shouldThrow) {
    throw new Error('page render error')
  }
  return (
    <section>
      <h2>Test page</h2>
      <ul>
        {items.map((it) => (
          <li key={it}>{it}</li>
        ))}
      </ul>
    </section>
  )
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>,
    )
    expect(screen.getByText('OK')).toBeInTheDocument()
  })

  it('renders fallback when a child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument()
  })

  it('captures render errors thrown by a page-like component', () => {
    render(
      <ErrorBoundary>
        <PageLikeComponent shouldThrow />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.queryByText(/test page/i)).not.toBeInTheDocument()
  })

  it('resets the boundary when "Reintentar" is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()

    rerender(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>,
    )

    fireEvent.click(screen.getByRole('button', { name: /reintentar/i }))

    expect(screen.getByText('OK')).toBeInTheDocument()
  })
})
