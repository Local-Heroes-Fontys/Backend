import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { app } from '../src/app';
import { prisma } from '../src/db/prisma';
import { createRepresentativeToken } from '../src/services/auth.service';

// These tests use the real test database (local_heroes_test), because what we want to prove
// (saving, filtering, cascading deletes) happens in the database.

let sportId: number;
let ownToken: string;
let otherToken: string;

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Voetbaltraining O10',
    description: 'Wekelijkse training voor kinderen tot 10 jaar.',
    sportId,
    minAge: 8,
    maxAge: 10,
    setting: 'OUTDOOR',
    weekday: 'WEDNESDAY',
    startTime: '17:00',
    endTime: '18:30',
    location: 'Sportpark Eindhoven Noord',
    costItems: [
      { type: 'MEMBERSHIP', amount: '15.50', frequency: 'MONTHLY' },
      { type: 'REGISTRATION', amount: 25, frequency: 'ONCE' },
    ],
    ...overrides,
  };
}

async function createClubWithRepresentative(name: string) {
  const club = await prisma.sportsClub.create({
    data: {
      name,
      address: 'Teststraat 1, Eindhoven',
      email: `info@${name.toLowerCase()}.nl`,
      representatives: { create: { name: 'Rep', email: `rep@${name.toLowerCase()}.nl` } },
    },
    include: { representatives: true },
  });
  return { club, token: createRepresentativeToken(club.representatives[0].id) };
}

async function createActivityAs(token: string, overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post('/api/activities')
    .set('Authorization', `Bearer ${token}`)
    .send(validBody(overrides));
  expect(res.status).toBe(201);
  return res.body;
}

beforeEach(async () => {
  // Start every test with empty tables. Children first, because of the foreign keys.
  await prisma.costItem.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.clubRepresentative.deleteMany();
  await prisma.sportsClub.deleteMany();
  await prisma.sport.deleteMany();

  sportId = (await prisma.sport.create({ data: { name: 'Voetbal' } })).id;
  ownToken = (await createClubWithRepresentative('OwnClub')).token;
  otherToken = (await createClubWithRepresentative('OtherClub')).token;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/sports', () => {
  it('returns the sports sorted by name', async () => {
    await prisma.sport.create({ data: { name: 'Judo' } });

    const res = await request(app).get('/api/sports');

    expect(res.status).toBe(200);
    expect(res.body.data.map((s: { name: string }) => s.name)).toEqual(['Judo', 'Voetbal']);
  });
});

describe('POST /api/activities', () => {
  it('saves the activity with all its cost items', async () => {
    const created = await createActivityAs(ownToken);

    expect(created.sport).toEqual({ id: sportId, name: 'Voetbal' });
    expect(created.club.name).toBe('OwnClub');
    expect(created.costItems).toEqual([
      { id: expect.any(Number), type: 'MEMBERSHIP', amount: '15.50', frequency: 'MONTHLY' },
      { id: expect.any(Number), type: 'REGISTRATION', amount: '25.00', frequency: 'ONCE' },
    ]);
    expect(await prisma.costItem.count({ where: { activityId: created.id } })).toBe(2);
  });

  it('allows an empty cost list for a free activity', async () => {
    const created = await createActivityAs(ownToken, { costItems: [] });

    expect(created.costItems).toEqual([]);
  });

  it('uses the club of the logged-in representative, not a clubId from the body', async () => {
    const { club: otherClub } = await createClubWithRepresentative('ThirdClub');

    const created = await createActivityAs(ownToken, { clubId: otherClub.id });

    expect(created.club.name).toBe('OwnClub');
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).post('/api/activities').send(validBody());

    expect(res.status).toBe(401);
    expect(await prisma.activity.count()).toBe(0);
  });

  it('returns 401 with an invalid token', async () => {
    const res = await request(app)
      .post('/api/activities')
      .set('Authorization', 'Bearer not-a-real-token')
      .send(validBody());

    expect(res.status).toBe(401);
  });

  it.each([
    ['minAge greater than maxAge', { minAge: 12, maxAge: 8 }, 'minAge'],
    ['a negative age', { minAge: -1 }, 'minAge'],
    ['endTime before startTime', { startTime: '18:00', endTime: '17:00' }, 'endTime'],
    ['an invalid time', { startTime: '25:00' }, 'startTime'],
    ['a too short name', { name: 'ab' }, 'name'],
    ['an unknown setting', { setting: 'ON_THE_MOON' }, 'setting'],
    [
      'a negative amount',
      { costItems: [{ type: 'OTHER', amount: '-5', frequency: 'ONCE' }] },
      'costItems.0.amount',
    ],
    [
      'an unknown frequency',
      { costItems: [{ type: 'OTHER', amount: '5', frequency: 'WEEKLY' }] },
      'costItems.0.frequency',
    ],
    ['missing cost items', { costItems: undefined }, 'costItems'],
  ])('returns 400 for %s', async (_case, overrides, field) => {
    const res = await request(app)
      .post('/api/activities')
      .set('Authorization', `Bearer ${ownToken}`)
      .send(validBody(overrides));

    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d: { field: string }) => d.field)).toContain(field);
    expect(await prisma.activity.count()).toBe(0);
  });

  it('returns 400 when the sport does not exist', async () => {
    const res = await request(app)
      .post('/api/activities')
      .set('Authorization', `Bearer ${ownToken}`)
      .send(validBody({ sportId: sportId + 1000 }));

    expect(res.status).toBe(400);
    expect(await prisma.sport.count()).toBe(1);
  });
});

