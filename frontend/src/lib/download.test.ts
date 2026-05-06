import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { downloadJson } from './download';

describe('downloadJson', () => {
  let createElementSpy: ReturnType<typeof vi.spyOn>;
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    createElementSpy = vi.spyOn(document, 'createElement');
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a blob URL and triggers download', () => {
    const data = { foo: 'bar' };

    downloadJson('test-report', data);

    expect(createObjectURLSpy).toHaveBeenCalledWith(
      expect.any(Blob),
    );

    const blob = createObjectURLSpy.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('application/json');

    const link = createElementSpy.mock.results[0].value as HTMLAnchorElement;
    expect(link.download).toBe('test-report.json');
    expect(link.href).toBe('blob:mock-url');
  });

  it('appends .json extension if not present', () => {
    downloadJson('my-report', { ok: true });

    const link = createElementSpy.mock.results[0].value as HTMLAnchorElement;
    expect(link.download).toBe('my-report.json');
  });

  it('does not double .json extension', () => {
    downloadJson('my-report.json', { ok: true });

    const link = createElementSpy.mock.results[0].value as HTMLAnchorElement;
    expect(link.download).toBe('my-report.json');
  });

  it('revokes the object URL after download', () => {
    downloadJson('test', { ok: true });

    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
  });

  it('removes the link from the DOM after click', () => {
    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    const removeChildSpy = vi.spyOn(document.body, 'removeChild');

    downloadJson('test', { ok: true });

    const link = createElementSpy.mock.results[0].value as HTMLAnchorElement;
    expect(appendChildSpy).toHaveBeenCalledWith(link);
    expect(removeChildSpy).toHaveBeenCalledWith(link);
  });
});
