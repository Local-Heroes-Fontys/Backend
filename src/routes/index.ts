import { Router } from 'express';

import { activityRoutes } from './activities.routes';
import { clubRoutes } from './clubs.routes';
import { childRoutes } from './children.routes';
import { healthRoutes } from './health.routes';
import { parentRoutes } from './parents.routes';
import { savedActivityRoutes } from './savedActivities.routes';
import { sportRoutes } from './sports.routes';

export const apiRoutes = Router();

apiRoutes.use('/health', healthRoutes);
apiRoutes.use('/sports', sportRoutes);
apiRoutes.use('/clubs', clubRoutes);
apiRoutes.use('/activities', activityRoutes);
apiRoutes.use('/parents', parentRoutes);
apiRoutes.use('/parents/:parentId/children/:childId/saved-activities', savedActivityRoutes);
apiRoutes.use('/parents/:parentId/children', childRoutes);