describe('GET /api/activities', () => {
  it('filters on child age, including the min and max age themselves', async () => {
    await createActivityAs(ownToken, { name: 'Kleuters', minAge: 4, maxAge: 6 });
    await createActivityAs(ownToken, { name: 'Jeugd', minAge: 6, maxAge: 10 });
    await createActivityAs(ownToken, { name: 'Tieners', minAge: 11, maxAge: 15 });

    const names = async (age: number) =>
      (await request(app).get(`/api/activities?age=${age}`)).body.data.map(
        (a: { name: string }) => a.name,
      );

    expect(await names(6)).toEqual(['Kleuters', 'Jeugd']);
    expect(await names(10)).toEqual(['Jeugd']);
    expect(await names(16)).toEqual([]);
  });

  it('filters on sport', async () => {
    const judo = await prisma.sport.create({ data: { name: 'Judo' } });
    await createActivityAs(ownToken, { name: 'Voetbal' });
    await createActivityAs(ownToken, { name: 'Judoles', sportId: judo.id });

    const res = await request(app).get(`/api/activities?sportId=${judo.id}`);

    expect(res.body.data.map((a: { name: string }) => a.name)).toEqual(['Judoles']);
  });

  it('paginates the results', async () => {
    for (const name of ['Een', 'Twee', 'Drie']) {
      await createActivityAs(ownToken, { name });
    }

    const res = await request(app).get('/api/activities?page=2&pageSize=2');

    expect(res.body.data.map((a: { name: string }) => a.name)).toEqual(['Drie']);
    expect(res.body.pagination).toEqual({ page: 2, pageSize: 2, total: 3, totalPages: 2 });
  });

  it('returns 400 for an invalid age', async () => {
    const res = await request(app).get('/api/activities?age=abc');

    expect(res.status).toBe(400);
  });
});

describe('GET /api/activities/:id', () => {
  it('returns the details with sport, club contact and costs', async () => {
    const created = await createActivityAs(ownToken);

    const res = await request(app).get(`/api/activities/${created.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(created);
    expect(res.body.club).toMatchObject({ email: 'info@ownclub.nl', address: expect.any(String) });
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app).get('/api/activities/999999');

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/activities/:id', () => {
  it('updates the activity and replaces its cost items', async () => {
    const created = await createActivityAs(ownToken);

    const res = await request(app)
      .put(`/api/activities/${created.id}`)
      .set('Authorization', `Bearer ${ownToken}`)
      .send(
        validBody({
          name: 'Nieuwe naam',
          costItems: [{ type: 'EQUIPMENT', amount: '9.99', frequency: 'YEARLY' }],
        }),
      );

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Nieuwe naam');
    expect(res.body.costItems).toEqual([
      { id: expect.any(Number), type: 'EQUIPMENT', amount: '9.99', frequency: 'YEARLY' },
    ]);
    // The old cost items are gone from the database, not just from the response.
    expect(await prisma.costItem.count()).toBe(1);
  });

  it('leaves the activity unchanged when the input is invalid', async () => {
    const created = await createActivityAs(ownToken);

    const res = await request(app)
      .put(`/api/activities/${created.id}`)
      .set('Authorization', `Bearer ${ownToken}`)
      .send(validBody({ name: 'Nieuwe naam', costItems: [{ type: 'OTHER', amount: '-1' }] }));

    expect(res.status).toBe(400);
    expect((await request(app).get(`/api/activities/${created.id}`)).body).toEqual(created);
  });

  it("returns 403 for another club's activity and changes nothing", async () => {
    const created = await createActivityAs(ownToken);

    const res = await request(app)
      .put(`/api/activities/${created.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send(validBody({ name: 'Overgenomen' }));

    expect(res.status).toBe(403);
    expect((await request(app).get(`/api/activities/${created.id}`)).body.name).toBe(created.name);
  });
});

describe('DELETE /api/activities/:id', () => {
  it('deletes the activity and its cost items', async () => {
    const created = await createActivityAs(ownToken);

    const res = await request(app)
      .delete(`/api/activities/${created.id}`)
      .set('Authorization', `Bearer ${ownToken}`);

    expect(res.status).toBe(204);
    expect(await prisma.activity.count()).toBe(0);
    expect(await prisma.costItem.count()).toBe(0);
  });

  it("returns 403 for another club's activity and keeps it", async () => {
    const created = await createActivityAs(ownToken);

    const res = await request(app)
      .delete(`/api/activities/${created.id}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
    expect(await prisma.activity.count()).toBe(1);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app)
      .delete('/api/activities/999999')
      .set('Authorization', `Bearer ${ownToken}`);

    expect(res.status).toBe(404);
  });
});
