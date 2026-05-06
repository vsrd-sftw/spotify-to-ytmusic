import { describe, expect, it } from 'vitest';
import { useMigrationSelection } from './useMigrationSelection';

describe('useMigrationSelection', () => {
  it('returns isEmpty true and zero counts when both sets are empty', () => {
    const result = useMigrationSelection(new Set(), new Set());
    expect(result.isEmpty).toBe(true);
    expect(result.total).toBe(0);
    expect(result.playlistCount).toBe(0);
    expect(result.albumCount).toBe(0);
  });

  it('counts playlists correctly', () => {
    const result = useMigrationSelection(new Set(['pl_1', 'pl_2']), new Set());
    expect(result.playlistCount).toBe(2);
    expect(result.albumCount).toBe(0);
    expect(result.total).toBe(2);
    expect(result.isEmpty).toBe(false);
  });

  it('counts albums correctly', () => {
    const result = useMigrationSelection(new Set(), new Set(['alb_1']));
    expect(result.playlistCount).toBe(0);
    expect(result.albumCount).toBe(1);
    expect(result.total).toBe(1);
    expect(result.isEmpty).toBe(false);
  });

  it('sums both when both have selections', () => {
    const result = useMigrationSelection(new Set(['pl_1']), new Set(['alb_1', 'alb_2']));
    expect(result.total).toBe(3);
    expect(result.isEmpty).toBe(false);
  });

  it('passes through the sets by reference', () => {
    const playlists = new Set(['pl_1']);
    const albums = new Set(['alb_1']);
    const result = useMigrationSelection(playlists, albums);
    expect(result.selectedPlaylistIds).toBe(playlists);
    expect(result.selectedAlbumIds).toBe(albums);
  });
});
