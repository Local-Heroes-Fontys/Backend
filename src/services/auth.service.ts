import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import { AppError } from '../errors/AppError';

const ROLE_CLUB_REPRESENTATIVE = 'club_representative';
const ROLE_PARENT = 'parent';

// The token only says WHO the user is. Which club they belong to is always read from the
// database, so a changed membership takes effect immediately and can't be faked in the token.
// The role matters: parent 1 and representative 1 are different people.

/** Used by the (future) login endpoint and by `npm run token:dev`. */
export function createRepresentativeToken(representativeId: number): string {
  return createToken(representativeId, ROLE_CLUB_REPRESENTATIVE);
}

/** Returns the representative id from a valid token, or throws a 401. */
export function verifyRepresentativeToken(token: string): number {
  return verifyToken(token, ROLE_CLUB_REPRESENTATIVE);
}

/** For the (future) parent login endpoint, to call after checking the password. */
export function createParentToken(parentId: number): string {
  return createToken(parentId, ROLE_PARENT);
}

/** Returns the parent id from a valid token, or throws a 401. */
export function verifyParentToken(token: string): number {
  return verifyToken(token, ROLE_PARENT);
}

function createToken(id: number, role: string): string {
  return jwt.sign({ role }, env.JWT_SECRET, {
    subject: String(id),
    expiresIn: '8h',
    algorithm: 'HS256',
  });
}

function verifyToken(token: string, role: string): number {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof payload === 'object' && payload.role === role && payload.sub) {
      return Number(payload.sub);
    }
  } catch {
    // Expired, tampered with or signed with another secret: all handled the same way below.
  }
  throw new AppError(401, 'Invalid or expired token');
}
