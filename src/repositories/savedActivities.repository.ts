import { prisma } from '../db/prisma';
import { Prisma } from '../generated/prisma/client';

// EN: Saving twice is not an error: the existing entry is returned and keeps its first savedAt.
// NL: Twee keer opslaan is geen fout: je krijgt de bestaande regel terug, met de eerste savedAt.
export async function saveActivity(childId: number, activityId: number) {
  const key = { childId_activityId: { childId, activityId } };
  try {
    return await prisma.savedActivity.upsert({
      where: key,
      create: { childId, activityId },
      update: {},
    });
  } catch (err) {
    // EN: Two saves at the same moment can both try to insert. The primary key refuses the
    // second one, and by then the entry exists, so return that.
    // NL: Twee keer tegelijk opslaan kan twee keer een insert proberen. De primary key weigert
    // de tweede, en dan bestaat de regel al, dus die geven we terug.
    if (isAlreadySaved(err)) return prisma.savedActivity.findUniqueOrThrow({ where: key });
    throw err;
  }
}

/**
 * EN: Returns false when this activity was not saved for this child.
 * NL: Geeft false als deze activiteit niet was opgeslagen voor dit kind.
 */
export async function removeSavedActivity(childId: number, activityId: number): Promise<boolean> {
  const { count } = await prisma.savedActivity.deleteMany({ where: { childId, activityId } });
  return count === 1;
}

// EN: Newest first. activityId breaks ties, so the order is the same every time.
// NL: Nieuwste eerst. Bij dezelfde tijd beslist activityId, zodat de volgorde altijd gelijk is.
export function findSavedActivities(childId: number) {
  return prisma.savedActivity.findMany({
    where: { childId },
    orderBy: [{ savedAt: 'desc' }, { activityId: 'asc' }],
  });
}

// EN: P2002 is Prisma's error code for "unique constraint failed", here the (child, activity) key.
// NL: P2002 is de foutcode van Prisma voor "unique constraint failed", hier de sleutel (kind, activiteit).
function isAlreadySaved(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}
