import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyState } from './EmptyState'
import { Button } from './Button'

describe('EmptyState', () => {
  it('renders the title', () => {
    render(<EmptyState title="Sin resultados" />)
    expect(screen.getByText('Sin resultados')).toBeInTheDocument()
  })

  it('renders the description when provided', () => {
    render(<EmptyState title="Sin resultados" description="Prueba con otro filtro." />)
    expect(screen.getByText('Prueba con otro filtro.')).toBeInTheDocument()
  })

  it('renders the CTA slot', () => {
    render(
      <EmptyState
        title="Sin resultados"
        cta={<Button>Añadir algo</Button>}
      />,
    )
    expect(screen.getByRole('button', { name: 'Añadir algo' })).toBeInTheDocument()
  })

  it('renders the illustration slot', () => {
    render(
      <EmptyState
        title="Sin resultados"
        illustration={<img src="/empty.svg" alt="vacío" />}
      />,
    )
    expect(screen.getByAltText('vacío')).toBeInTheDocument()
  })
})
