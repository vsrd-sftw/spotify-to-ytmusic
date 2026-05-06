export interface Track {
  name: string;
  artist: string;
  album: string;
  durationMs: number;
  spotifyId: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  tracks: Track[];
}

export interface PlaylistSummary {
  id: string;
  name: string;
  description: string;
  trackCount: number;
  ownerId: string;
  isOwn: boolean;
}

export interface Album {
  name: string;
  artist: string;
  spotifyId: string;
}

export interface PlaylistMigrationResult {
  name: string;
  total: number;
  found: number;
  ytPlaylistId: string | null;
}

export type AlbumStatus = 'saved' | 'found (not saved)' | 'not found';

export interface AlbumMigrationResult {
  label: string;
  status: AlbumStatus;
}

export interface MissingItem {
  context: string;
  item: string;
}

export interface MigrationReport {
  id?: string;
  playlists: PlaylistMigrationResult[];
  albums: AlbumMigrationResult[];
  notFound: MissingItem[];
}

export interface PlaylistsDiscoveredEvent {
  type: 'PlaylistsDiscovered';
  count: number;
}

export interface PlaylistStartedEvent {
  type: 'PlaylistStarted';
  name: string;
  trackCount: number;
}

export interface PlaylistFinishedEvent {
  type: 'PlaylistFinished';
  name: string;
  found: number;
  total: number;
  notFoundLabels: string[];
}

export interface AlbumsDiscoveredEvent {
  type: 'AlbumsDiscovered';
  count: number;
}

export interface AlbumProcessedEvent {
  type: 'AlbumProcessed';
  label: string;
  status: AlbumStatus;
}

export interface PlaylistCreationFailedEvent {
  type: 'PlaylistCreationFailed';
  name: string;
  reason: string;
}

export interface PlaylistChunkFailedEvent {
  type: 'PlaylistChunkFailed';
  name: string;
  chunkIndex: number;
  totalChunks: number;
  reason: string;
}

export interface AlbumSaveFailedEvent {
  type: 'AlbumSaveFailed';
  label: string;
  reason: string;
}

export interface MigrationFinishedEvent {
  type: 'MigrationFinished';
  reportId: string;
}

export interface HealthResponse {
  ok: boolean;
  spotify?: boolean;
  ytmusic?: boolean;
}

export type MigrationEvent =
  | PlaylistsDiscoveredEvent
  | PlaylistStartedEvent
  | PlaylistFinishedEvent
  | AlbumsDiscoveredEvent
  | AlbumProcessedEvent
  | PlaylistCreationFailedEvent
  | PlaylistChunkFailedEvent
  | AlbumSaveFailedEvent
  | MigrationFinishedEvent;
