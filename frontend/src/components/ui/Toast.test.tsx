import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ToastProvider, useToast, ToastContainer } from './Toast'
import type { ReactNode } from 'react'

function TestComponent({ onSuccess, onError, onInfo }: { onSuccess?: () => void; onError?: () => void; onInfo?: () => void }) {
  const toast = useToast()
  return (
    <div>
      <button onClick={() => { toast.success('Success message'); onSuccess?.() }}>Success</button>
      <button onClick={() => { toast.error('Error message'); onError?.() }}>Error</button>
      <button onClick={() => { toast.info('Info message'); onInfo?.() }}>Info</button>
    </div>
  )
}

describe('Toast', () => {
  const renderWithProvider = (children: ReactNode) => {
    return render(
      <ToastProvider autoDismissMs={1000}>
        {children}
        <ToastContainer />
      </ToastProvider>
    )
  }

  it('renders toast when success is called', async () => {
    renderWithProvider(<TestComponent />)
    
    fireEvent.click(screen.getByText('Success'))
    
    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument()
    })
  })

  it('renders toast when error is called', async () => {
    renderWithProvider(<TestComponent />)
    
    fireEvent.click(screen.getByText('Error'))
    
    await waitFor(() => {
      expect(screen.getByText('Error message')).toBeInTheDocument()
    })
  })

  it('renders toast when info is called', async () => {
    renderWithProvider(<TestComponent />)
    
    fireEvent.click(screen.getByText('Info'))
    
    await waitFor(() => {
      expect(screen.getByText('Info message')).toBeInTheDocument()
    })
  })

  it('stacks multiple toasts', async () => {
    renderWithProvider(<TestComponent />)
    
    fireEvent.click(screen.getByText('Success'))
    fireEvent.click(screen.getByText('Error'))
    fireEvent.click(screen.getByText('Info'))
    
    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument()
      expect(screen.getByText('Error message')).toBeInTheDocument()
      expect(screen.getByText('Info message')).toBeInTheDocument()
    })
  })

  it('dismisses manually via close button', async () => {
    renderWithProvider(<TestComponent />)
    
    fireEvent.click(screen.getByText('Success'))
    
    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument()
    })

    const closeButton = screen.getByRole('button', { name: 'Dismiss' })
    fireEvent.click(closeButton)

    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument()
    })
  })

  it('renders with correct styling for success', async () => {
    renderWithProvider(<TestComponent />)
    
    fireEvent.click(screen.getByText('Success'))
    
    await waitFor(() => {
      const toast = screen.getByText('Success message').closest('div')
      expect(toast).toHaveClass('bg-green-50')
    })
  })

  it('renders with correct styling for error', async () => {
    renderWithProvider(<TestComponent />)
    
    fireEvent.click(screen.getByText('Error'))
    
    await waitFor(() => {
      const toast = screen.getByText('Error message').closest('div')
      expect(toast).toHaveClass('bg-red-50')
    })
  })

  it('has aria-live region', async () => {
    renderWithProvider(<TestComponent />)
    
    fireEvent.click(screen.getByText('Success'))
    
    await waitFor(() => {
      expect(screen.getByRole('status').closest('[aria-live]')).toBeInTheDocument()
    })
  })
})