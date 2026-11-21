import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';

import { AppError } from '../errors/AppError';
import { Prisma } from '../generated/prisma/client';
import * as parentsRepository from '../repositories/parents.repository';
import type { ParentResponse } from '../types/parents.types';
import type { RegisterParentInput } from '../validators/parents.validator';

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: string,
  keyLength: number,
) => Promise<Buffer>;

/** Hashes with Node's built-in scrypt and a random salt. Stored as "salt:hash" (both hex). */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = await scryptAsync(password, salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}

export async function registerParent(input: RegisterParentInput): Promise<ParentResponse> {
  if (await parentsRepository.findParentByEmail(input.email)) {
    throw new AppError(409, 'An account with this email already exists');
  }

  try {
    const parent = await parentsRepository.createParent({
      email: input.email,
      passwordHash: await hashPassword(input.password),
    });
    return { id: parent.id, email: parent.email };
  } catch (error) {
    // Two requests with the same email at the same time both pass the check above; the unique
    // index then rejects the second one.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(409, 'An account with this email already exists');
    }
    throw error;
  }
}
