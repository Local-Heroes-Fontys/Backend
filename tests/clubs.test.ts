import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { app } from '../src/app';
import { prisma } from '../src/db/prisma';
import { createRepresentativeToken } from '../src/services/auth.service';
import { verifyPassword } from '../src/services/password.service';

// These tests use the real test database (local_heroes_test), like tests/activities.test.ts.

function clubBody(overrides: Record<string, unknown> = {}) {
  return {
    name: 'VV Eindhoven Noord',
    description: 'Voetbalvereniging voor de hele familie.',
    address: 'Sportlaan 10, 5612 AB Eindhoven',
    contactName: 'Jan de Vries',
    contactPhone: '040 765 4321',
    contactEmail: 'info@vveindhovennoord.nl',
    ...overrides,
  };
}

function registerBody(
  clubOverrides: Record<string, unknown> = {},
  representativeOverrides: Record<string, unknown> = {},
) {
  return {
    club: clubBody(clubOverrides),
    representative: {
      name: 'Jan de Vries',
      email: 'jan@vveindhovennoord.nl',
      password: 'een-goed-wachtwoord',
      ...representativeOverrides,
    },
  };
}

async function registerClub(
  clubOverrides: Record<string, unknown> = {},
  representativeOverrides: Record<string, unknown> = {},
) {
  const res = await request(app)
    .post('/api/clubs')
    .send(registerBody(clubOverrides, representativeOverrides));
  expect(res.status).toBe(201);
  return {
    ...res.body,
    token: createRepresentativeToken(res.body.representative.id),
  } as { club: { id: number; name: string }; representative: { id: number }; token: string };
}

beforeEach(async () => {
  // Start every test with empty tables. Children first, because of the foreign keys.
  await prisma.costItem.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.clubRepresentative.deleteMany();
  await prisma.sportsClub.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/clubs', () => {
  it('saves the club as PENDING together with its first representative', async () => {
    const res = await request(app).post('/api/clubs').send(registerBody());

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      club: { id: expect.any(Number), ...clubBody(), approvalStatus: 'PENDING' },
      representative: {
        id: expect.any(Number),
        name: 'Jan de Vries',
        email: 'jan@vveindhovennoord.nl',
      },
    });
    const representative = await prisma.clubRepresentative.findUniqueOrThrow({
      where: { id: res.body.representative.id },
    });
    expect(representative.clubId).toBe(res.body.club.id);
  });

  it('stores a hash, never the password itself, and never returns it', async () => {
    const res = await request(app).post('/api/clubs').send(registerBody());

    const { passwordHash } = await prisma.clubRepresentative.findUniqueOrThrow({
      where: { id: res.body.representative.id },
    });
    // The same format as the parent accounts (see password.service.ts), with any scrypt settings.
    expect(passwordHash).toMatch(/^scrypt\$\d+\$\d+\$\d+\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(await verifyPassword('een-goed-wachtwoord', passwordHash)).toBe(true);
    expect(JSON.stringify(res.body)).not.toContain(passwordHash);
  });

  it('ignores an approvalStatus in the body: a club cannot approve itself', async () => {
    const { club } = await registerClub({ approvalStatus: 'APPROVED' });

    expect(
      (await prisma.sportsClub.findUniqueOrThrow({ where: { id: club.id } })).approvalStatus,
    ).toBe('PENDING');
  });

  it('allows a club without description or contact details: they are saved as null', async () => {
    const res = await request(app)
      .post('/api/clubs')
      .send({
        ...registerBody(),
        club: { name: 'Stille Club', address: 'Sportlaan 1, Eindhoven' },
      });

    expect(res.status).toBe(201);
    expect(res.body.club).toMatchObject({
      description: null,
      contactName: null,
      contactPhone: null,
      contactEmail: null,
    });
  });

  it('saves empty or blank optional fields as null, not as empty text', async () => {
    const res = await request(app)
      .post('/api/clubs')
      .send(
        registerBody({ description: '', contactName: '   ', contactPhone: null, contactEmail: '' }),
      );

    expect(res.status).toBe(201);
    const club = await prisma.sportsClub.findUniqueOrThrow({ where: { id: res.body.club.id } });
    expect(club).toMatchObject({
      description: null,
      contactName: null,
      contactPhone: null,
      contactEmail: null,
    });
  });

  it('lowercases the emails', async () => {
    const res = await request(app)
      .post('/api/clubs')
      .send(registerBody({ contactEmail: 'Info@Club.NL' }, { email: ' Jan@Club.NL ' }));

    expect(res.body.club.contactEmail).toBe('info@club.nl');
    expect(res.body.representative.email).toBe('jan@club.nl');
  });

  it('returns 409 when the representative email is taken, and saves no second club', async () => {
    await registerClub();

    const res = await request(app)
      .post('/api/clubs')
      .send(registerBody({ name: 'Andere club' }, { email: 'JAN@vveindhovennoord.nl' }));

    expect(res.status).toBe(409);
    expect(await prisma.sportsClub.count()).toBe(1);
  });

  it.each([
    ['a too short club name', { club: clubBody({ name: 'A' }) }, 'club.name'],
    [
      'an invalid contact email',
      { club: clubBody({ contactEmail: 'geen-email' }) },
      'club.contactEmail',
    ],
    [
      'an invalid phone number',
      { club: clubBody({ contactPhone: 'bel me' }) },
      'club.contactPhone',
    ],
    ['a too short description', { club: clubBody({ description: 'kort' }) }, 'club.description'],
    [
      'a too short password',
      { representative: { name: 'Jan', email: 'j@c.nl', password: 'kort' } },
      'representative.password',
    ],
    [
      'a password of only spaces',
      { representative: { name: 'Jan', email: 'j@c.nl', password: ' '.repeat(8) } },
      'representative.password',
    ],
    ['a missing representative', { representative: undefined }, 'representative'],
  ])('returns 400 for %s', async (_case, overrides, field) => {
    const res = await request(app)
      .post('/api/clubs')
      .send({ ...registerBody(), ...overrides });

    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d: { field: string }) => d.field)).toContain(field);
    expect(await prisma.sportsClub.count()).toBe(0);
  });
});

