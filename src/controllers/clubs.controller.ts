import type { Request, Response } from 'express';

import { getClubRepresentative } from '../middleware/requireClubRepresentative';
import * as clubsService from '../services/clubs.service';
import {
  clubBodySchema,
  clubIdParamsSchema,
  listClubsQuerySchema,
  registerClubBodySchema,
} from '../validators/clubs.validator';

// Each handler: validate the input with `.parse()`, call the service, send the result.

export async function registerClub(req: Request, res: Response) {
  const input = registerClubBodySchema.parse(req.body);
  res.status(201).json(await clubsService.registerClub(input));
}

export async function listClubs(req: Request, res: Response) {
  const query = listClubsQuerySchema.parse(req.query);
  res.json(await clubsService.listClubs(query));
}

export async function getClub(req: Request, res: Response) {
  const { id } = clubIdParamsSchema.parse(req.params);
  res.json(await clubsService.getClub(id));
}

export async function updateClub(req: Request, res: Response) {
  const { id } = clubIdParamsSchema.parse(req.params);
  const input = clubBodySchema.parse(req.body);
  res.json(await clubsService.updateClub(id, input, getClubRepresentative(req)));
}
