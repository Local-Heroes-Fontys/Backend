import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { app } from '../src/app';
import { pool } from '../src/db/pool';

vi.mock('../src/db/pool', () => ({
  pool: { query: vi.fn() },
}));

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.mocked(pool.query).mockReset();
  });

  it('returns 200 when the database is reachable', async () => {
    vi.mocked(pool.query).mockResolvedValue([[], []]);

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', database: 'up' });
  });

  it('returns 503 when the database is unreachable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(pool.query).mockRejectedValue(new Error('connection refused'));

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'degraded', database: 'down' });
  });
});

describe('unknown routes', () => {
  it('returns a JSON 404', async () => {
    const res = await request(app).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.error.message).toContain('/api/does-not-exist');
  });
});
