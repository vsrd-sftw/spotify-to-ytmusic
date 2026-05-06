import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompletionSummary } from './CompletionSummary';

describe('CompletionSummary', () => {
  it('renders summary card with track and album counts', () => {
    render(
      <CompletionSummary
        tracksFound={80}
        tracksTotal={100}
        albumsFound={5}
        albumsTotal={10}
        notFoundCount={5}
        onViewReport={() => {}}
      />,
    );

    expect(screen.getByText('Migration Completada')).toBeDefined();
    expect(screen.getByText('Pistas: 80 / 100')).toBeDefined();
    expect(screen.getByText('Álbumes: 5 / 10')).toBeDefined();
    expect(screen.getByText('No encontrados: 5')).toBeDefined();
  });

  it('does not render not found count when zero', () => {
    render(
      <CompletionSummary
        tracksFound={100}
        tracksTotal={100}
        albumsFound={10}
        albumsTotal={10}
        notFoundCount={0}
        onViewReport={() => {}}
      />,
    );

    expect(screen.queryByText('No encontrados: 0')).toBeNull();
  });

  it('calls onViewReport when button is clicked', () => {
    const onViewReport = vi.fn();
    render(
      <CompletionSummary
        tracksFound={50}
        tracksTotal={50}
        albumsFound={5}
        albumsTotal={5}
        notFoundCount={0}
        onViewReport={onViewReport}
      />,
    );

    fireEvent.click(screen.getByText('Ver report'));
    expect(onViewReport).toHaveBeenCalledTimes(1);
  });
});