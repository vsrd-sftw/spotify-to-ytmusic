import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ConnectionStatus } from './ConnectionStatus';

describe('ConnectionStatus', () => {
  it('renders both service badges', () => {
    render(<ConnectionStatus spotify="unknown" ytmusic="unknown" />);
    expect(screen.getByText('Spotify')).toBeInTheDocument();
    expect(screen.getByText('YT Music')).toBeInTheDocument();
  });

  it('shows connected aria-label for connected state', () => {
    render(<ConnectionStatus spotify="connected" ytmusic="connected" />);
    expect(screen.getByLabelText(/spotify conectado/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/yt music conectado/i)).toBeInTheDocument();
  });

  it('shows disconnected aria-label for disconnected state', () => {
    render(<ConnectionStatus spotify="disconnected" ytmusic="disconnected" />);
    expect(screen.getByLabelText(/spotify desconectado/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/yt music desconectado/i)).toBeInTheDocument();
  });

  it('shows unknown aria-label for unknown state', () => {
    render(<ConnectionStatus spotify="unknown" ytmusic="unknown" />);
    expect(screen.getByLabelText(/spotify desconocido/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/yt music desconocido/i)).toBeInTheDocument();
  });

  it('renders a connected icon (●) when connected', () => {
    render(<ConnectionStatus spotify="connected" ytmusic="unknown" />);
    const icons = screen.getAllByTestId('connection-icon-connected');
    expect(icons).toHaveLength(1);
    expect(icons[0]).toHaveTextContent('●');
    expect(icons[0]).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders a disconnected icon (✕) when disconnected', () => {
    render(<ConnectionStatus spotify="disconnected" ytmusic="connected" />);
    const icons = screen.getAllByTestId('connection-icon-disconnected');
    expect(icons).toHaveLength(1);
    expect(icons[0]).toHaveTextContent('✕');
    expect(icons[0]).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders an unknown icon (○) when unknown', () => {
    render(<ConnectionStatus spotify="unknown" ytmusic="unknown" />);
    const icons = screen.getAllByTestId('connection-icon-unknown');
    expect(icons).toHaveLength(2);
    icons.forEach((icon) => {
      expect(icon).toHaveTextContent('○');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
