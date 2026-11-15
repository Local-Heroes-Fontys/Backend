import { prisma } from '../db/prisma';

export function findAllSports() {
  return prisma.sport.findMany({ orderBy: { name: 'asc' } });
}

export function findSportById(id: number) {
  return prisma.sport.findUnique({ where: { id } });
}
