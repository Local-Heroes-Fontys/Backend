import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as parentsRepository from '../src/repositories/parents.repository';
import { registerParent } from '../src/services/parents.service';

// Unit tests for the service's decisions. The repository is mocked, so no database query runs.
vi.mock('../src/repositories/parents.repository');

beforeEach(() => {
  vi.resetAllMocks();
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
