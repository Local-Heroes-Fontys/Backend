import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { app } from '../src/app';
import { prisma } from '../src/db/prisma';
import { createParentToken, createRepresentativeToken } from '../src/services/auth.service';

/**
 * Tests for adding a child (POST /api/children):
 * - a child is saved under the logged-in parent, never under a parentId from the body
 * - the name is optional, the birth year must belong to someone of 0 to 18 years old
 * - only a logged-in parent may add a child
 * - deleting a parent deletes their children
 *
 * Uses the real test database (local_heroes_test). Both tables are emptied before each test.
 */

const thisYear = new Date().getFullYear();
let parentId: number;
let token: string;

function postChild(body: object, authToken = token) {
  return request(app).post('/api/children').set('Authorization', `Bearer ${authToken}`).send(body);
}

beforeEach(async () => {
  await prisma.child.deleteMany();
  await prisma.parent.deleteMany();

  const parent = await prisma.parent.create({
    data: { email: 'ouder@example.com', passwordHash: 'not-used-here' },
  });
  parentId = parent.id;
  token = createParentToken(parentId);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/children', () => {
  it('saves the child under the logged-in parent', async () => {
    const res = await postChild({ name: ' Sam ', birthYear: thisYear - 8 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: expect.any(Number), name: 'Sam', birthYear: thisYear - 8 });
    expect(await prisma.child.findUniqueOrThrow({ where: { id: res.body.id } })).toMatchObject({
      parentId,
      birthYear: thisYear - 8,
    });
  });

  it('ignores a parentId in the body', async () => {
    const other = await prisma.parent.create({
      data: { email: 'andere@example.com', passwordHash: 'not-used-here' },
    });

    const res = await postChild({ birthYear: thisYear - 8, parentId: other.id });

    expect(res.status).toBe(201);
    expect((await prisma.child.findFirstOrThrow()).parentId).toBe(parentId);
  });

  it.each([
    ['missing', {}],
    ['null', { name: null }],
    ['empty', { name: '' }],
    ['only spaces', { name: '   ' }],
  ])('stores null when the name is %s', async (_case, body) => {
    const res = await postChild({ ...body, birthYear: thisYear - 8 });

    expect(res.status).toBe(201);
    expect((await prisma.child.findFirstOrThrow()).name).toBeNull();
  });

  it.each([0, 18])('accepts a child of %i years old', async (age) => {
    const res = await postChild({ birthYear: thisYear - age });

    expect(res.status).toBe(201);
    expect(res.body.birthYear).toBe(thisYear - age);
  });

  it.each([
    ['a missing birth year', {}, 'birthYear'],
    ['a birth year in the future', { birthYear: thisYear + 1 }, 'birthYear'],
    ['someone older than 18', { birthYear: thisYear - 19 }, 'birthYear'],
    ['a birth year as text', { birthYear: String(thisYear - 8) }, 'birthYear'],
    ['a birth year with decimals', { birthYear: thisYear - 7.5 }, 'birthYear'],
    ['a too long name', { name: 'a'.repeat(101), birthYear: thisYear - 8 }, 'name'],
  ])('returns 400 for %s', async (_case, body, field) => {
    const res = await postChild(body);

    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d: { field: string }) => d.field)).toContain(field);
    expect(await prisma.child.count()).toBe(0);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .post('/api/children')
      .send({ birthYear: thisYear - 8 });

    expect(res.status).toBe(401);
    expect(await prisma.child.count()).toBe(0);
  });

  it('returns 401 for a club representative with the same id', async () => {
    const res = await postChild({ birthYear: thisYear - 8 }, createRepresentativeToken(parentId));

    expect(res.status).toBe(401);
    expect(await prisma.child.count()).toBe(0);
  });

  it('does not accept a parent token on a club route', async () => {
    const res = await request(app)
      .post('/api/activities')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(401);
  });

  it('returns 401 when the parent no longer exists', async () => {
    await prisma.parent.delete({ where: { id: parentId } });

    expect((await postChild({ birthYear: thisYear - 8 })).status).toBe(401);
  });
});

describe('deleting a parent', () => {
  it('also deletes their children', async () => {
    await prisma.child.create({ data: { parentId, birthYear: thisYear - 8 } });

    await prisma.parent.delete({ where: { id: parentId } });

    expect(await prisma.child.count()).toBe(0);
  });
});
