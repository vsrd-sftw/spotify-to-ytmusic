import { render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it } from 'vitest';
import { useFocusTrap } from './useFocusTrap';

function TrapTestComponent({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, active);

  return (
    <div ref={ref} data-testid="trap">
      <button type="button">First</button>
      <input type="text" aria-label="Middle" />
      <button type="button">Last</button>
    </div>
  );
}

describe('useFocusTrap', () => {
  it('focuses first focusable element when activated', () => {
    render(<TrapTestComponent active />);

    expect(document.activeElement).toHaveTextContent('First');
  });

  it('does not focus elements when inactive', () => {
    const previousActive = document.activeElement;
    render(<TrapTestComponent active={false} />);

    expect(document.activeElement).toBe(previousActive);
  });

  it('wraps focus forward with Tab', () => {
    render(<TrapTestComponent active />);

    const lastButton = screen.getByText('Last');
    lastButton.focus();

    const event = new KeyboardEvent('keydown', { key: 'Tab' });
    screen.getByTestId('trap').dispatchEvent(event);

    expect(document.activeElement).toHaveTextContent('First');
  });

  it('wraps focus backward with Shift+Tab', () => {
    render(<TrapTestComponent active />);

    const firstButton = screen.getByText('First');
    firstButton.focus();

    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true });
    screen.getByTestId('trap').dispatchEvent(event);

    expect(document.activeElement).toHaveTextContent('Last');
  });

  it('restores focus to previous element on cleanup', () => {
    const container = document.createElement('div');
    container.tabIndex = -1;
    document.body.appendChild(container);
    container.focus();

    const { unmount } = render(<TrapTestComponent active />);

    unmount();

    expect(document.activeElement).toBe(container);
    document.body.removeChild(container);
  });
});
