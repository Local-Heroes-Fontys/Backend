import type { Request, Response } from 'express';

import * as sportsService from '../services/sports.service';

export async function listSports(_req: Request, res: Response) {
  res.json({ data: await sportsService.listSports() });
}
