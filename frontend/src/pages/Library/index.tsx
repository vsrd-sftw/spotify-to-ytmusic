import { useState } from 'react';
import { Tabs, TabPanel } from '@/components/Library';
import type { TabDef } from '@/components/Library';
import { Playlists } from './Playlists';

const TABS: TabDef[] = [
  { id: 'playlists', label: 'Playlists' },
  { id: 'albums', label: 'Álbumes' },
];

export function LibraryPage() {
  const [activeTab, setActiveTab] = useState('playlists');

  return (
    <section aria-labelledby="library-heading" className="p-4">
      <h2 id="library-heading" className="mb-4 text-xl font-semibold text-gray-900">
        Biblioteca
      </h2>
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab}>
        <TabPanel id="panel-playlists" labelledBy="tab-playlists" active={activeTab === 'playlists'}>
          <Playlists />
        </TabPanel>
        <TabPanel id="panel-albums" labelledBy="tab-albums" active={activeTab === 'albums'}>
          <div />
        </TabPanel>
      </Tabs>
    </section>
  );
}
