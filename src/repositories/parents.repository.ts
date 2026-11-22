import { prisma } from '../db/prisma';
import { Prisma } from '../generated/prisma/client';
import type { CreateParentData } from '../types/parents.types';

export function findParentByEmail(email: string) {
  return prisma.parent.findUnique({ where: { email } });
}

// Returns null when the email is already taken. The unique index decides, so this also holds when
// two requests with the same email arrive at the same time.
export async function createParent(data: CreateParentData) {
  try {
    return await prisma.parent.create({ data });
  } catch (err) {
    if (isDuplicateEmail(err)) return null;
    throw err;
  }
}

// P2002 is Prisma's error code for "unique constraint failed". Email is the only unique field
// that is written here.
function isDuplicateEmail(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}
