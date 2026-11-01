import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../errors/AppError';

// Express recognises error handlers by their four parameters, so `next` must stay.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: { message: err.message } });
    return;
  }

  // Unexpected errors are logged here but never sent to the client, as they can expose internals.
  console.error(err);
  res.status(500).json({ error: { message: 'Internal server error' } });
}
