import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { app } from '../src/app';
import { prisma } from '../src/db/prisma';


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
    expect(saved.passwordHash).not.toContain('geheim123');
    expect(saved.passwordHash).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
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

  it('rejects an invalid email and a short password with 400', async () => {
    const res = await request(app)
      .post('/api/parents')
      .send({ email: 'geen-email', password: '123' });

    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['email', 'password']));
  });
});
