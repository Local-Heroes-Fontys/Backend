import { prisma } from '../db/prisma';
import type { ChildData } from '../types/children.types';

// Elke query hieronder zoekt ook op de ouder. Zo wordt een kind van een andere ouder nooit
// gevonden, gewijzigd of verwijderd via de URL van de verkeerde ouder.

export function createChild(parentId: number, data: ChildData) {
  return prisma.child.create({ data: { ...data, parentId } });
}

export function findChildren(parentId: number) {
  return prisma.child.findMany({ where: { parentId }, orderBy: { id: 'asc' } });
}

export function findOwnChild(parentId: number, id: number) {
  return prisma.child.findFirst({ where: { id, parentId } });
}

/** Geeft null als deze ouder geen kind met dit id heeft. */
export async function updateOwnChild(parentId: number, id: number, data: ChildData) {
  const { count } = await prisma.child.updateMany({ where: { id, parentId }, data });
  return count === 1 ? findOwnChild(parentId, id) : null;
}

/** Geeft false als deze ouder geen kind met dit id heeft. */
export async function deleteOwnChild(parentId: number, id: number): Promise<boolean> {
  const { count } = await prisma.child.deleteMany({ where: { id, parentId } });
  return count === 1;
}
