import { prisma } from '../db/prisma';
import { Prisma } from '../generated/prisma/client';
import type { ActivityData } from '../types/activities.types';

// Every query returns the activity together with its sport, club and cost items,
// so the service can always build the same response.
const activityInclude = {
  sport: true,
  club: true,
  costItems: { orderBy: { id: 'asc' } },
} satisfies Prisma.ActivityInclude;

export type ActivityWithRelations = Prisma.ActivityGetPayload<{ include: typeof activityInclude }>;

interface ActivityFilters {
  sportId?: number;
  age?: number;
  skip: number;
  take: number;
}

export async function findActivities({ sportId, age, skip, take }: ActivityFilters) {
  // Prisma ignores `undefined` values, so a filter that was not given is simply skipped.
  // The age filter keeps activities where minAge <= age <= maxAge.
  const where: Prisma.ActivityWhereInput = {
    sportId,
    minAge: { lte: age },
    maxAge: { gte: age },
  };

  // $transaction with an array runs both queries on the same snapshot, so `total` matches the page.
  const [activities, total] = await prisma.$transaction([
    prisma.activity.findMany({
      where,
      include: activityInclude,
      orderBy: { id: 'asc' },
      skip,
      take,
    }),
    prisma.activity.count({ where }),
  ]);
  return { activities, total };
}

export function findActivityById(id: number) {
  return prisma.activity.findUnique({ where: { id }, include: activityInclude });
}

// A "nested write" (`costItems: { create: ... }`) saves the activity and all its cost items in
// one database transaction: either everything is saved, or nothing is.
export function createActivity(clubId: number, { costItems, ...fields }: ActivityData) {
  return prisma.activity.create({
    data: { ...fields, clubId, costItems: { create: costItems } },
    include: activityInclude,
  });
}

// The update and delete below only match a row when BOTH the id and the club are right. The
// ownership check and the write are therefore one database operation, so nothing can change in
// between. They return null/false when no row matched; the service then decides between 404 and 403.

// PUT replaces the cost items: delete all existing ones, then create the submitted ones.
// This is also one transaction, so a failure never leaves the activity half-updated.
export async function updateOwnActivity(
  id: number,
  clubId: number,
  { costItems, ...fields }: ActivityData,
): Promise<ActivityWithRelations | null> {
  try {
    return await prisma.activity.update({
      where: { id, clubId },
      data: { ...fields, costItems: { deleteMany: {}, create: costItems } },
      include: activityInclude,
    });
  } catch (err) {
    if (isRecordNotFound(err)) return null;
    throw err;
  }
}

// The cost items are removed by the database itself (ON DELETE CASCADE in the schema).
export async function deleteOwnActivity(id: number, clubId: number): Promise<boolean> {
  const { count } = await prisma.activity.deleteMany({ where: { id, clubId } });
  return count === 1;
}

// P2025 is Prisma's error code for "the record to update was not found".
function isRecordNotFound(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025';
}
