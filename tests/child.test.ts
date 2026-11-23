import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { prisma } from '../src/db/prisma';
import { createChild } from '../src/services/children.service';
import { childBodySchema } from '../src/validators/children.validator';

// Tests for children (there is no endpoint until parents can log in):
// - a child is saved under the given parent, never under a parentId from the input
// - the name is optional, the birth year must belong to someone of 0 to 18 years old
// - the database refuses a child without an existing parent
// - deleting a parent deletes their children
//
// Uses the real test database (local_heroes_test). Both tables are emptied before each test.

const thisYear = new Date().getFullYear();
let parentId: number;

function addChild(body: object) {
  return createChild(childBodySchema.parse(body), parentId);
}

beforeEach(async () => {
  await prisma.child.deleteMany();
  await prisma.parent.deleteMany();

  const parent = await prisma.parent.create({
    data: { email: 'ouder@example.com', passwordHash: 'not-used-here' },
  });
  parentId = parent.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('createChild', () => {
  it('saves the child under the given parent', async () => {
    const child = await addChild({ name: ' Sam ', birthYear: thisYear - 8 });

    expect(child).toEqual({ id: expect.any(Number), name: 'Sam', birthYear: thisYear - 8 });
    expect(await prisma.child.findUniqueOrThrow({ where: { id: child.id } })).toMatchObject({
      parentId,
      birthYear: thisYear - 8,
    });
  });

  it('ignores a parentId in the input', async () => {
    const other = await prisma.parent.create({
      data: { email: 'andere@example.com', passwordHash: 'not-used-here' },
    });

    await addChild({ birthYear: thisYear - 8, parentId: other.id });

    expect((await prisma.child.findFirstOrThrow()).parentId).toBe(parentId);
  });

  it.each([
    ['missing', {}],
    ['null', { name: null }],
    ['empty', { name: '' }],
    ['only spaces', { name: '   ' }],
  ])('stores null when the name is %s', async (_case, body) => {
    await addChild({ ...body, birthYear: thisYear - 8 });

    expect((await prisma.child.findFirstOrThrow()).name).toBeNull();
  });

  it.each([0, 18])('accepts a child of %i years old', async (age) => {
    const child = await addChild({ birthYear: thisYear - age });

    expect(child.birthYear).toBe(thisYear - age);
  });

  it('refuses a parent that does not exist', async () => {
    await prisma.parent.delete({ where: { id: parentId } });

    // P2003 is Prisma's error code for "foreign key constraint failed".
    await expect(addChild({ birthYear: thisYear - 8 })).rejects.toMatchObject({ code: 'P2003' });
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

describe('deleting a parent', () => {
  it('also deletes their children', async () => {
    await addChild({ birthYear: thisYear - 8 });

    await prisma.parent.delete({ where: { id: parentId } });

    expect(await prisma.child.count()).toBe(0);
  });
});
