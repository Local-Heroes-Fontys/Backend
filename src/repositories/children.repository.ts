import { prisma } from '../db/prisma';
import { Prisma } from '../generated/prisma/client';
import type { ChildData } from '../types/children.types';

// Every query below also filters on the parent, so a child of another parent is never found,
// changed or deleted through the wrong parent's URL.

export function createChild(parentId: number, data: ChildData) {
  return prisma.child.create({ data: { ...data, parentId } });
}

export function findChildren(parentId: number) {
  return prisma.child.findMany({ where: { parentId }, orderBy: { id: 'asc' } });
}

export function findOwnChild(parentId: number, id: number) {
  return prisma.child.findFirst({ where: { id, parentId } });
}

/** Returns null when this parent has no child with this id. */
export async function updateOwnChild(parentId: number, id: number, data: ChildData) {
  try {
    return await prisma.child.update({ where: { id, parentId }, data });
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

/** Returns false when this parent has no child with this id. */
export async function deleteOwnChild(parentId: number, id: number): Promise<boolean> {
  const { count } = await prisma.child.deleteMany({ where: { id, parentId } });
  return count === 1;
}

// P2025 is Prisma's error code for "record to update not found".
function isNotFound(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025';
}
