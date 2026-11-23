import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { app } from '../src/app';
import { prisma } from '../src/db/prisma';
import { childBodySchema } from '../src/validators/children.validator';

// Tests for the child routes (/api/parents/:parentId/children):
// - a child is saved under the parent in the URL, never under a parentId from the body
// - the name is optional, the birth year must belong to someone of 0 to 18 years old
// - a child of another parent is never found, changed or deleted (404)
// - an unknown parent or child gives 404, an invalid id in the URL gives 400
// - the database refuses a child without an existing parent, and deleting a parent deletes
//   their children
//
// Uses the real test database (local_heroes_test). Both tables are emptied before each test.
// There is no parent login yet, so the routes are called without a token.

const thisYear = new Date().getFullYear();
let parentId: number;
let otherParentId: number;

function childrenUrl(id = parentId) {
  return `/api/parents/${id}/children`;
}

async function addChild(body: object, id = parentId) {
  const res = await request(app).post(childrenUrl(id)).send(body);
  expect(res.status).toBe(201);
  return res.body as { id: number; name: string | null; birthYear: number };
}

beforeEach(async () => {
  await prisma.child.deleteMany();
  await prisma.parent.deleteMany();

  const parent = await prisma.parent.create({
    data: { email: 'ouder@example.com', passwordHash: 'not-used-here' },
  });
  const other = await prisma.parent.create({
    data: { email: 'andere@example.com', passwordHash: 'not-used-here' },
  });
  parentId = parent.id;
  otherParentId = other.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/parents/:parentId/children', () => {
  it('saves the child under the parent in the URL', async () => {
    const res = await request(app)
      .post(childrenUrl())
      .send({ name: ' Sam ', birthYear: thisYear - 8 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: expect.any(Number), name: 'Sam', birthYear: thisYear - 8 });
    expect(await prisma.child.findUniqueOrThrow({ where: { id: res.body.id } })).toMatchObject({
      parentId,
      birthYear: thisYear - 8,
    });
  });

  it('ignores a parentId in the body', async () => {
    await addChild({ birthYear: thisYear - 8, parentId: otherParentId });

    expect((await prisma.child.findFirstOrThrow()).parentId).toBe(parentId);
  });

  it.each([
    ['missing', {}],
    ['null', { name: null }],
    ['empty', { name: '' }],
    ['only spaces', { name: '   ' }],
  ])('stores null when the name is %s', async (_case, body) => {
    const child = await addChild({ ...body, birthYear: thisYear - 8 });

    expect(child.name).toBeNull();
    expect((await prisma.child.findFirstOrThrow()).name).toBeNull();
  });

  it.each([0, 18])('accepts a child of %i years old', async (age) => {
    const child = await addChild({ birthYear: thisYear - age });

    expect(child.birthYear).toBe(thisYear - age);
  });

  it('accepts a name of 100 characters', async () => {
    const child = await addChild({ name: 'a'.repeat(100), birthYear: thisYear - 8 });

    expect(child.name).toHaveLength(100);
  });

  it('returns 400 for an invalid body and saves nothing', async () => {
    const res = await request(app)
      .post(childrenUrl())
      .send({ birthYear: thisYear - 19 });

    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d: { field: string }) => d.field)).toEqual(['birthYear']);
    expect(await prisma.child.count()).toBe(0);
  });

  it('returns 404 for a parent that does not exist', async () => {
    const res = await request(app)
      .post(childrenUrl(otherParentId + 1000))
      .send({ birthYear: thisYear - 8 });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { message: 'Parent not found' } });
    expect(await prisma.child.count()).toBe(0);
  });
});

describe('GET /api/parents/:parentId/children', () => {
  it("returns only this parent's children, sorted by id", async () => {
    const first = await addChild({ name: 'Sam', birthYear: thisYear - 8 });
    const second = await addChild({ birthYear: thisYear - 5 });
    await addChild({ name: 'Kim', birthYear: thisYear - 10 }, otherParentId);

    const res = await request(app).get(childrenUrl());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [first, second] });
  });

  it('returns an empty list for a parent without children', async () => {
    const res = await request(app).get(childrenUrl());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [] });
  });

  it('returns 404 for a parent that does not exist', async () => {
    const res = await request(app).get(childrenUrl(otherParentId + 1000));

    expect(res.status).toBe(404);
  });
});

