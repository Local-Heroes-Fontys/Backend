import type { NextFunction, Request } from 'express';

import { AppError } from '../errors/AppError';
import * as parentsRepository from '../repositories/parents.repository';
import * as authService from '../services/auth.service';
import type { AuthenticatedParent } from '../types/auth.types';

/**
 * Put this before any route that only parents may use. It expects the header
 * `Authorization: Bearer <token>` and stores the parent on `req.parent`.
 */
export async function requireParent(req: Request, _res: unknown, next: NextFunction) {
  const [scheme, token] = req.headers.authorization?.split(' ') ?? [];
  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'Log in as a parent to do this');
  }

  const parent = await parentsRepository.findParentById(authService.verifyParentToken(token));
  if (!parent) {
    throw new AppError(401, 'Invalid or expired token');
  }

  // Only the id, so the password hash is not passed around with the request.
  req.parent = { id: parent.id };
  next();
}

/** Use in controllers behind requireParent to get the logged-in parent. */
export function getParent(req: Request): AuthenticatedParent {
  if (!req.parent) {
    throw new AppError(401, 'Log in as a parent to do this');
  }
  return req.parent;
}
