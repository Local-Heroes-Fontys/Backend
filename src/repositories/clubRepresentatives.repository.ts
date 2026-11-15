import { prisma } from '../db/prisma';

export function findRepresentativeById(id: number) {
  return prisma.clubRepresentative.findUnique({ where: { id } });
}
