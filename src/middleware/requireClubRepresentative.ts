import type { NextFunction, Request } from 'express';

import { AppError } from '../errors/AppError';
import * as clubRepresentativesRepository from '../repositories/clubRepresentatives.repository';
import * as authService from '../services/auth.service';
import type { AuthenticatedRepresentative } from '../types/auth.types';

/**
 * Put this before any route that only club representatives may use. It expects the header
 * `Authorization: Bearer <token>` and stores the representative on `req.clubRepresentative`.
 */
export async function requireClubRepresentative(req: Request, _res: unknown, next: NextFunction) {
  const [scheme, token] = req.headers.authorization?.split(' ') ?? [];
  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'Log in as a club representative to do this');
  }

  const representative = await clubRepresentativesRepository.findRepresentativeById(
    authService.verifyRepresentativeToken(token),
  );
  if (!representative) {
    throw new AppError(401, 'Invalid or expired token');
  }

  req.clubRepresentative = { id: representative.id, clubId: representative.clubId };
  next();
}

/** Use in controllers behind requireClubRepresentative to get the logged-in representative. */
export function getClubRepresentative(req: Request): AuthenticatedRepresentative {
  if (!req.clubRepresentative) {
    throw new AppError(401, 'Log in as a club representative to do this');
  }
  return req.clubRepresentative;
}
