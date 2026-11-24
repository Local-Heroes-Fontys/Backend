import { prisma } from '../db/prisma';

// These records contain the password hash, so they must never be sent to the client as-is.

export function findRepresentativeById(id: number) {
  return prisma.clubRepresentative.findUnique({ where: { id } });
}

export function findRepresentativeByEmail(email: string) {
  return prisma.clubRepresentative.findUnique({ where: { email } });
}
