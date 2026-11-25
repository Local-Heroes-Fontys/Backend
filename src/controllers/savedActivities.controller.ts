import type { Request, Response } from 'express';

import * as savedActivitiesService from '../services/savedActivities.service';
import {
  childParamsSchema,
  savedActivityParamsSchema,
} from '../validators/savedActivities.validator';

// EN: Each handler: check the URL with `.parse()` (invalid input becomes a 400 in errorHandler),
// call the service and send back the result.
// NL: Elke handler: controleer de URL met `.parse()` (foute invoer wordt een 400 in errorHandler),
// roep de service aan en stuur het resultaat terug.

export async function listSavedActivities(req: Request, res: Response) {
  const { parentId, childId } = childParamsSchema.parse(req.params);
  res.json({ data: await savedActivitiesService.listSavedActivities(parentId, childId) });
}

export async function saveActivity(req: Request, res: Response) {
  const { parentId, childId, activityId } = savedActivityParamsSchema.parse(req.params);
  res.json(await savedActivitiesService.saveActivity(parentId, childId, activityId));
}

export async function removeSavedActivity(req: Request, res: Response) {
  const { parentId, childId, activityId } = savedActivityParamsSchema.parse(req.params);
  await savedActivitiesService.removeSavedActivity(parentId, childId, activityId);
  res.status(204).end();
}
