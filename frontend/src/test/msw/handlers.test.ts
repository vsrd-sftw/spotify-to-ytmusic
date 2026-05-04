import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './server';
import type {
  Album,
  MigrationReport,
  PlaylistSummary,
} from '@/types/api';

describe('MSW handlers', () => {
  it('GET /api/health returns { ok: true }', async () => {
    const res = await fetch('http://localhost/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('GET /api/playlists returns PlaylistSummary[]', async () => {
    const res = await fetch('http://localhost/api/playlists');
    const data = (await res.json()) as PlaylistSummary[];
    expect(Array.isArray(data)).toBe(true);
    expect(data[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      trackCount: expect.any(Number),
      isOwn: expect.any(Boolean),
    });
  });

  it('GET /api/albums returns Album[]', async () => {
    const res = await fetch('http://localhost/api/albums');
    const data = (await res.json()) as Album[];
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toMatchObject({
      name: expect.any(String),
      artist: expect.any(String),
      spotifyId: expect.any(String),
    });
  });

  it('POST /api/migrate returns a jobId with status 201', async () => {
    const res = await fetch('http://localhost/api/migrate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ allPlaylists: true }),
    });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ jobId: expect.any(String) });
  });

  it('GET /api/reports/:id echoes the requested id', async () => {
    const res = await fetch('http://localhost/api/reports/rep_abc');
    const report = (await res.json()) as MigrationReport;
    expect(report.id).toBe('rep_abc');
    expect(Array.isArray(report.playlists)).toBe(true);
    expect(Array.isArray(report.albums)).toBe(true);
    expect(Array.isArray(report.notFound)).toBe(true);
  });

  it('handlers can be overridden in tests via server.use', async () => {
    server.use(
      http.get('*/api/health', () =>
        HttpResponse.json({ ok: false }),
      ),
    );
    const res = await fetch('http://localhost/api/health');
    expect(await res.json()).toEqual({ ok: false });
  });
});
