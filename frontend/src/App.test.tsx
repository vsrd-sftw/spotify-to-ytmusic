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

  it('resolves the test useQuery and renders its data', async () => {
    renderWithClient(<App />)
    const status = await screen.findByTestId('ping-status')
    await screen.findByText('ok')
    expect(status).toHaveTextContent('ok')
  })
})