describe('GET /api/parents/:parentId/children/:id', () => {
  it('returns the child', async () => {
    const child = await addChild({ name: 'Sam', birthYear: thisYear - 8 });

    const res = await request(app).get(`${childrenUrl()}/${child.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(child);
  });

  it("returns 404 for another parent's child", async () => {
    const child = await addChild({ name: 'Sam', birthYear: thisYear - 8 });

    const res = await request(app).get(`${childrenUrl(otherParentId)}/${child.id}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { message: 'Child not found' } });
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app).get(`${childrenUrl()}/999999`);

    expect(res.status).toBe(404);
  });

  it.each([
    ['a child id that is not a number', () => `${childrenUrl()}/abc`],
    ['a child id of 0', () => `${childrenUrl()}/0`],
    ['a parent id that is not a number', () => '/api/parents/abc/children/1'],
  ])('returns 400 for %s', async (_case, url) => {
    const res = await request(app).get(url());

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/parents/:parentId/children/:id', () => {
  it('replaces the name and birth year', async () => {
    const child = await addChild({ name: 'Sam', birthYear: thisYear - 8 });

    const res = await request(app)
      .put(`${childrenUrl()}/${child.id}`)
      .send({ name: 'Alex', birthYear: thisYear - 7 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: child.id, name: 'Alex', birthYear: thisYear - 7 });
    expect(await prisma.child.findUniqueOrThrow({ where: { id: child.id } })).toMatchObject({
      name: 'Alex',
      birthYear: thisYear - 7,
    });
  });

  it('clears the name when it is left out', async () => {
    const child = await addChild({ name: 'Sam', birthYear: thisYear - 8 });

    const res = await request(app)
      .put(`${childrenUrl()}/${child.id}`)
      .send({ birthYear: thisYear - 8 });

    expect(res.status).toBe(200);
    expect(res.body.name).toBeNull();
  });

  it("returns 404 for another parent's child and changes nothing", async () => {
    const child = await addChild({ name: 'Sam', birthYear: thisYear - 8 });

    const res = await request(app)
      .put(`${childrenUrl(otherParentId)}/${child.id}`)
      .send({ name: 'Alex', birthYear: thisYear - 7 });

    expect(res.status).toBe(404);
    expect(await prisma.child.findUniqueOrThrow({ where: { id: child.id } })).toMatchObject({
      parentId,
      name: 'Sam',
      birthYear: thisYear - 8,
    });
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app)
      .put(`${childrenUrl()}/999999`)
      .send({ birthYear: thisYear - 8 });

    expect(res.status).toBe(404);
  });

  it('returns 400 for an invalid body and changes nothing', async () => {
    const child = await addChild({ name: 'Sam', birthYear: thisYear - 8 });

    const res = await request(app)
      .put(`${childrenUrl()}/${child.id}`)
      .send({ name: 'Alex', birthYear: thisYear + 1 });

    expect(res.status).toBe(400);
    expect((await prisma.child.findUniqueOrThrow({ where: { id: child.id } })).name).toBe('Sam');
  });
});

describe('DELETE /api/parents/:parentId/children/:id', () => {
  it('deletes the child', async () => {
    const child = await addChild({ birthYear: thisYear - 8 });

    const res = await request(app).delete(`${childrenUrl()}/${child.id}`);

    expect(res.status).toBe(204);
    expect(await prisma.child.count()).toBe(0);
  });

  it("returns 404 for another parent's child and keeps it", async () => {
    const child = await addChild({ birthYear: thisYear - 8 });

    const res = await request(app).delete(`${childrenUrl(otherParentId)}/${child.id}`);

    expect(res.status).toBe(404);
    expect(await prisma.child.count()).toBe(1);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app).delete(`${childrenUrl()}/999999`);

    expect(res.status).toBe(404);
  });
});

describe('childBodySchema', () => {
  it.each([
    ['a missing birth year', {}, 'birthYear'],
    ['a birth year in the future', { birthYear: thisYear + 1 }, 'birthYear'],
    ['someone older than 18', { birthYear: thisYear - 19 }, 'birthYear'],
    ['a birth year as text', { birthYear: String(thisYear - 8) }, 'birthYear'],
    ['a birth year with decimals', { birthYear: thisYear - 7.5 }, 'birthYear'],
    ['a too long name', { name: 'a'.repeat(101), birthYear: thisYear - 8 }, 'name'],
  ])('refuses %s', (_case, body, field) => {
    const result = childBodySchema.safeParse(body);

    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toContain(field);
  });
});

describe('database', () => {
  it('refuses a child without an existing parent', async () => {
    // P2003 is Prisma's error code for "foreign key constraint failed".
    await expect(
      prisma.child.create({ data: { parentId: otherParentId + 1000, birthYear: thisYear - 8 } }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });

  it("deletes a parent's children together with the parent", async () => {
    await addChild({ birthYear: thisYear - 8 });
    await addChild({ birthYear: thisYear - 5 }, otherParentId);

    await prisma.parent.delete({ where: { id: parentId } });

    expect(await prisma.child.findMany({ select: { parentId: true } })).toEqual([
      { parentId: otherParentId },
    ]);
  });
});
