import { afterEach, describe, expect, it, vi } from 'vitest';

import { HttpError } from '@/shared/data/http-error';

import { videoApi } from './video.api';

/**
 * The upload path hand-rolls XHR (only XHR reports progress), so it parses the
 * response envelope itself rather than going through ApiClient. These cover
 * that second parse site.
 */
class FakeXhr {
  static instance: FakeXhr;
  status = 200;
  responseText = '';
  upload = { onprogress: null as ((e: ProgressEvent) => void) | null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  open = vi.fn();
  setRequestHeader = vi.fn();
  send = vi.fn();

  constructor() {
    FakeXhr.instance = this;
  }
}

function stubXhr(): typeof FakeXhr {
  vi.stubGlobal('XMLHttpRequest', FakeXhr);
  return FakeXhr;
}

const file = { title: 'clip', file: new File(['x'], 'c.mp4', { type: 'video/mp4' }) };

describe('videoApi.upload', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('unwraps the success envelope', async () => {
    stubXhr();
    const promise = videoApi.upload(file);

    FakeXhr.instance.status = 201;
    FakeXhr.instance.responseText = JSON.stringify({
      success: true,
      data: { id: 'vid-1', status: 'processing' },
    });
    FakeXhr.instance.onload?.();

    await expect(promise).resolves.toEqual({ id: 'vid-1', status: 'processing' });
  });

  it('surfaces the server error code and message on a non-2xx', async () => {
    stubXhr();
    const promise = videoApi.upload(file);

    FakeXhr.instance.status = 402;
    FakeXhr.instance.responseText = JSON.stringify({
      success: false,
      error: { code: 'INSUFFICIENT_CREDITS', message: 'Not enough credits' },
    });
    FakeXhr.instance.onload?.();

    await expect(promise).rejects.toMatchObject({
      status: 402,
      code: 'INSUFFICIENT_CREDITS',
      message: 'Not enough credits',
    });
  });

  it('falls back when the error body carries no error object', async () => {
    stubXhr();
    const promise = videoApi.upload(file);

    FakeXhr.instance.status = 500;
    FakeXhr.instance.responseText = JSON.stringify({});
    FakeXhr.instance.onload?.();

    await expect(promise).rejects.toMatchObject({ status: 500, code: 'ERROR' });
  });

  it('rejects with an HttpError on unparseable bodies', async () => {
    stubXhr();
    const promise = videoApi.upload(file);

    FakeXhr.instance.status = 502;
    FakeXhr.instance.responseText = '<html>gateway</html>';
    FakeXhr.instance.onload?.();

    await expect(promise).rejects.toBeInstanceOf(HttpError);
  });

  it('reports progress percentages', async () => {
    stubXhr();
    const onProgress = vi.fn();
    const promise = videoApi.upload(file, onProgress);

    FakeXhr.instance.upload.onprogress?.({
      lengthComputable: true,
      loaded: 30,
      total: 120,
    } as ProgressEvent);
    expect(onProgress).toHaveBeenCalledWith(25);

    // Not computable → no callback, rather than a NaN percentage.
    FakeXhr.instance.upload.onprogress?.({ lengthComputable: false } as ProgressEvent);
    expect(onProgress).toHaveBeenCalledTimes(1);

    FakeXhr.instance.status = 201;
    FakeXhr.instance.responseText = JSON.stringify({ success: true, data: { id: 'v' } });
    FakeXhr.instance.onload?.();
    await promise;
  });
});
