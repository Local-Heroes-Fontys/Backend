import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { app } from '../src/app';
import { prisma } from '../src/db/prisma';
import { createParent } from '../src/repositories/parents.repository';
import { verifyPassword } from '../src/services/password.service';

// Tests for parent registration (POST /api/parents):
// - a new parent gets 201, the password is never returned and is stored hashed
// - the same email again (also with other capitals, or at the same moment) gets 409
// - an invalid email, a too short password or a password of only spaces gets 400
//
// Uses the real test database (local_heroes_test), because the unique email is enforced there.
// The parents table is emptied before each test.

beforeEach(async () => {
  await prisma.parent.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/parents', () => {
  it('creates a parent and never returns the password', async () => {
    const res = await request(app)
      .post('/api/parents')
      .send({ email: '  Ouder@Example.com ', password: 'geheim123' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: expect.any(Number), email: 'ouder@example.com' });

    const saved = await prisma.parent.findUniqueOrThrow({ where: { id: res.body.id } });
    // Any scrypt settings, so the test keeps passing when they are raised later.
    expect(saved.passwordHash).toMatch(/^scrypt\$\d+\$\d+\$\d+\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(await verifyPassword('geheim123', saved.passwordHash)).toBe(true);
  });

  it('rejects a duplicate email with 409, also with different casing', async () => {
    await request(app)
      .post('/api/parents')
      .send({ email: 'ouder@example.com', password: 'geheim123' });

    const res = await request(app)
      .post('/api/parents')
      .send({ email: 'OUDER@example.com', password: 'anderwachtwoord' });

    expect(res.status).toBe(409);
    expect(await prisma.parent.count()).toBe(1);
  });

  it('gives one 201 and one 409 for simultaneous requests with the same email', async () => {
    const body = { email: 'ouder@example.com', password: 'geheim123' };
    const responses = await Promise.all([
      request(app).post('/api/parents').send(body),
      request(app).post('/api/parents').send(body),
    ]);

    expect(responses.map((res) => res.status).sort()).toEqual([201, 409]);
  });

  it('rejects an invalid email and a short password with 400', async () => {
    const res = await request(app)
      .post('/api/parents')
      .send({ email: 'geen-email', password: '123' });

    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['email', 'password']));
  });

  it('rejects a password of only spaces with 400', async () => {
    const res = await request(app)
      .post('/api/parents')
      .send({ email: 'ouder@example.com', password: ' '.repeat(8) });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([
      { field: 'password', message: 'Password cannot be only spaces' },
    ]);
  });

  // The 128 limit keeps the server from hashing huge inputs, so test both sides of it.
  it('accepts a password of 128 characters and rejects 129 with 400', async () => {
    const accepted = await request(app)
      .post('/api/parents')
      .send({ email: 'ouder@example.com', password: 'a'.repeat(128) });
    expect(accepted.status).toBe(201);

    const rejected = await request(app)
      .post('/api/parents')
      .send({ email: 'ander@example.com', password: 'a'.repeat(129) });
    expect(rejected.status).toBe(400);
    expect(rejected.body.error.details.map((d: { field: string }) => d.field)).toEqual([
      'password',
    ]);
  });

  // 254 is the longest valid email address, and the size of the database column.
  it('accepts an email of 254 characters and rejects 255 with 400', async () => {
    const domain = '@example.com';
    const accepted = await request(app)
      .post('/api/parents')
      .send({ email: 'a'.repeat(254 - domain.length) + domain, password: 'geheim123' });
    expect(accepted.status).toBe(201);
    expect(accepted.body.email).toHaveLength(254);

    const rejected = await request(app)
      .post('/api/parents')
      .send({ email: 'b'.repeat(255 - domain.length) + domain, password: 'geheim123' });
    expect(rejected.status).toBe(400);
    expect(rejected.body.error.details.map((d: { field: string }) => d.field)).toEqual(['email']);
  });

  it('rejects a body without email and password with 400', async () => {
    const res = await request(app).post('/api/parents').send({});

    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['email', 'password']));
    expect(await prisma.parent.count()).toBe(0);
  });
});

describe('createParent', () => {
  it('returns null for a duplicate email', async () => {
    const data = { email: 'ouder@example.com', passwordHash: 'not-used-here' };

    expect(await createParent(data)).not.toBeNull();
    expect(await createParent(data)).toBeNull();
  });
});
