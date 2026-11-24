import type { Request, Response } from 'express';

import * as parentsService from '../services/parents.service';
import { registerParentSchema } from '../validators/parents.validator';

export async function registerParent(req: Request, res: Response) {
  const input = registerParentSchema.parse(req.body);
  res.status(201).json(await parentsService.registerParent(input));
}
