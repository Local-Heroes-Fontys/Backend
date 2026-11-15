import { Router } from 'express';

import { activityRoutes } from './activities.routes';
import { healthRoutes } from './health.routes';
import { sportRoutes } from './sports.routes';

export const apiRoutes = Router();

apiRoutes.use('/health', healthRoutes);
apiRoutes.use('/sports', sportRoutes);
apiRoutes.use('/activities', activityRoutes);
