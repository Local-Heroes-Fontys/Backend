import { scryptSync } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as parentsRepository from '../src/repositories/parents.repository';
import { hashPassword, registerParent, verifyPassword } from '../src/services/parents.service';

// Unit tests for the password format and the service's decisions. The repository is mocked, so no
// database query runs.
vi.mock('../src/repositories/parents.repository');

beforeEach(() => {
  vi.resetAllMocks();
});

describe('passwords', () => {
  it('accepts the right password and refuses a wrong one', async () => {
    const stored = await hashPassword('geheim123');

    expect(await verifyPassword('geheim123', stored)).toBe(true);
    expect(await verifyPassword('geheim124', stored)).toBe(false);
  });

  it('gives the salt to scrypt as bytes, not as hex text', async () => {
    const [, N, r, p, salt, hash] = (await hashPassword('geheim123')).split('$');
    const options = { N: Number(N), r: Number(r), p: Number(p) };

    const expected = scryptSync('geheim123', Buffer.from(salt!, 'hex'), 64, options);
    expect(hash).toBe(expected.toString('hex'));
  });

  it.each([8192, 32768])('uses the stored settings (N = %i), not the current ones', async (N) => {
    const salt = Buffer.alloc(16, 7);
    const options = { N, r: 8, p: 1, maxmem: 256 * N * 8 };
    const hash = scryptSync('geheim123', salt, 64, options).toString('hex');
    const stored = ['scrypt', N, 8, 1, salt.toString('hex'), hash].join('$');

    expect(await verifyPassword('geheim123', stored)).toBe(true);
  });

  it.each([
    '',
    'salt:hash',
    'scrypt$16384$8$1$$',
    `scrypt$16384$8$1$${'a'.repeat(32)}$`,
    // N must be a power of 2, so scrypt cannot use these settings.
    `scrypt$3$8$1$${'a'.repeat(32)}$${'b'.repeat(128)}`,
  ])('refuses the malformed hash "%s"', async (stored) => {
    expect(await verifyPassword('geheim123', stored)).toBe(false);
  });
});

describe('registerParent', () => {
  it('gives 409 when the repository reports a duplicate email', async () => {
    vi.mocked(parentsRepository.findParentByEmail).mockResolvedValue(null);
    vi.mocked(parentsRepository.createParent).mockResolvedValue(null);

    await expect(
      registerParent({ email: 'ouder@example.com', password: 'geheim123' }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});
