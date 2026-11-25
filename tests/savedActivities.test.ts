import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { app } from '../src/app';
import { prisma } from '../src/db/prisma';

// Tests for the saved activity routes
// (/api/parents/:parentId/children/:childId/saved-activities):
// - a child can save an activity once; saving again or at the same moment keeps one entry
// - an activity that does not exist gives 404, and so does removing one that was not saved
// - an unknown child, or a child of another parent, gives 404; an invalid id gives 400
// - the list only shows the activities of that child, newest first
// - deleting the child or the activity deletes the saved entry
//
// Uses the real test database (local_heroes_test). The tables are emptied before each test.
// There is no parent login yet, so the routes are called without a token.

let parentId: number;
let otherParentId: number;
let childId: number;
let otherChildId: number;
let activityId: number;
let otherActivityId: number;

function savedUrl(child = childId, parent = parentId) {
  return `/api/parents/${parent}/children/${child}/saved-activities`;
}

async function save(activity: number, child = childId, parent = parentId) {
  const res = await request(app).put(`${savedUrl(child, parent)}/${activity}`);
  expect(res.status).toBe(200);
  return res.body as { activityId: number; savedAt: string };
}

async function list(child = childId) {
  const res = await request(app).get(savedUrl(child));
  expect(res.status).toBe(200);
  return res.body.data;
}

async function createActivity(clubId: number, sportId: number, name: string) {
  const activity = await prisma.activity.create({
    data: {
      name,
      description: 'Wekelijkse training voor kinderen.',
      sportId,
      clubId,
      minAge: 6,
      maxAge: 12,
      setting: 'OUTDOOR',
      weekday: 'WEDNESDAY',
      startTime: '17:00',
      endTime: '18:00',
      location: 'Sportpark Eindhoven Noord',
    },
  });
  return activity.id;
}

beforeEach(async () => {
  // Children first, because of the foreign keys.
  await prisma.savedActivity.deleteMany();
  await prisma.child.deleteMany();
  await prisma.parent.deleteMany();
  await prisma.costItem.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.clubRepresentative.deleteMany();
  await prisma.sportsClub.deleteMany();
  await prisma.sport.deleteMany();

  const sport = await prisma.sport.create({ data: { name: 'Voetbal' } });
  const club = await prisma.sportsClub.create({
    data: { name: 'Club', address: 'Teststraat 1, Eindhoven' },
  });
  activityId = await createActivity(club.id, sport.id, 'Voetbaltraining');
  otherActivityId = await createActivity(club.id, sport.id, 'Keeperstraining');

  const parent = await prisma.parent.create({
    data: {
      email: 'ouder@example.com',
      passwordHash: 'not-used-here',
      children: { create: [{ birthYear: 2016 }, { birthYear: 2018 }] },
    },
    include: { children: { orderBy: { id: 'asc' } } },
  });
  const other = await prisma.parent.create({
    data: { email: 'andere@example.com', passwordHash: 'not-used-here' },
  });
  parentId = parent.id;
  otherParentId = other.id;
  [childId, otherChildId] = parent.children.map((child) => child.id);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('PUT .../saved-activities/:activityId', () => {
  it('saves the activity for the child', async () => {
    const saved = await save(activityId);

    expect(saved).toEqual({ activityId, savedAt: expect.any(String) });
    expect(new Date(saved.savedAt).toISOString()).toBe(saved.savedAt);
    expect(await prisma.savedActivity.count({ where: { childId, activityId } })).toBe(1);
  });

  it('keeps one entry and the first savedAt when saving twice', async () => {
    const first = await save(activityId);
    const second = await save(activityId);

    expect(second).toEqual(first);
    expect(await prisma.savedActivity.count()).toBe(1);
  });

  it('keeps one entry when the same activity is saved twice at the same moment', async () => {
    const results = await Promise.all([save(activityId), save(activityId)]);

    expect(results[1]).toEqual(results[0]);
    expect(await prisma.savedActivity.count()).toBe(1);
  });

  it('returns 404 for an activity that does not exist', async () => {
    const res = await request(app).put(`${savedUrl()}/${otherActivityId + 1000}`);

    expect(res.status).toBe(404);
    expect(await prisma.savedActivity.count()).toBe(0);
  });

  it('returns 404 for a child that does not exist', async () => {
    const res = await request(app).put(`${savedUrl(otherChildId + 1000)}/${activityId}`);

    expect(res.status).toBe(404);
    expect(await prisma.savedActivity.count()).toBe(0);
  });

  it('returns 404 for a child of another parent', async () => {
    const res = await request(app).put(`${savedUrl(childId, otherParentId)}/${activityId}`);

    expect(res.status).toBe(404);
    expect(await prisma.savedActivity.count()).toBe(0);
  });

  it('returns 400 for an invalid id in the URL', async () => {
    const res = await request(app).put(`${savedUrl()}/abc`);

    expect(res.status).toBe(400);
  });
});

describe('DELETE .../saved-activities/:activityId', () => {
  it('removes only that saved activity', async () => {
    await save(activityId);
    await save(otherActivityId);

    const res = await request(app).delete(`${savedUrl()}/${activityId}`);

    expect(res.status).toBe(204);
    expect(await list()).toEqual([{ activityId: otherActivityId, savedAt: expect.any(String) }]);
  });

  it('returns 404 when the activity was not saved for this child', async () => {
    await save(activityId, otherChildId);

    const res = await request(app).delete(`${savedUrl()}/${activityId}`);

    expect(res.status).toBe(404);
    expect(await prisma.savedActivity.count()).toBe(1);
  });

  it('returns 404 for a child of another parent and removes nothing', async () => {
    await save(activityId);

    const res = await request(app).delete(`${savedUrl(childId, otherParentId)}/${activityId}`);

    expect(res.status).toBe(404);
    expect(await prisma.savedActivity.count()).toBe(1);
  });
});

describe('GET .../saved-activities', () => {
  it('lists only the activities of that child, newest first', async () => {
    await prisma.savedActivity.createMany({
      data: [
        { childId, activityId, savedAt: new Date('2026-01-01T10:00:00Z') },
        { childId, activityId: otherActivityId, savedAt: new Date('2026-02-01T10:00:00Z') },
        { childId: otherChildId, activityId, savedAt: new Date('2026-03-01T10:00:00Z') },
      ],
    });

    expect(await list()).toEqual([
      { activityId: otherActivityId, savedAt: '2026-02-01T10:00:00.000Z' },
      { activityId, savedAt: '2026-01-01T10:00:00.000Z' },
    ]);
  });

  it('returns an empty list when nothing is saved', async () => {
    expect(await list()).toEqual([]);
  });

  it('returns 404 for a child of another parent', async () => {
    const res = await request(app).get(savedUrl(childId, otherParentId));

    expect(res.status).toBe(404);
  });
});

describe('deleting', () => {
  it('a child also deletes their saved activities', async () => {
    await save(activityId);
    await save(activityId, otherChildId);

    await prisma.child.delete({ where: { id: childId } });

    expect(await prisma.savedActivity.findMany({ select: { childId: true } })).toEqual([
      { childId: otherChildId },
    ]);
  });

  it('an activity also deletes it from the saved activities', async () => {
    await save(activityId);
    await save(otherActivityId);

    await prisma.activity.delete({ where: { id: activityId } });

    expect(await list()).toEqual([{ activityId: otherActivityId, savedAt: expect.any(String) }]);
  });
});
