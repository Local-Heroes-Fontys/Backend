import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { AppError } from '../errors/AppError';

// Express recognises error handlers by their four parameters, so `next` must stay.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: { message: err.message } });
    return;
  }

  // Thrown by `schema.parse(...)` in controllers. Lists every invalid field, so the frontend can
  // show the message next to the right input.
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        message: 'Validation failed',
        details: err.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
    return;
  }

  // Thrown by express.json() when the request body is not valid JSON.
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: { message: 'Request body is not valid JSON' } });
    return;
  }

  // Unexpected errors are logged here but never sent to the client, as they can expose internals.
  console.error(err);
  res.status(500).json({ error: { message: 'Internal server error' } });
}
