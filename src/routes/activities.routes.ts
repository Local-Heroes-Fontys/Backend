import { Router } from 'express';

import * as activitiesController from '../controllers/activities.controller';
import { requireClubRepresentative } from '../middleware/requireClubRepresentative';

export const activityRoutes = Router();

// Reading is public, so parents can browse without an account.
activityRoutes.get('/', activitiesController.listActivities);
activityRoutes.get('/:id', activitiesController.getActivity);

// Writing requires a logged-in club representative. Ownership is checked in the service.
activityRoutes.post('/', requireClubRepresentative, activitiesController.createActivity);
activityRoutes.put('/:id', requireClubRepresentative, activitiesController.updateActivity);
activityRoutes.delete('/:id', requireClubRepresentative, activitiesController.deleteActivity);
