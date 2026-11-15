import type { Request, Response } from 'express';

import { getClubRepresentative } from '../middleware/requireClubRepresentative';
import * as activitiesService from '../services/activities.service';
import {
  activityBodySchema,
  activityIdParamsSchema,
  listActivitiesQuerySchema,
} from '../validators/activities.validator';

// Each handler: validate the input with `.parse()` (invalid input throws and becomes a 400 in
// errorHandler), call the service, send the result. No business rules or database code here.

export async function listActivities(req: Request, res: Response) {
  const query = listActivitiesQuerySchema.parse(req.query);
  res.json(await activitiesService.listActivities(query));
}

export async function getActivity(req: Request, res: Response) {
  const { id } = activityIdParamsSchema.parse(req.params);
  res.json(await activitiesService.getActivity(id));
}

export async function createActivity(req: Request, res: Response) {
  const input = activityBodySchema.parse(req.body);
  const activity = await activitiesService.createActivity(input, getClubRepresentative(req));
  res.status(201).json(activity);
}

export async function updateActivity(req: Request, res: Response) {
  const { id } = activityIdParamsSchema.parse(req.params);
  const input = activityBodySchema.parse(req.body);
  res.json(await activitiesService.updateActivity(id, input, getClubRepresentative(req)));
}

export async function deleteActivity(req: Request, res: Response) {
  const { id } = activityIdParamsSchema.parse(req.params);
  await activitiesService.deleteActivity(id, getClubRepresentative(req));
  res.status(204).end();
}
