import { prisma } from '../db/prisma';
import { Prisma } from '../generated/prisma/client';

// Saving twice is not an error: the existing entry is returned and keeps its first savedAt.
export async function saveActivity(childId: number, activityId: number) {
  const key = { childId_activityId: { childId, activityId } };
  try {
    return await prisma.savedActivity.upsert({
      where: key,
      create: { childId, activityId },
      update: {},
    });
  } catch (err) {
    // Two saves at the same moment can both try to insert. The primary key refuses the second
    // one, and by then the entry exists, so return that.
    if (isAlreadySaved(err)) return prisma.savedActivity.findUniqueOrThrow({ where: key });
    throw err;
  }
}

/** Returns false when this activity was not saved for this child. */
export async function removeSavedActivity(childId: number, activityId: number): Promise<boolean> {
  const { count } = await prisma.savedActivity.deleteMany({ where: { childId, activityId } });
  return count === 1;
}

// Newest first. activityId breaks ties, so the order is the same every time.
export function findSavedActivities(childId: number) {
  return prisma.savedActivity.findMany({
    where: { childId },
    orderBy: [{ savedAt: 'desc' }, { activityId: 'asc' }],
  });
}

// P2002 is Prisma's error code for "unique constraint failed", here the (child, activity) key.
function isAlreadySaved(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}
