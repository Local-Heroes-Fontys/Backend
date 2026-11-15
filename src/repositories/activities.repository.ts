import { prisma } from '../db/prisma';
import type { Prisma } from '../generated/prisma/client';
import type { ActivityInput } from '../validators/activities.validator';

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
export function createActivity(clubId: number, { costItems, ...fields }: ActivityInput) {
  return prisma.activity.create({
    data: { ...fields, clubId, costItems: { create: costItems } },
    include: activityInclude,
  });
}

// PUT replaces the cost items: delete all existing ones, then create the submitted ones.
// This is also one transaction, so a failure never leaves the activity half-updated.
export function updateActivity(id: number, { costItems, ...fields }: ActivityInput) {
  return prisma.activity.update({
    where: { id },
    data: { ...fields, costItems: { deleteMany: {}, create: costItems } },
    include: activityInclude,
  });
}

// The cost items are removed by the database itself (ON DELETE CASCADE in the schema).
export function deleteActivity(id: number) {
  return prisma.activity.delete({ where: { id } });
}
