import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import { promisify } from 'node:util';

// The one place where passwords are hashed and checked, for every account type (parents and club
// representatives), so all passwords are stored the same way. Uses Node's built-in scrypt, so no
// extra dependency is needed.

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
