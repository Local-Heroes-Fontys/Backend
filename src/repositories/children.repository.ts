import { prisma } from '../db/prisma';
import type { ChildData } from '../types/children.types';

export function createChild(parentId: number, data: ChildData) {
  return prisma.child.create({ data: { ...data, parentId } });
}
