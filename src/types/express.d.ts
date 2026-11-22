import type { AuthenticatedParent, AuthenticatedRepresentative } from './auth.types';

// Tells TypeScript that these exist on `req`. They are set by requireClubRepresentative and
// requireParent.
declare global {
  namespace Express {
    interface Request {
      clubRepresentative?: AuthenticatedRepresentative;
      parent?: AuthenticatedParent;
    }
  }
}
