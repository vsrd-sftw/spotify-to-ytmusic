import { describe, expect, it } from 'vitest';
import { http as mswHttp, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { http, HttpError } from './http';

describe('http client', () => {
  it('GET resolves parsed JSON on 200', async () => {
    server.use(
      mswHttp.get('*/api/ping', () => HttpResponse.json({ ok: true })),
    );
    const data = await http.get<{ ok: boolean }>('/ping');
    expect(data).toEqual({ ok: true });
  });

  it('throws HttpError on 500 with status and body', async () => {
    server.use(
      mswHttp.get('*/api/boom', () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 }),
      ),
    );
    await expect(http.get('/boom')).rejects.toBeInstanceOf(HttpError);
    await expect(http.get('/boom')).rejects.toMatchObject({
      status: 500,
      body: { error: 'boom' },
    });
  });

  it('propagates network errors (not as HttpError)', async () => {
    server.use(mswHttp.get('*/api/dead', () => HttpResponse.error()));
    await expect(http.get('/dead')).rejects.toThrow();
    await expect(http.get('/dead')).rejects.not.toBeInstanceOf(HttpError);
  });

  it('POST sends JSON body and parses response', async () => {
    server.use(
      mswHttp.post('*/api/echo', async ({ request }) => {
        const body = (await request.json()) as { hello: string };
        return HttpResponse.json({ got: body.hello }, { status: 201 });
      }),
    );
    const data = await http.post<{ got: string }>('/echo', { hello: 'world' });
    expect(data).toEqual({ got: 'world' });
  });
});
