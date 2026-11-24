// Fills the database with the data the app needs. Safe to run again and again: it only adds what
// is missing and never deletes or overwrites existing rows. Run with `npm run db:seed`.
import { prisma } from '../src/db/prisma';
import { hashPassword } from '../src/services/password.service';

// Dutch, because these names are shown to parents as-is.
const SPORTS = ['Voetbal', 'Zwemmen', 'Tennis', 'Basketbal', 'Judo'];

async function seedSports() {
  for (const name of SPORTS) {
    await prisma.sport.upsert({ where: { name }, update: {}, create: { name } });
  }
}

// A demo club with one representative, so you can try the write endpoints locally
// (see `npm run token:dev`). Approved, so it looks like a real club. Never created in production.
async function seedDemoClub() {
  const email = 'vertegenwoordiger@demo-club.nl';
  if (await prisma.clubRepresentative.findUnique({ where: { email } })) return;

  await prisma.sportsClub.create({
    data: {
      name: 'Demo Sportclub Eindhoven',
      description: 'Voorbeeldclub voor lokale ontwikkeling.',
      address: 'Stratumsedijk 1, 5611 NA Eindhoven',
      contactName: 'Demo Vertegenwoordiger',
      contactPhone: '040 123 4567',
      contactEmail: 'info@demo-club.nl',
      approvalStatus: 'APPROVED',
      representatives: {
        create: {
          name: 'Demo Vertegenwoordiger',
          email,
          passwordHash: await hashPassword('demo-wachtwoord'),
        },
      },
    },
  });
}

async function main() {
  await seedSports();
  if (process.env.NODE_ENV !== 'production') {
    await seedDemoClub();
  }
  console.log('Seed finished');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
