import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as activitiesRepository from '../src/repositories/activities.repository';
import * as sportsRepository from '../src/repositories/sports.repository';
import * as activitiesService from '../src/services/activities.service';

// Unit tests for the business rules in the service. The repositories are replaced by mocks, so
// these tests are fast and check only the decisions the service makes, not the database.
vi.mock('../src/repositories/activities.repository');
vi.mock('../src/repositories/sports.repository');

const representative = { id: 1, clubId: 10 };

const input = {
  name: 'Judoles',
  description: 'Judo voor beginners.',
  sportId: 5,
  minAge: 6,
  maxAge: 9,
  setting: 'INDOOR' as const,
  weekday: 'MONDAY' as const,
  startTime: '18:00',
  endTime: '19:00',
  location: 'Sporthal Woensel',
  costItems: [],
};

// The smallest record the repository could return; only the fields the tests need matter.
const record = {
  ...input,
  id: 3,
  clubId: 10,
  sport: { id: 5, name: 'Judo' },
  club: {
    id: 10,
    name: 'Club',
    address: 'Straat 1',
    contactName: 'Contact',
    contactPhone: '040 123 4567',
    contactEmail: 'a@b.nl',
  },
  costItems: [],
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
} as unknown as activitiesRepository.ActivityWithRelations;

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(sportsRepository.findSportById).mockResolvedValue({ id: 5, name: 'Judo' });
});

describe('createActivity', () => {
  it("saves the activity under the representative's club", async () => {
    vi.mocked(activitiesRepository.createActivity).mockResolvedValue(record);

    await activitiesService.createActivity(input, representative);

    expect(activitiesRepository.createActivity).toHaveBeenCalledWith(10, input);
  });

  it('refuses an unknown sport without saving anything', async () => {
    vi.mocked(sportsRepository.findSportById).mockResolvedValue(null);

    await expect(activitiesService.createActivity(input, representative)).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(activitiesRepository.createActivity).not.toHaveBeenCalled();
  });
});

describe('updateActivity and deleteActivity', () => {
  it('only updates when the id AND the club match', async () => {
    vi.mocked(activitiesRepository.updateOwnActivity).mockResolvedValue(record);

    await activitiesService.updateActivity(3, input, representative);

    expect(activitiesRepository.updateOwnActivity).toHaveBeenCalledWith(3, 10, input);
  });

  it('returns 403 when nothing matched but the activity exists (another club)', async () => {
    vi.mocked(activitiesRepository.deleteOwnActivity).mockResolvedValue(false);
    vi.mocked(activitiesRepository.findActivityById).mockResolvedValue(record);

    await expect(activitiesService.deleteActivity(3, representative)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('returns 404 when nothing matched and the activity does not exist', async () => {
    vi.mocked(activitiesRepository.updateOwnActivity).mockResolvedValue(null);
    vi.mocked(activitiesRepository.findActivityById).mockResolvedValue(null);

    await expect(activitiesService.updateActivity(3, input, representative)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
