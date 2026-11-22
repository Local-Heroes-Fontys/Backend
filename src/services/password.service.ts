import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';

// Shared by every account type, so all passwords are stored the same way. Uses Node's built-in
// scrypt (no extra dependency), in the same "salt:hash" format as the parent accounts.

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: string,
  keyLength: number,
) => Promise<Buffer>;

/** Hashes with scrypt and a random salt. Stored as "salt:hash" (both hex). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = await scryptAsync(password, salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}
