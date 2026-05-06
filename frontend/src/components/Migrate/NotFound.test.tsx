import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotFound } from './NotFound';

describe('NotFound', () => {
  it('returns null when labels array is empty', () => {
    const { container } = render(<NotFound labels={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders collapse panel with count when labels exist', () => {
    render(<NotFound labels={['Song A', 'Song B']} />);

    expect(screen.getByText('No encontradas (2)')).toBeDefined();
  });

  it('expands on click to show labels', () => {
    render(<NotFound labels={['Song A', 'Song B']} />);

    expect(screen.queryByText('Song A')).toBeNull();

    fireEvent.click(screen.getByText('No encontradas (2)'));

    expect(screen.getByText('Song A')).toBeDefined();
    expect(screen.getByText('Song B')).toBeDefined();
  });

  it('renders all labels when expanded', () => {
    render(<NotFound labels={['Song A', 'Song B', 'Song C']} />);

    fireEvent.click(screen.getByText('No encontradas (3)'));

    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });
});