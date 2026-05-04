import type {
  Album,
  MigrationEvent,
  MigrationReport,
  PlaylistSummary,
} from '@/types/api';

export const samplePlaylists: PlaylistSummary[] = [
  {
    id: 'pl_own_1',
    name: 'Mis favoritos 2025',
    description: 'Lo más escuchado del año',
    trackCount: 42,
    ownerId: 'user_self',
    isOwn: true,
  },
  {
    id: 'pl_own_2',
    name: 'Para entrenar',
    description: '',
    trackCount: 18,
    ownerId: 'user_self',
    isOwn: true,
  },
  {
    id: 'pl_collab_1',
    name: 'Discover Weekly',
    description: 'Tu mezcla semanal',
    trackCount: 30,
    ownerId: 'spotify',
    isOwn: false,
  },
];

export const sampleAlbums: Album[] = [
  { name: 'In Rainbows', artist: 'Radiohead', spotifyId: 'alb_1' },
  { name: 'Random Access Memories', artist: 'Daft Punk', spotifyId: 'alb_2' },
  { name: 'Currents', artist: 'Tame Impala', spotifyId: 'alb_3' },
];

export const sampleReport: MigrationReport = {
  id: 'rep_1',
  playlists: [
    {
      name: 'Mis favoritos 2025',
      total: 42,
      found: 40,
      ytPlaylistId: 'PL_yt_abc',
    },
  ],
  albums: [{ label: 'Radiohead - In Rainbows', status: 'saved' }],
  notFound: [
    { context: 'Mis favoritos 2025', item: 'Artista oscuro - Pista rara' },
    { context: 'Mis favoritos 2025', item: 'Otro - Pista' },
  ],
};

export const sampleReportsList: MigrationReport[] = [sampleReport];

export const sampleEvents: MigrationEvent[] = [
  { type: 'PlaylistsDiscovered', count: 2 },
  { type: 'PlaylistStarted', name: 'Mis favoritos 2025', trackCount: 42 },
  {
    type: 'PlaylistFinished',
    name: 'Mis favoritos 2025',
    found: 40,
    total: 42,
    notFoundLabels: ['Artista oscuro - Pista rara', 'Otro - Pista'],
  },
  { type: 'AlbumsDiscovered', count: 1 },
  {
    type: 'AlbumProcessed',
    label: 'Radiohead - In Rainbows',
    status: 'saved',
  },
];