describe('GET /api/clubs', () => {
  it('lists the clubs with pagination and without representatives', async () => {
    for (const [i, name] of ['Een', 'Twee', 'Drie'].entries()) {
      await registerClub({ name }, { email: `rep${i}@club.nl` });
    }

    const res = await request(app).get('/api/clubs?page=2&pageSize=2');

    expect(res.status).toBe(200);
    expect(res.body.data.map((c: { name: string }) => c.name)).toEqual(['Drie']);
    expect(res.body.data[0]).not.toHaveProperty('representatives');
    expect(res.body.pagination).toEqual({ page: 2, pageSize: 2, total: 3, totalPages: 2 });
  });
});

describe('GET /api/clubs/:id', () => {
  it('returns the club', async () => {
    const { club } = await registerClub();

    const res = await request(app).get(`/api/clubs/${club.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(club);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app).get('/api/clubs/999999');

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/clubs/:id', () => {
  it('lets a representative replace the details of their own club', async () => {
    const { club, token } = await registerClub();

    const res = await request(app)
      .put(`/api/clubs/${club.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send(clubBody({ name: 'Nieuwe naam', approvalStatus: 'APPROVED' }));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: club.id,
      ...clubBody({ name: 'Nieuwe naam' }),
      approvalStatus: 'PENDING',
    });
  });

  it('clears optional fields that are left out, because PUT replaces all details', async () => {
    const { club, token } = await registerClub();

    const res = await request(app)
      .put(`/api/clubs/${club.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'VV Eindhoven Noord', address: 'Sportlaan 10, 5612 AB Eindhoven' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ contactName: null, contactPhone: null, contactEmail: null });
  });

  it('returns 403 for another club and changes nothing', async () => {
    const { club } = await registerClub();
    const other = await registerClub({ name: 'Andere club' }, { email: 'andere@club.nl' });

    const res = await request(app)
      .put(`/api/clubs/${club.id}`)
      .set('Authorization', `Bearer ${other.token}`)
      .send(clubBody({ name: 'Overgenomen' }));

    expect(res.status).toBe(403);
    expect((await request(app).get(`/api/clubs/${club.id}`)).body.name).toBe(club.name);
  });

  it('returns 404 for an unknown club', async () => {
    const { token } = await registerClub();

    const res = await request(app)
      .put('/api/clubs/999999')
      .set('Authorization', `Bearer ${token}`)
      .send(clubBody());

    expect(res.status).toBe(404);
  });

  it('returns 401 without a token', async () => {
    const { club } = await registerClub();

    const res = await request(app).put(`/api/clubs/${club.id}`).send(clubBody());

    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid details', async () => {
    const { club, token } = await registerClub();

    const res = await request(app)
      .put(`/api/clubs/${club.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send(clubBody({ contactPhone: 'x' }));

    expect(res.status).toBe(400);
  });
});

describe('database constraints', () => {
  // Written with Prisma directly, to skip the validator.
  it.each([
    ['a blank name', { name: '   ' }],
    ['a blank address', { address: '' }],
    ['a blank description', { description: ' ' }],
    ['a blank contact name', { contactName: '' }],
    ['a blank contact phone', { contactPhone: '  ' }],
    ['a blank contact email', { contactEmail: '' }],
  ])('rejects %s', async (_case, overrides) => {
    await expect(
      prisma.sportsClub.create({ data: { ...clubBody(), ...overrides } }),
    ).rejects.toThrow();
    expect(await prisma.sportsClub.count()).toBe(0);
  });

  it('accepts null for the optional fields', async () => {
    await prisma.sportsClub.create({
      data: {
        ...clubBody(),
        description: null,
        contactName: null,
        contactPhone: null,
        contactEmail: null,
      },
    });

    expect(await prisma.sportsClub.count()).toBe(1);
  });
});
