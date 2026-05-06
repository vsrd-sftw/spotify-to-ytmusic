import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import App from './App'

function renderWithClient(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
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
})
