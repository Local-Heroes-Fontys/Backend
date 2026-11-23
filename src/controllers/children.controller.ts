import type { Request, Response } from 'express';

import * as childrenService from '../services/children.service';
import {
  childBodySchema,
  childIdParamsSchema,
  parentIdParamsSchema,
} from '../validators/children.validator';

// Each handler: check the input with `.parse()` (invalid input throws an error that errorHandler
// turns into a 400), call the service and send back the result.

export async function listChildren(req: Request, res: Response) {
  const { parentId } = parentIdParamsSchema.parse(req.params);
  res.json({ data: await childrenService.listChildren(parentId) });
}

export async function getChild(req: Request, res: Response) {
  const { parentId, id } = childIdParamsSchema.parse(req.params);
  res.json(await childrenService.getChild(parentId, id));
}

export async function createChild(req: Request, res: Response) {
  const { parentId } = parentIdParamsSchema.parse(req.params);
  const input = childBodySchema.parse(req.body);
  res.status(201).json(await childrenService.createChild(input, parentId));
}

export async function updateChild(req: Request, res: Response) {
  const { parentId, id } = childIdParamsSchema.parse(req.params);
  const input = childBodySchema.parse(req.body);
  res.json(await childrenService.updateChild(parentId, id, input));
}

export async function deleteChild(req: Request, res: Response) {
  const { parentId, id } = childIdParamsSchema.parse(req.params);
  await childrenService.deleteChild(parentId, id);
  res.status(204).end();
}
