import { prisma } from '../db/prisma';
import type { ClubData, NewRepresentativeData } from '../types/clubs.types';

export async function findClubs({ skip, take }: { skip: number; take: number }) {
  // $transaction with an array runs both queries on the same snapshot, so `total` matches the page.
  const [clubs, total] = await prisma.$transaction([
    prisma.sportsClub.findMany({ orderBy: { id: 'asc' }, skip, take }),
    prisma.sportsClub.count(),
  ]);
  return { clubs, total };
}

export function findClubById(id: number) {
  return prisma.sportsClub.findUnique({ where: { id } });
}

// A nested write: the club and its first representative are saved in one transaction, so there is
// never a club without a representative to manage it.
export function createClubWithRepresentative(
  club: ClubData,
  representative: NewRepresentativeData,
) {
  return prisma.clubRepresentative.create({
    data: { ...representative, club: { create: club } },
    include: { club: true },
  });
}

// Only the details from ClubData are written: the approval status can't be changed this way.
export function updateClub(id: number, data: ClubData) {
  return prisma.sportsClub.update({ where: { id }, data });
}
