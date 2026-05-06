import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { Tabs, TabPanel } from './Tabs';
import type { TabDef } from './Tabs';

const tabs: TabDef[] = [
  { id: 'playlists', label: 'Playlists' },
  { id: 'albums', label: 'Álbumes' },
];

function ControlledTabs() {
  const [active, setActive] = useState('playlists');
  return (
    <Tabs tabs={tabs} activeTab={active} onTabChange={setActive}>
      <TabPanel id="panel-playlists" labelledBy="tab-playlists" active={active === 'playlists'}>
        Contenido Playlists
      </TabPanel>
      <TabPanel id="panel-albums" labelledBy="tab-albums" active={active === 'albums'}>
        Contenido Álbumes
      </TabPanel>
    </Tabs>
  );
}

describe('Tabs', () => {
  it('renders all tab buttons', () => {
    render(<ControlledTabs />);
    expect(screen.getByRole('tab', { name: 'Playlists' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Álbumes' })).toBeInTheDocument();
  });

  it('first tab is aria-selected by default', () => {
    render(<ControlledTabs />);
    expect(screen.getByRole('tab', { name: 'Playlists' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Álbumes' })).toHaveAttribute('aria-selected', 'false');
  });

  it('clicking a tab changes aria-selected', () => {
    render(<ControlledTabs />);
    fireEvent.click(screen.getByRole('tab', { name: 'Álbumes' }));
    expect(screen.getByRole('tab', { name: 'Álbumes' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Playlists' })).toHaveAttribute('aria-selected', 'false');
  });

  it('ArrowRight moves to the next tab', () => {
    render(<ControlledTabs />);
    const tablist = screen.getByRole('tablist');
    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Álbumes' })).toHaveAttribute('aria-selected', 'true');
  });

  it('ArrowLeft wraps to the last tab from the first', () => {
    render(<ControlledTabs />);
    const tablist = screen.getByRole('tablist');
    fireEvent.keyDown(tablist, { key: 'ArrowLeft' });
    expect(screen.getByRole('tab', { name: 'Álbumes' })).toHaveAttribute('aria-selected', 'true');
  });

  it('shows only the active panel content', () => {
    render(<ControlledTabs />);
    expect(screen.getByText('Contenido Playlists')).toBeVisible();
    expect(screen.getByText('Contenido Álbumes')).not.toBeVisible();
  });
});
