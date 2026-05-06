export type {
  paths,
  components,
  operations,
} from './api.gen';

import type { components } from './api.gen';

export type HealthResponse = components['schemas']['HealthResponse'];
export type AuthUrlResponse = components['schemas']['AuthUrlResponse'];
export type OkResponse = components['schemas']['OkResponse'];
export type ErrorResponse = components['schemas']['ErrorResponse'];
export type PlaylistSummaryResponse = components['schemas']['PlaylistSummaryResponse'];
export type AlbumResponse = components['schemas']['AlbumResponse'];
export type PlaylistMigrationResultResponse = components['schemas']['PlaylistMigrationResultResponse'];
export type AlbumMigrationResultResponse = components['schemas']['AlbumMigrationResultResponse'];
export type MissingItemResponse = components['schemas']['MissingItemResponse'];
export type ReportSummaryResponse = components['schemas']['ReportSummaryResponse'];
export type ReportDetailResponse = components['schemas']['ReportDetailResponse'];
export type MigrateRequest = components['schemas']['MigrateRequest'];
export type MigrateResponse = components['schemas']['MigrateResponse'];
export type HTTPValidationError = components['schemas']['HTTPValidationError'];
export type ValidationError = components['schemas']['ValidationError'];

export type AlbumStatus = 'saved' | 'found (not saved)' | 'not found';

export type PlaylistSummary = components['schemas']['PlaylistSummaryResponse'];
export type Album = components['schemas']['AlbumResponse'];

export interface MigrationReport {
  id?: string;
  playlists: PlaylistMigrationResultResponse[];
  albums: AlbumMigrationResultResponse[];
  notFound: MissingItemResponse[];
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
