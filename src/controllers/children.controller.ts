import type { Request, Response } from 'express';

import { getParent } from '../middleware/requireParent';
import * as childrenService from '../services/children.service';
import { childBodySchema } from '../validators/children.validator';

export async function createChild(req: Request, res: Response) {
  const input = childBodySchema.parse(req.body);
  res.status(201).json(await childrenService.createChild(input, getParent(req)));
}
