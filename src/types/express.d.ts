import type { AuthenticatedRepresentative } from './auth.types';

// Tells TypeScript that `req.clubRepresentative` exists. It is set by requireClubRepresentative.
declare global {
  namespace Express {
    interface Request {
      clubRepresentative?: AuthenticatedRepresentative;
    }
  }
}
