import { describe, expect, it } from 'bun:test';
import { ApiError, CommissionSightClient, query } from '../src/index.js';

describe('sdk query builder', () => {
  it('serializes defined params and skips empties', () => {
    expect(query({ a: 1, b: undefined, c: '', d: 'x' })).toBe('?a=1&d=x');
    expect(query({})).toBe('');
  });
});

describe('CommissionSightClient', () => {
  function mockFetch(status: number, body: unknown): typeof fetch {
    return (async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      })) as unknown as typeof fetch;
  }

  it('sends the bearer token and parses JSON', async () => {
    let seenAuth: string | null = null;
    const fetchFn = (async (_url: string, init: RequestInit) => {
      seenAuth = new Headers(init.headers).get('authorization');
      return new Response(JSON.stringify({ data: [{ id: 'c1', name: 'Acme', slug: 'acme' }] }), {
        status: 200,
      });
    }) as unknown as typeof fetch;
    const client = new CommissionSightClient({
      baseUrl: 'http://x/v1',
      token: 'tok',
      fetch: fetchFn,
    });
    const res = await client.listCarriers();
    expect(seenAuth).toBe('Bearer tok');
    expect(res.data[0]?.slug).toBe('acme');
  });

  it('throws ApiError with problem title on non-2xx', async () => {
    const client = new CommissionSightClient({
      baseUrl: 'http://x/v1',
      fetch: mockFetch(404, { title: 'Not found', status: 404 }),
    });
    await expect(client.getJob('nope')).rejects.toBeInstanceOf(ApiError);
  });
});
