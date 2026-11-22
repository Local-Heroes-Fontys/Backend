import { Router } from 'express';

import { activityRoutes } from './activities.routes';
import { clubRoutes } from './clubs.routes';
import { healthRoutes } from './health.routes';
import { sportRoutes } from './sports.routes';

export const apiRoutes = Router();

apiRoutes.use('/health', healthRoutes);
apiRoutes.use('/sports', sportRoutes);
apiRoutes.use('/clubs', clubRoutes);
apiRoutes.use('/activities', activityRoutes);
