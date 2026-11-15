// Prints a login token for a club representative, so you can try the protected endpoints before
// the real login endpoint exists. Development only.
// Usage: npm run token:dev -- vertegenwoordiger@demo-club.nl
import { env } from '../src/config/env';
import { prisma } from '../src/db/prisma';
import { createRepresentativeToken } from '../src/services/auth.service';

async function main() {
  if (env.NODE_ENV === 'production') {
    throw new Error('token:dev may not be used in production');
  }
  const email = process.argv[2];
  if (!email) {
    throw new Error('Usage: npm run token:dev -- <representative email>');
  }
  const representative = await prisma.clubRepresentative.findUnique({ where: { email } });
  if (!representative) {
    throw new Error(`No club representative with email ${email}. Did you run npm run db:seed?`);
  }
  console.log(createRepresentativeToken(representative.id));
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
