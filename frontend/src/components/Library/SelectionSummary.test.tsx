import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SelectionSummary } from './SelectionSummary';

function renderComponent(playlistCount: number, albumCount: number, onMigrate = vi.fn()) {
  return render(<SelectionSummary playlistCount={playlistCount} albumCount={albumCount} onMigrate={onMigrate} />);
}

describe('SelectionSummary', () => {
  it('shows "Ningún elemento seleccionado" when both counts are zero', () => {
    renderComponent(0, 0);
    expect(screen.getByText(/ningún elemento seleccionado/i)).toBeInTheDocument();
  });

  it('shows playlist count in label', () => {
    renderComponent(2, 0);
    expect(screen.getByText(/2 playlists/i)).toBeInTheDocument();
  });

  it('shows album count in label', () => {
    renderComponent(0, 3);
    expect(screen.getByText(/3 álbumes/i)).toBeInTheDocument();
  });

  it('shows both counts when both are selected', () => {
    renderComponent(1, 2);
    const label = screen.getByText(/1 playlist.*2 álbumes|2 álbumes.*1 playlist/i);
    expect(label).toBeInTheDocument();
  });

  it('disables the Migrar button when nothing is selected', () => {
    renderComponent(0, 0);
    expect(screen.getByRole('button', { name: /migrar/i })).toBeDisabled();
  });

  it('enables the Migrar button when there is a selection', () => {
    renderComponent(1, 0);
    expect(screen.getByRole('button', { name: /migrar/i })).not.toBeDisabled();
  });

  it('calls onMigrate when button is clicked', () => {
    const onMigrate = vi.fn();
    renderComponent(1, 1, onMigrate);
    fireEvent.click(screen.getByRole('button', { name: /migrar/i }));
    expect(onMigrate).toHaveBeenCalledOnce();
  });
});
