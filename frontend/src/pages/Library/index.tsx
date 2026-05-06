import { useState } from 'react';
import { Tabs, TabPanel } from '@/components/Library';
import { SelectionSummary } from '@/components/Library/SelectionSummary';
import type { TabDef } from '@/components/Library';
import { useAppSection } from '@/hooks/useAppSection';
import { useSelection } from '@/features/library';
import { useMigrationSelection } from '@/features/migrate';
import { usePlaylists } from '@/features/library/usePlaylists';
import { useAlbums } from '@/features/library/useAlbums';
import { Playlists } from './Playlists';
import { Albums } from './Albums';

const TABS: TabDef[] = [
  { id: 'playlists', label: 'Playlists' },
  { id: 'albums', label: 'Álbumes' },
];

export function LibraryPage() {
  const [activeTab, setActiveTab] = useState('playlists');
  const { setSection } = useAppSection();

  const { data: playlists = [] } = usePlaylists();
  const { data: albums = [] } = useAlbums();

  const playlistSelection = useSelection(playlists, (p) => p.id);
  const albumSelection = useSelection(albums, (a) => a.spotifyId);

  const migration = useMigrationSelection(playlistSelection.selectedIds, albumSelection.selectedIds);

  return (
    <section aria-labelledby="library-heading" className="p-4 sm:p-6 pb-20">
      <h2 id="library-heading" className="mb-4 text-xl font-semibold text-gray-900">
        Biblioteca
      </h2>
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab}>
        <TabPanel id="panel-playlists" labelledBy="tab-playlists" active={activeTab === 'playlists'}>
          <Playlists
            selectedIds={playlistSelection.selectedIds}
            onToggle={playlistSelection.toggle}
            onToggleAll={playlistSelection.toggleAll}
            selectionState={playlistSelection.selectionState}
          />
        </TabPanel>
        <TabPanel id="panel-albums" labelledBy="tab-albums" active={activeTab === 'albums'}>
          <Albums
            selectedIds={albumSelection.selectedIds}
            onToggle={albumSelection.toggle}
            onToggleAll={albumSelection.toggleAll}
            selectionState={albumSelection.selectionState}
          />
        </TabPanel>
      </Tabs>
      <SelectionSummary
        playlistCount={migration.playlistCount}
        albumCount={migration.albumCount}
        onMigrate={() => setSection('migrate')}
      />
    </section>
  );
}
