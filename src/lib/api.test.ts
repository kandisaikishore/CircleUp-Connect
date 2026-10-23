// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest } from './api';

afterEach(() => vi.unstubAllGlobals());

describe('apiRequest', () => {
  it('uses the same-origin API path and parses successful JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ posts: [] }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest<{ posts: unknown[] }>('/posts')).resolves.toEqual({ posts: [] });
    expect(fetchMock).toHaveBeenCalledWith('/api/posts', expect.objectContaining({
      headers: expect.objectContaining({ Accept: 'application/json' })
    }));
  });

  it.each([
    [400, 'Invalid input'],
    [401, 'Sign in to continue'],
    [403, 'Forbidden'],
    [404, 'Route not found'],
    [500, 'Unexpected server error']
  ])('surfaces HTTP %s API errors', async (status, message) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: message }), {
      status, headers: { 'Content-Type': 'application/json' }
    })));

    await expect(apiRequest('/protected')).rejects.toMatchObject({
      name: 'ApiError', status, message
    });
  });

  it('uses a fallback message for non-JSON server errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not json', { status: 502 })));
    await expect(apiRequest('/unavailable')).rejects.toMatchObject({
      name: 'ApiError', status: 502, message: 'Request failed with status 502'
    });
  });

  it('passes request body and caller headers through', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await apiRequest('/posts', {
      method: 'POST', body: JSON.stringify({ body: 'hello' }),
      headers: { Authorization: 'Bearer test-token' }
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/posts', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      })
    }));
  });

  it('exports a typed ApiError class', () => {
    const error = new ApiError('No access', 403);
    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(403);
  });
});
