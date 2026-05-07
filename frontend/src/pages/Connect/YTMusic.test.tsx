import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer, ToastProvider } from '@/components/ui/Toast';
import { server } from '@/test/msw/server';
import { ytmusicAuthErrorHandler } from '@/test/msw/handlers';
import { YTMusicConnect } from './YTMusic';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        {children}
        <ToastContainer />
      </ToastProvider>
    </QueryClientProvider>
  );
}

function renderComponent() {
  return render(<YTMusicConnect />, { wrapper });
}

const VALID_HEADERS = 'cookie: sid=abc\nuser-agent: Mozilla/5.0';

describe('YTMusicConnect', () => {
  it('renders the section heading', () => {
    renderComponent();
    expect(screen.getByRole('heading', { name: /conectar youtube music/i })).toBeInTheDocument();
  });

  it('renders a labelled textarea', () => {
    renderComponent();
    expect(screen.getByLabelText(/headers del navegador/i)).toBeInTheDocument();
  });

  it('renders the connect button', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: /conectar con youtube music/i })).toBeInTheDocument();
  });

  it('button is disabled when textarea is empty', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: /conectar con youtube music/i })).toBeDisabled();
  });

  it('button is enabled when textarea has content', () => {
    renderComponent();
    fireEvent.change(screen.getByLabelText(/headers del navegador/i), {
      target: { value: 'Authorization: Bearer token' },
    });
    expect(screen.getByRole('button', { name: /conectar con youtube music/i })).toBeEnabled();
  });

  it('help text references DevTools and Network', () => {
    renderComponent();
    const section = screen.getByRole('region', { name: /conectar youtube music/i });
    expect(section).toHaveTextContent(/devtools/i);
    expect(section).toHaveTextContent(/network/i);
  });

  it('shows FieldError when server rejects headers', async () => {
    server.use(ytmusicAuthErrorHandler);
    renderComponent();
    fireEvent.change(screen.getByLabelText(/headers del navegador/i), {
      target: { value: 'authorization: Bearer token' },
    });
    fireEvent.click(screen.getByRole('button', { name: /conectar con youtube music/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/error al guardar headers/i);
    });
  });

  it('shows FieldError on HTTP error', async () => {
    server.use(ytmusicAuthErrorHandler);
    renderComponent();
    fireEvent.change(screen.getByLabelText(/headers del navegador/i), {
      target: { value: VALID_HEADERS },
    });
    fireEvent.click(screen.getByRole('button', { name: /conectar con youtube music/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/error al guardar headers/i);
    });
  });

  it('shows success toast after valid submission', async () => {
    renderComponent();
    fireEvent.change(screen.getByLabelText(/headers del navegador/i), {
      target: { value: VALID_HEADERS },
    });
    fireEvent.click(screen.getByRole('button', { name: /conectar con youtube music/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/youtube music conectado/i);
    });
  });
});
