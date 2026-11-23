import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import { AppError } from '../errors/AppError';

const ROLE_CLUB_REPRESENTATIVE = 'club_representative';

// The token only says WHO the user is. Which club they belong to is always read from the
// database, so a changed membership takes effect immediately and can't be faked in the token.

/** Used by the (future) login endpoint and by `npm run token:dev`. */
export function createRepresentativeToken(representativeId: number): string {
  return jwt.sign({ role: ROLE_CLUB_REPRESENTATIVE }, env.JWT_SECRET, {
    subject: String(representativeId),
    expiresIn: '8h',
    algorithm: 'HS256',
  });
}

/** Returns the representative id from a valid token, or throws a 401. */
export function verifyRepresentativeToken(token: string): number {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof payload === 'object' && payload.role === ROLE_CLUB_REPRESENTATIVE && payload.sub) {
      return Number(payload.sub);
    }
  } catch {
    // Expired, tampered with or signed with another secret: all handled the same way below.
  }
  throw new AppError(401, 'Invalid or expired token');
}
