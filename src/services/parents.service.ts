import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import { promisify } from 'node:util';

import { AppError } from '../errors/AppError';
import * as parentsRepository from '../repositories/parents.repository';
import type { ParentResponse } from '../types/parents.types';
import type { RegisterParentInput } from '../validators/parents.validator';

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions,
) => Promise<Buffer>;

// The settings for new hashes. Each hash stores its own settings, so these can be raised later
// without breaking existing accounts.
const SCRYPT = { N: 16384, r: 8, p: 1 };
const SALT_BYTES = 16;
const KEY_BYTES = 64;

// The exact lengths matter: an empty or cut-off hash must never match a password.
const STORED_HASH = /^scrypt\$(\d+)\$(\d+)\$(\d+)\$([0-9a-f]{32})\$([0-9a-f]{128})$/;

function deriveKey(password: string, salt: Buffer, N: number, r: number, p: number) {
  // scrypt needs about 128 * N * r bytes. Node's default limit (32 MB) rejects N = 32768 and up.
  return scryptAsync(password, salt, KEY_BYTES, { N, r, p, maxmem: 256 * N * r });
}

/** Hashes with scrypt and a random salt. Stored as "scrypt$N$r$p$salt$hash" (last two in hex). */
export async function hashPassword(password: string): Promise<string> {
  const { N, r, p } = SCRYPT;
  const salt = randomBytes(SALT_BYTES);
  const hash = await deriveKey(password, salt, N, r, p);
  return ['scrypt', N, r, p, salt.toString('hex'), hash.toString('hex')].join('$');
}

/** Checks a password with the settings stored in the hash. False if the format is not valid. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const match = STORED_HASH.exec(stored);
  if (!match) return false;

  const [, N, r, p, salt, hash] = match;
  let actual: Buffer;
  try {
    actual = await deriveKey(password, Buffer.from(salt!, 'hex'), Number(N), Number(r), Number(p));
  } catch {
    // scrypt rejects settings it cannot use, such as an N that is not a power of 2.
    return false;
  }
  return timingSafeEqual(actual, Buffer.from(hash!, 'hex'));
}

export async function registerParent(input: RegisterParentInput): Promise<ParentResponse> {
  if (await parentsRepository.findParentByEmail(input.email)) {
    throw new AppError(409, 'An account with this email already exists');
  }

  const parent = await parentsRepository.createParent({
    email: input.email,
    passwordHash: await hashPassword(input.password),
  });
  // Still possible after the check above, when two requests use the same email at the same time.
  if (!parent) throw new AppError(409, 'An account with this email already exists');

  return { id: parent.id, email: parent.email };
}
