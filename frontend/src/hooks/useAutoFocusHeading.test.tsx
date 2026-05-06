import { describe, expect, it } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { useAutoFocusHeading } from './useAutoFocusHeading';

function Page({ branch }: { branch: 'a' | 'b' }) {
  const ref = useAutoFocusHeading<HTMLHeadingElement>([branch]);
  return (
    <h2 ref={ref} tabIndex={-1} data-testid={`heading-${branch}`}>
      Branch {branch}
    </h2>
  );
}

function PageSwitcher() {
  const [branch, setBranch] = useState<'a' | 'b'>('a');
  return (
    <>
      <button data-testid="switch" onClick={() => setBranch((b) => (b === 'a' ? 'b' : 'a'))}>
        switch
      </button>
      <Page branch={branch} />
    </>
  );
}

describe('useAutoFocusHeading', () => {
  it('focuses the heading on mount', () => {
    const { getByTestId } = render(<Page branch="a" />);
    expect(document.activeElement).toBe(getByTestId('heading-a'));
  });

  it('refocuses when deps change', () => {
    const { getByTestId } = render(<PageSwitcher />);
    expect(document.activeElement).toBe(getByTestId('heading-a'));
    fireEvent.click(getByTestId('switch'));
    expect(document.activeElement).toBe(getByTestId('heading-b'));
  });
});
