import { prisma } from '../db/prisma';

export function findParentByEmail(email: string) {
  return prisma.parent.findUnique({ where: { email } });
}

export function createParent(data: { email: string; passwordHash: string }) {
  return prisma.parent.create({ data });
}
