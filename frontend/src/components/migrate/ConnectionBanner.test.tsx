import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConnectionBanner } from './ConnectionBanner';

describe('ConnectionBanner', () => {
  it('renders nothing when state is open', () => {
    const { container } = render(
      <ConnectionBanner state="open" retryCount={0} onRetry={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders reconnecting banner with retry count', () => {
    render(
      <ConnectionBanner state="reconnecting" retryCount={2} onRetry={vi.fn()} />,
    );
    expect(screen.getByText('Conexión perdida — reintentando…')).toBeInTheDocument();
    expect(screen.getByText('Intento 2 de 5')).toBeInTheDocument();
  });

  it('renders exhausted banner without retry count', () => {
    render(
      <ConnectionBanner state="exhausted" retryCount={5} onRetry={vi.fn()} />,
    );
    expect(screen.getByText('Conexión perdida')).toBeInTheDocument();
    expect(screen.queryByText(/Intento/)).not.toBeInTheDocument();
  });

  it('calls onRetry when button is clicked', async () => {
    const onRetry = vi.fn();
    render(
      <ConnectionBanner state="reconnecting" retryCount={1} onRetry={onRetry} />,
    );
    const button = screen.getByRole('button', { name: 'Reintentar ahora' });
    button.click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
