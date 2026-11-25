import { Router } from 'express';

import * as savedActivitiesController from '../controllers/savedActivities.controller';

// EN: mergeParams: makes `:parentId` and `:childId` from routes/index.ts available here as well.
// PUT instead of POST: saving the same activity twice gives the same result (one entry).
// NL: mergeParams: maakt `:parentId` en `:childId` uit routes/index.ts hier ook beschikbaar.
// PUT in plaats van POST: dezelfde activiteit twee keer opslaan geeft hetzelfde resultaat (één rij).
export const savedActivityRoutes = Router({ mergeParams: true });

savedActivityRoutes.get('/', savedActivitiesController.listSavedActivities);
savedActivityRoutes.put('/:activityId', savedActivitiesController.saveActivity);
savedActivityRoutes.delete('/:activityId', savedActivitiesController.removeSavedActivity);
