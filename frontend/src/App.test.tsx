import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import App from './App'

function renderWithClient(ui: ReactNode, initialEntries: string[] = ['/connect']) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('App', () => {
  it('renders the app heading', () => {
    renderWithClient(<App />)
    expect(screen.getByRole('heading', { name: /spotify.*yt music/i })).toBeInTheDocument()
  })

  it('renders the connect section by default', () => {
    renderWithClient(<App />)
    expect(screen.getByText(/conectar spotify/i)).toBeInTheDocument()
  })

  it('renders the report detail when navigating to /reports/:id', () => {
    renderWithClient(<App />, ['/reports/abc123'])
    // Either the loading skeleton or the not-found state should appear; verify
    // we are on a reports detail route by checking that the connect heading is absent.
    expect(screen.queryByText(/conectar spotify/i)).not.toBeInTheDocument()
  })
})
