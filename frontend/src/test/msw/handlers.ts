import { http, HttpResponse, ws } from 'msw';
import {
  sampleAlbums,
  samplePlaylists,
  sampleReport,
  sampleReportsList,
  sampleEvents,
} from './fixtures';

const migrationEvents = ws.link('*/api/migrate/:jobId/events');

export const handlers = [
  http.get('*/api/health', () => HttpResponse.json({ ok: true })),

  http.post('*/api/auth/spotify', () =>
    HttpResponse.json({ url: 'http://127.0.0.1:8888/auth/spotify' }),
  ),

  http.post('*/api/auth/ytmusic', () => HttpResponse.json({ ok: true })),

  http.get('*/api/playlists', () => HttpResponse.json(samplePlaylists)),

  http.get('*/api/albums', () => HttpResponse.json(sampleAlbums)),

  http.post('*/api/migrate', () =>
    HttpResponse.json({ jobId: 'job-stub-1' }, { status: 201 }),
  ),

  http.get('*/api/reports', () => HttpResponse.json(sampleReportsList)),

  http.get('*/api/reports/:id', ({ params }) =>
    HttpResponse.json({ ...sampleReport, id: params.id as string }),
  ),

  migrationEvents.addEventListener('connection', ({ client }) => {
    let i = 0;
    const interval = setInterval(() => {
      if (i >= sampleEvents.length) {
        clearInterval(interval);
        client.close();
        return;
      }
      client.send(JSON.stringify(sampleEvents[i++]));
    }, 50);
  }),
];

export const spotifyAuthErrorHandler = http.post(
  '*/api/auth/spotify',
  () => HttpResponse.json({ message: 'Error de configuración' }, { status: 500 }),
);
