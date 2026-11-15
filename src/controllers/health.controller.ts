import type { Request, Response } from 'express';

import * as healthService from '../services/health.service';

export async function getHealth(_req: Request, res: Response) {
  const databaseUp = await healthService.isDatabaseUp();

  res.status(databaseUp ? 200 : 503).json({
    status: databaseUp ? 'ok' : 'degraded',
    database: databaseUp ? 'up' : 'down',
  });
}
