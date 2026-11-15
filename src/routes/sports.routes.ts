import { Router } from 'express';

import * as sportsController from '../controllers/sports.controller';

export const sportRoutes = Router();

sportRoutes.get('/', sportsController.listSports);
